import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { robiApi } from "@/server/robi/api";
import {
  dispatchBdappsSmsNotification,
  executeBdappsCaasCharge,
  TOKEN_SHOP_PACKAGES,
} from "@/server/robi/bdappsIntegration";
import {
  fsCreatePendingPurchase,
  fsGetOrInitWallet,
  fsSettlePurchaseTransaction,
  type FirestoreAdapterOptions,
} from "@/server/robi/firestoreWalletStore";
import {
  callPhpGateway,
  signPhpGatewayHeaders,
  verifyPhpCallbackSignature,
} from "@/server/robi/phpGatewayClient";
import { getLiveChargingGateStatus, getPersistenceBackend } from "@/server/robi/walletPersistence";

/**
 * In-memory simulator of Google Firestore v1 REST API (:beginTransaction, :batchGet, :commit, :rollback)
 * used to verify atomic transactional reads, pending->confirmed->failed state transitions, and idempotency.
 */
function createMockFirestoreRestHarness() {
  const docs = new Map<string, { fields: Record<string, unknown>; updateTime: string }>();
  let txCounter = 0;

  const fetcher: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const rawBody = typeof init?.body === "string" ? init.body : "{}";
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    if (url.endsWith(":beginTransaction")) {
      txCounter += 1;
      return new Response(JSON.stringify({ transaction: `tx-${txCounter}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":batchGet")) {
      const requested = Array.isArray(body.documents) ? (body.documents as string[]) : [];
      const results = requested.map((name) => {
        const doc = docs.get(name);
        if (!doc) {
          return { missing: name };
        }
        return {
          found: {
            name,
            fields: doc.fields,
            updateTime: doc.updateTime,
          },
        };
      });
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":commit")) {
      const writes = Array.isArray(body.writes)
        ? (body.writes as Array<{
            update?: { name: string; fields: Record<string, unknown> };
            delete?: string;
            currentDocument?: { exists?: boolean; updateTime?: string };
          }>)
        : [];

      // Validate preconditions before mutating state
      for (const w of writes) {
        const name = w.update?.name || w.delete || "";
        const existing = docs.get(name);
        if (w.currentDocument?.exists === false && existing) {
          return new Response(JSON.stringify({ error: { message: "ALREADY_EXISTS" } }), {
            status: 409,
          });
        }
        if (
          w.currentDocument?.updateTime &&
          (!existing || existing.updateTime !== w.currentDocument.updateTime)
        ) {
          return new Response(JSON.stringify({ error: { message: "ABORTED_CONFLICT" } }), {
            status: 409,
          });
        }
      }

      const nowIso = new Date().toISOString();
      for (const w of writes) {
        if (w.update) {
          docs.set(w.update.name, { fields: w.update.fields, updateTime: nowIso });
        } else if (w.delete) {
          docs.delete(w.delete);
        }
      }

      return new Response(JSON.stringify({ commitTime: nowIso }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":rollback")) {
      return new Response("{}", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  };

  const options: FirestoreAdapterOptions = {
    fetcher,
    accessTokenProvider: async () => "mock-oauth-token",
  };

  return { docs, options };
}

describe("PHP Gateway Auth, bdapps Safety Locks & Atomic Firestore Persistence", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.BDAPPS_MODE;
    delete process.env.BDAPPS_PHP_BASE_URL;
    delete process.env.PHP_GATEWAY_SHARED_SECRET;
    delete process.env.NODE_CALLBACK_SHARED_SECRET;
    delete process.env.BDAPPS_LIVE_CHARGING_ENABLED;
    delete process.env.BDAPPS_SUBSCRIPTION_ENABLED;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIRESTORE_USE_METADATA_ADC;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("generates and verifies HMAC-SHA256 Node<->PHP signatures with replay protection", () => {
    const secret = "test-shared-secret-64-chars-hex-abcdef0123456789abcdef0123456789";
    process.env.PHP_GATEWAY_SHARED_SECRET = secret;
    process.env.NODE_CALLBACK_SHARED_SECRET = secret;

    const nowSec = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      event: "charging_notification",
      payload: { externalTrxId: "TX1" },
    });
    const headers = signPhpGatewayHeaders(
      secret,
      "POST",
      "/api/internal/bdapps/callback",
      body,
      nowSec,
    );

    expect(
      verifyPhpCallbackSignature(
        headers,
        "POST",
        "/api/internal/bdapps/callback",
        body,
        nowSec * 1000,
      ),
    ).toEqual({ ok: true });

    // Tampered body fails verification
    expect(
      verifyPhpCallbackSignature(
        headers,
        "POST",
        "/api/internal/bdapps/callback",
        '{"tampered":true}',
        nowSec * 1000,
      ).ok,
    ).toBe(false);

    // Expired timestamp (>300s skew) fails verification
    expect(
      verifyPhpCallbackSignature(
        headers,
        "POST",
        "/api/internal/bdapps/callback",
        body,
        (nowSec + 400) * 1000,
      ).ok,
    ).toBe(false);
  });

  it("handles PHP gateway network failures and non-JSON upstream errors safely", async () => {
    process.env.BDAPPS_PHP_BASE_URL = "https://bdappsdigitalapps.com/auw26/test_folder";
    process.env.PHP_GATEWAY_SHARED_SECRET = "test-gateway-secret";

    const failingFetch: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const netFail = await callPhpGateway("sms_send.php", { msisdn: "8801811000001" }, failingFetch);
    expect(netFail.ok).toBe(false);
    expect(netFail.httpStatus).toBe(502);
    expect(netFail.error).toMatch(/Network failure/i);

    const htmlFetch: typeof fetch = async () =>
      new Response("<html>502 Bad Gateway</html>", { status: 502 });
    const badJson = await callPhpGateway("otp_request.php", { msisdn: "8801811000001" }, htmlFetch);
    expect(badJson.ok).toBe(false);
    expect(badJson.httpStatus).toBe(502);
  });

  it("handles SMS gateway errors gracefully without crashing callers", async () => {
    process.env.BDAPPS_MODE = "production";
    process.env.BDAPPS_PHP_BASE_URL = "https://bdappsdigitalapps.com/auw26/test_folder";
    process.env.PHP_GATEWAY_SHARED_SECRET = "test-gateway-secret";

    const declinedFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({ ok: false, statusCode: "E1301", statusDetail: "SMS throttled" }),
        {
          status: 502,
        },
      );

    const smsRes = await dispatchBdappsSmsNotification(
      "8801811000001",
      "88018****001",
      "registration_confirmation",
      {},
      declinedFetch,
    );
    expect(smsRes.mode).toBe("live_bdapps");
    expect(smsRes.deliveredLive).toBe(false);
    expect(smsRes.notice).toMatch(/SMS throttled|did not confirm/i);
  });

  it("keeps live CaaS billing disabled even when BDAPPS_MODE=production unless explicitly unlocked with Firestore persistence", async () => {
    process.env.BDAPPS_MODE = "production";
    process.env.BDAPPS_PHP_BASE_URL = "https://bdappsdigitalapps.com/auw26/test_folder";
    process.env.PHP_GATEWAY_SHARED_SECRET = "test-gateway-secret";
    // Notice BDAPPS_LIVE_CHARGING_ENABLED is NOT set and Firestore credentials are NOT set

    expect(getPersistenceBackend()).toBe("firestore_unconfigured");
    const gate = getLiveChargingGateStatus();
    expect(gate.allowed).toBe(false);

    const chargeRes = await executeBdappsCaasCharge(
      "8801811000001",
      TOKEN_SHOP_PACKAGES[0],
      "trx-blocked-1",
      "success",
      { userConfirmed: true },
    );
    expect(chargeRes.ok).toBe(false);
    expect(chargeRes.blocked).toBe(true);
    expect(chargeRes.txState).toBe("failed");
    expect(chargeRes.statusCode).toBe("LIVE_CHARGING_DISABLED");
  });

  it("enforces pending -> confirmed / failed state transitions and duplicate callback idempotency in Firestore transactions", async () => {
    const harness = createMockFirestoreRestHarness();
    const msisdn = "8801811223344";
    const accountId = "RTU-TEST000001";

    await fsGetOrInitWallet(msisdn, accountId, harness.options);

    // Step 1: Pending purchase does NOT credit tokens
    const pending1 = await fsCreatePendingPurchase(
      msisdn,
      accountId,
      {
        externalTrxId: "CAAS-ORDER-1001",
        packageId: "pkg-6",
        tokens: 6,
        priceBdt: 2,
      },
      harness.options,
    );
    expect(pending1.duplicate).toBe(false);
    expect(pending1.purchase.status).toBe("pending");
    expect(pending1.wallet.balance).toBe(0);

    // Duplicate initiation with same externalTrxId returns duplicate: true and balance stays 0
    const pendingDup = await fsCreatePendingPurchase(
      msisdn,
      accountId,
      {
        externalTrxId: "CAAS-ORDER-1001",
        packageId: "pkg-6",
        tokens: 6,
        priceBdt: 2,
      },
      harness.options,
    );
    expect(pendingDup.duplicate).toBe(true);
    expect(pendingDup.wallet.balance).toBe(0);

    // Step 2: Verified confirmation transitions pending -> confirmed and credits +6 tokens atomically
    const confirmed = await fsSettlePurchaseTransaction(
      "CAAS-ORDER-1001",
      "confirmed",
      { providerStatusCode: "S1000", providerStatusDetail: "Charged successfully" },
      harness.options,
    );
    expect(confirmed.found).toBe(true);
    expect(confirmed.alreadySettled).toBe(false);
    expect(confirmed.purchase?.status).toBe("confirmed");
    expect(confirmed.wallet?.balance).toBe(6);

    // Step 3: Duplicate confirmation callback does NOT credit tokens a second time
    const duplicateConfirm = await fsSettlePurchaseTransaction(
      "CAAS-ORDER-1001",
      "confirmed",
      { providerStatusCode: "S1000" },
      harness.options,
    );
    expect(duplicateConfirm.found).toBe(true);
    expect(duplicateConfirm.alreadySettled).toBe(true);
    expect(duplicateConfirm.wallet?.balance).toBe(6);

    // Step 4: Failed purchase transitions pending -> failed with zero token change
    await fsCreatePendingPurchase(
      msisdn,
      accountId,
      {
        externalTrxId: "CAAS-ORDER-1002",
        packageId: "pkg-15",
        tokens: 15,
        priceBdt: 10,
      },
      harness.options,
    );
    const failed = await fsSettlePurchaseTransaction(
      "CAAS-ORDER-1002",
      "failed",
      { providerStatusCode: "E1004", providerStatusDetail: "Insufficient subscriber balance" },
      harness.options,
    );
    expect(failed.purchase?.status).toBe("failed");
    expect(failed.wallet?.balance).toBe(6);
  });

  it("keeps OTP strictly separate from paid subscriptions and rejects unauthorized internal callbacks", async () => {
    // 1. Subscribe intent on OTP request is strictly rejected
    const badOtpReq = await robiApi.handle(
      new Request("http://localhost/api/bdapps/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01812345678", intent: "subscribe" }),
      }),
    );
    expect(badOtpReq.status).toBe(403);

    // 2. Unauthorized internal callback without HMAC signature is rejected
    process.env.NODE_CALLBACK_SHARED_SECRET = "callback-secret-123";
    const unauthCb = await robiApi.handle(
      new Request("http://localhost/api/internal/bdapps/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "charging_notification", payload: { externalTrxId: "TX9" } }),
      }),
    );
    expect(unauthCb.status).toBe(401);

    // 3. Valid HMAC signature on consent_notification succeeds
    const payloadStr = JSON.stringify({
      event: "consent_notification",
      payload: { requestId: "REQ-001", consentStatus: "CANCELLED" },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto
      .createHmac("sha256", "callback-secret-123")
      .update(`${ts}.POST./api/internal/bdapps/callback.${payloadStr}`)
      .digest("hex");

    const okCb = await robiApi.handle(
      new Request("http://localhost/api/internal/bdapps/callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-robitrail-timestamp": ts,
          "x-robitrail-signature": sig,
        },
        body: payloadStr,
      }),
    );
    expect(okCb.status).toBe(200);
    const okJson = (await okCb.json()) as { ok: boolean; event: string };
    expect(okJson.ok).toBe(true);
    expect(okJson.event).toBe("consent_notification");
  });

  it("keeps preview mode working cleanly without real billing and reports safe health metadata", async () => {
    const healthRes = await robiApi.handle(new Request("http://localhost/api/health"));
    expect(healthRes.status).toBe(200);
    const health = (await healthRes.json()) as {
      ok: boolean;
      bdappsMode: string;
      liveChargingEnabled: boolean;
      subscriptionEnabled: boolean;
      persistenceBackend: string;
    };
    expect(health.ok).toBe(true);
    expect(health.bdappsMode).toBe("preview");
    expect(health.liveChargingEnabled).toBe(false);
    expect(health.subscriptionEnabled).toBe(false);
    expect(health.persistenceBackend).toBe("memory_preview");
  });
});
