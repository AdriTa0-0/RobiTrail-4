import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { robiApi } from "@/server/robi/api";
import {
  executeBdappsSubscriptionPurchase,
  TOKEN_SHOP_PACKAGES,
} from "@/server/robi/bdappsIntegration";
import {
  fsCreatePendingPurchase,
  fsGetOrInitWallet,
  fsSettlePendingSubscriptionPurchaseForMsisdn,
  type FirestoreAdapterOptions,
} from "@/server/robi/firestoreWalletStore";

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
        if (!doc) return { missing: name };
        return { found: { name, fields: doc.fields, updateTime: doc.updateTime } };
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

describe("Token Shop Live bdapps Subscription API Integration", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.BDAPPS_MODE;
    delete process.env.BDAPPS_SUBSCRIPTION_ENABLED;
    delete process.env.BDAPPS_PHP_BASE_URL;
    delete process.env.PHP_GATEWAY_SHARED_SECRET;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIRESTORE_USE_METADATA_ADC;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("returns real 503 gateway error instead of preview simulation when gateway secrets are unconfigured", async () => {
    const authRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01812345678", intent: "register" }),
      }),
    );
    const authJson = (await authRes.json()) as { token: string };

    const res = await robiApi.handle(
      new Request("http://localhost/api/tokens/shop/purchase", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${authJson.token}`,
        },
        body: JSON.stringify({
          packageId: "pkg-6",
          userConfirmed: true,
          consentAccepted: true,
          idempotencyKey: "sub-shop-unconfigured-1",
        }),
      }),
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; blocked: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.blocked).toBe(true);
    expect(body.error).toMatch(/BDAPPS_MODE|Subscription|PHP gateway/i);
  });

  it("calls PHP subscription_subscribe and subscription_status to return confirmed, pending, or declined states", async () => {
    process.env.BDAPPS_MODE = "production";
    process.env.BDAPPS_SUBSCRIPTION_ENABLED = "true";
    process.env.BDAPPS_PHP_BASE_URL = "https://bdappsdigitalapps.com/auw26/RobiTrail";
    process.env.PHP_GATEWAY_SHARED_SECRET = "test-shared-secret-64";
    process.env.FIRESTORE_USE_METADATA_ADC = "true";

    const pkg = TOKEN_SHOP_PACKAGES[0]; // 6 Tokens / 2 BDT

    // 1. Immediate REGISTERED confirmation
    const confirmedFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("subscription_subscribe.php")) {
        return new Response(
          JSON.stringify({ ok: true, statusCode: "S1000", subscriptionStatus: "REGISTERED" }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, statusCode: "S1000", subscriptionStatus: "REGISTERED" }),
        { status: 200 },
      );
    };

    const confirmedRes = await executeBdappsSubscriptionPurchase("8801812345678", pkg, "RT-1", {
      userConfirmed: true,
      fetcher: confirmedFetch,
    });
    expect(confirmedRes.ok).toBe(true);
    expect(confirmedRes.txState).toBe("confirmed");
    expect(confirmedRes.httpStatus).toBe(200);

    // 2. Pending carrier confirmation
    const pendingFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("subscription_subscribe.php")) {
        return new Response(
          JSON.stringify({ ok: true, statusCode: "S1000", subscriptionStatus: "PENDING" }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, statusCode: "S1000", subscriptionStatus: "PENDING" }),
        { status: 200 },
      );
    };

    const pendingRes = await executeBdappsSubscriptionPurchase("8801812345678", pkg, "RT-2", {
      userConfirmed: true,
      fetcher: pendingFetch,
    });
    expect(pendingRes.ok).toBe(true);
    expect(pendingRes.txState).toBe("pending");
    expect(pendingRes.httpStatus).toBe(202);

    // 3. Gateway blocked / carrier declined
    const declinedFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          ok: false,
          statusCode: "E1301",
          statusDetail: "Insufficient subscriber balance.",
        }),
        { status: 400 },
      );

    const declinedRes = await executeBdappsSubscriptionPurchase("8801812345678", pkg, "RT-3", {
      userConfirmed: true,
      fetcher: declinedFetch,
    });
    expect(declinedRes.ok).toBe(false);
    expect(declinedRes.txState).toBe("failed");
    expect(declinedRes.notice).toMatch(/Insufficient subscriber balance/i);
  });

  it("credits pending subscription token pack once on webhook confirmation and ignores future renewals", async () => {
    const store = createMockFirestoreRestHarness();
    const msisdn = "8801812345678";
    const accountId = "RTU-SUBTEST01";

    await fsGetOrInitWallet(msisdn, accountId, store.options);
    const pending = await fsCreatePendingPurchase(
      msisdn,
      accountId,
      {
        externalTrxId: "RT-SUB-ORDER-1",
        packageId: "pkg-15",
        tokens: 15,
        priceBdt: 10,
        billingChannel: "subscription",
      },
      store.options,
    );
    expect(pending.wallet.balance).toBe(0);

    // First subscription_notification (REGISTERED) credits +15 tokens once
    const firstSettle = await fsSettlePendingSubscriptionPurchaseForMsisdn(
      msisdn,
      "confirmed",
      { providerStatusCode: "S1000", providerStatusDetail: "Confirmed" },
      store.options,
    );
    expect(firstSettle.found).toBe(true);
    expect(firstSettle.alreadySettled).toBe(false);
    expect(firstSettle.wallet?.balance).toBe(15);

    // Subsequent renewal notification finds no open pending purchase order and does NOT double-credit
    const renewalSettle = await fsSettlePendingSubscriptionPurchaseForMsisdn(
      msisdn,
      "confirmed",
      { providerStatusCode: "S1000", providerStatusDetail: "Renewal" },
      store.options,
    );
    expect(renewalSettle.found).toBe(false);
    expect(renewalSettle.wallet).toBeNull();
  });
});
