import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { robiApi } from "@/server/robi/api";
import {
  getPersistenceBackend,
  loadAccount,
  saveOrUpdateAccount,
  shouldUseFirestorePersistence,
} from "@/server/robi/walletPersistence";
import { fsUpsertAccount, hashWalletKey } from "@/server/robi/firestoreWalletStore";

interface FsStoredDoc {
  fields: Record<string, unknown>;
  updateTime: string;
}

function createFirestoreRestFetchMock() {
  const store = new Map<string, FsStoredDoc>();
  let txCounter = 0;

  const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("metadata.google.internal")) {
      return new Response(JSON.stringify({ access_token: "mock-adc-token", expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":beginTransaction")) {
      txCounter += 1;
      return new Response(JSON.stringify({ transaction: `tx-${txCounter}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":rollback")) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":batchGet")) {
      const body = JSON.parse(String(init?.body || "{}")) as { documents?: string[] };
      const results = (body.documents || []).map((docName) => {
        const stored = store.get(docName);
        if (stored) {
          return {
            found: {
              name: docName,
              fields: stored.fields,
              updateTime: stored.updateTime,
            },
          };
        }
        return { missing: docName };
      });
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(":commit")) {
      const body = JSON.parse(String(init?.body || "{}")) as {
        writes?: Array<{
          update?: { name: string; fields: Record<string, unknown> };
          delete?: string;
        }>;
      };
      for (const write of body.writes || []) {
        if (write.update) {
          store.set(write.update.name, {
            fields: write.update.fields,
            updateTime: new Date().toISOString(),
          });
        } else if (write.delete) {
          store.delete(write.delete);
        }
      }
      return new Response(JSON.stringify({ writeResults: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: { message: `Unhandled URL: ${url}` } }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  });

  return { store, mockFetch };
}

describe("Firestore persistence for registration and login (preview & production)", () => {
  const envBackup = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.BDAPPS_MODE;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIRESTORE_USE_METADATA_ADC;
  });

  afterEach(() => {
    process.env = { ...envBackup };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reports memory_preview when unconfigured in preview and firestore_unconfigured in production", async () => {
    expect(shouldUseFirestorePersistence()).toBe(false);
    expect(getPersistenceBackend()).toBe("memory_preview");

    process.env.BDAPPS_MODE = "production";
    expect(getPersistenceBackend()).toBe("firestore_unconfigured");
    await expect(loadAccount("8801812345678")).rejects.toThrow(/Firestore persistence/i);
    await expect(saveOrUpdateAccount("8801812345678", "88018****678")).rejects.toThrow(
      /Firestore persistence/i,
    );
  });

  it("saves registrations and logins to Firestore even when BDAPPS_MODE is preview", async () => {
    process.env.BDAPPS_MODE = "preview";
    process.env.FIRESTORE_USE_METADATA_ADC = "true";

    const { store, mockFetch } = createFirestoreRestFetchMock();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    expect(shouldUseFirestorePersistence()).toBe(true);
    expect(getPersistenceBackend()).toBe("firestore");

    const healthRes = await robiApi.handle(new Request("http://localhost/api/health"));
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as {
      bdappsMode: string;
      persistenceBackend: string;
    };
    expect(healthJson.bdappsMode).toBe("preview");
    expect(healthJson.persistenceBackend).toBe("firestore");

    // 1. Register a 018 number via direct Robi endpoint in preview mode
    const regRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "01899001122",
          intent: "register",
          displayName: "Firestore Robi Player",
          localCompletedTrailIds: ["ctg-1"],
        }),
      }),
    );
    expect(regRes.status).toBe(200);
    const regJson = (await regRes.json()) as {
      verified: boolean;
      authMethod: string;
      mode: string;
      persistenceBackend: string;
      persistedToFirestore: boolean;
      token: string;
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
      account: {
        accountId: string;
        maskedPhone: string;
        displayName: string;
        authMethod: string;
        lastLoginAt: string;
      };
    };

    expect(regJson.verified).toBe(true);
    expect(regJson.mode).toBe("preview");
    expect(regJson.persistenceBackend).toBe("firestore");
    expect(regJson.persistedToFirestore).toBe(true);
    expect(regJson.welcomeGrantedNow).toBe(true);
    expect(regJson.wallet.balance).toBe(10);
    expect(regJson.account.authMethod).toBe("robi_direct");
    expect(typeof regJson.account.lastLoginAt).toBe("string");

    // Verify account & wallet documents exist in Firestore with passwordless credential fields
    const walletKey = hashWalletKey("8801899001122");
    const accountEntry = Array.from(store.entries()).find(([name]) =>
      name.endsWith(`/documents/accounts/${walletKey}`),
    );
    const walletEntry = Array.from(store.entries()).find(([name]) =>
      name.endsWith(`/documents/wallets/${walletKey}`),
    );
    expect(accountEntry).toBeDefined();
    expect(walletEntry).toBeDefined();

    const accountFields = accountEntry![1].fields as Record<string, { stringValue?: string }>;
    expect(accountFields.msisdn?.stringValue).toBe("8801899001122");
    expect(accountFields.maskedPhone?.stringValue).toBe("88018****122");
    expect(accountFields.authMethod?.stringValue).toBe("robi_direct");
    expect(accountFields.lastLoginAt?.stringValue).toBeTruthy();
    expect(accountFields).not.toHaveProperty("password");
    expect(accountFields).not.toHaveProperty("passwordHash");

    // 2. Returning login loads existing Firestore account and does NOT duplicate Welcome Tokens
    const loginRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "01899001122",
          intent: "login",
        }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const loginJson = (await loginRes.json()) as {
      persistedToFirestore: boolean;
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
      account: { displayName: string };
    };
    expect(loginJson.persistedToFirestore).toBe(true);
    expect(loginJson.welcomeGrantedNow).toBe(false);
    expect(loginJson.wallet.balance).toBe(10);
    expect(loginJson.account.displayName).toBe("Firestore Robi Player");

    // 3. /api/account/me reads from Firestore
    const meRes = await robiApi.handle(
      new Request("http://localhost/api/account/me", {
        headers: { Authorization: `Bearer ${regJson.token}` },
      }),
    );
    expect(meRes.status).toBe(200);
    const meJson = (await meRes.json()) as {
      persistenceBackend: string;
      persistedToFirestore: boolean;
      account: { displayName: string; authMethod: string };
    };
    expect(meJson.persistenceBackend).toBe("firestore");
    expect(meJson.persistedToFirestore).toBe(true);
    expect(meJson.account.displayName).toBe("Firestore Robi Player");
    expect(meJson.account.authMethod).toBe("robi_direct");
  });

  it("fsUpsertAccount stores authMethod and updates lastLoginAt cleanly without passwords", async () => {
    const { store, mockFetch } = createFirestoreRestFetchMock();
    const record = await fsUpsertAccount(
      "8801612345678",
      "88016****678",
      {
        displayName: "Airtel Player",
        authMethod: "otp",
        recordLogin: true,
      },
      {
        fetcher: mockFetch as unknown as typeof fetch,
        accessTokenProvider: async () => "test-token",
      },
    );

    expect(record.msisdn).toBe("8801612345678");
    expect(record.authMethod).toBe("otp");
    expect(record.lastLoginAt).toBeTruthy();

    const walletKey = hashWalletKey("8801612345678");
    const saved = Array.from(store.entries()).find(([name]) =>
      name.endsWith(`/documents/accounts/${walletKey}`),
    );
    expect(saved).toBeDefined();
    expect(saved![1].fields).not.toHaveProperty("password");
  });
});
