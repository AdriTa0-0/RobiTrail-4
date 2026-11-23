import crypto from "node:crypto";
import firebaseConfig from "@/robi/firebase-applet-config.json";
import {
  computeAchievements,
  sanitizeTrailIds,
  VALID_TRAIL_IDS,
  type PlayerAccountRecord,
  type PublicTokenWallet,
  type SubscriptionRecord,
  type TokenTransactionRecord,
  type TokenWalletRecord,
} from "./dbStore";

const VALID_TRAIL_SET = new Set<string>(VALID_TRAIL_IDS);

export interface TokenPurchaseOrderRecord {
  externalTrxId: string;
  walletKey: string;
  msisdn: string;
  accountId: string;
  packageId: string;
  tokens: number;
  priceBdt: number;
  status: "pending" | "confirmed" | "failed";
  mode: "live_bdapps";
  providerStatusCode: string;
  providerStatusDetail: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
}

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface FsValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
}

interface FsDocument {
  name?: string;
  fields?: Record<string, FsValue>;
  updateTime?: string;
}

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export function getFirestoreTargetConfig(): { projectId: string; databaseId: string } {
  const env = process.env as Record<string, string | undefined>;
  const projectId = env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || "(default)";
  return { projectId, databaseId };
}

export function isFirestorePersistenceConfigured(): boolean {
  const env = process.env as Record<string, string | undefined>;
  const rawJson = (env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (rawJson.startsWith("{")) return true;
  if (env.FIRESTORE_USE_METADATA_ADC === "true") return true;
  return false;
}

export function hashWalletKey(msisdn: string): string {
  return crypto.createHash("sha256").update(`rt-wallet:${msisdn}`).digest("hex").slice(0, 40);
}

export function hashKeyId(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 48);
}

export function safeDocId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function toFsValue(val: unknown): FsValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFsValue(item)) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, FsValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFsValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFsValue(val: FsValue | undefined): unknown {
  if (!val) return undefined;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) {
    return (val.arrayValue?.values || []).map((v) => fromFsValue(v));
  }
  if ("mapValue" in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      out[k] = fromFsValue(v);
    }
    return out;
  }
  return undefined;
}

function encodeFields(obj: Record<string, unknown>): Record<string, FsValue> {
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFsValue(v);
    }
  }
  return fields;
}

function decodeDoc<T>(doc: FsDocument | undefined): T | null {
  if (!doc || !doc.fields) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFsValue(v);
  }
  return out as T;
}

async function getGoogleAccessToken(fetcher: typeof fetch): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAtMs - 60_000) {
    return cachedAccessToken.token;
  }

  const env = process.env as Record<string, string | undefined>;
  const rawJson = (env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();

  if (rawJson.startsWith("{")) {
    const sa = JSON.parse(rawJson) as ServiceAccountJson;
    if (!sa.client_email || !sa.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    }
    const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
    const nowSec = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const claim = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: tokenUri,
        iat: nowSec,
        exp: nowSec + 3600,
      }),
    ).toString("base64url");
    const unsigned = `${header}.${claim}`;
    const signature = crypto
      .createSign("RSA-SHA256")
      .update(unsigned)
      .sign(sa.private_key)
      .toString("base64url");

    const res = await fetcher(tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${signature}`,
    });
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error || "Failed to acquire Google OAuth2 token for Firestore.");
    }
    cachedAccessToken = {
      token: json.access_token,
      expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return cachedAccessToken.token;
  }

  if (env.FIRESTORE_USE_METADATA_ADC === "true") {
    const res = await fetcher(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } },
    );
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) {
      throw new Error("Metadata server did not return a Firestore access token.");
    }
    cachedAccessToken = {
      token: json.access_token,
      expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return cachedAccessToken.token;
  }

  throw new Error(
    "Firestore production persistence is not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or FIRESTORE_USE_METADATA_ADC=true).",
  );
}

export interface FirestoreAdapterOptions {
  fetcher?: typeof fetch;
  accessTokenProvider?: () => Promise<string>;
}

function docPath(collection: string, docId: string): string {
  const { projectId, databaseId } = getFirestoreTargetConfig();
  return `projects/${projectId}/databases/${databaseId}/documents/${collection}/${docId}`;
}

function documentsBaseUrl(): string {
  const { projectId, databaseId } = getFirestoreTargetConfig();
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
}

async function runFirestoreTransaction<T>(
  ops: (ctx: {
    getDoc: <D>(
      collection: string,
      docId: string,
    ) => Promise<{ data: D | null; updateTime?: string }>;
  }) => Promise<{
    result: T;
    writes: Array<
      | {
          update: { name: string; fields: Record<string, FsValue> };
          currentDocument?: { exists?: boolean; updateTime?: string };
        }
      | { delete: string }
    >;
  }>,
  options: FirestoreAdapterOptions = {},
): Promise<T> {
  const fetcher = options.fetcher || fetch;
  const token = options.accessTokenProvider
    ? await options.accessTokenProvider()
    : await getGoogleAccessToken(fetcher);
  const baseUrl = documentsBaseUrl();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const beginRes = await fetcher(`${baseUrl}:beginTransaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ options: { readWrite: {} } }),
    });
    const beginJson = (await beginRes.json()) as {
      transaction?: string;
      error?: { message?: string };
    };
    if (!beginRes.ok || !beginJson.transaction) {
      throw new Error(beginJson.error?.message || "Unable to start Firestore transaction.");
    }
    const transactionId = beginJson.transaction;

    const getDoc = async <D>(
      collection: string,
      docId: string,
    ): Promise<{ data: D | null; updateTime?: string }> => {
      const fullName = docPath(collection, docId);
      const batchRes = await fetcher(`${baseUrl}:batchGet`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documents: [fullName],
          transaction: transactionId,
        }),
      });
      const batchJson = (await batchRes.json()) as Array<{
        found?: FsDocument;
        missing?: string;
        error?: { message?: string };
      }>;
      if (!batchRes.ok || !Array.isArray(batchJson)) {
        throw new Error("Firestore transactional read failed.");
      }
      const first = batchJson[0];
      if (first?.found) {
        return {
          data: decodeDoc<D>(first.found),
          updateTime: first.found.updateTime,
        };
      }
      return { data: null };
    };

    const plan = await ops({ getDoc });
    if (plan.writes.length === 0) {
      await fetcher(`${baseUrl}:rollback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction: transactionId }),
      }).catch(() => undefined);
      return plan.result;
    }

    const commitRes = await fetcher(`${baseUrl}:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: transactionId,
        writes: plan.writes,
      }),
    });

    if (commitRes.ok) {
      return plan.result;
    }

    if (commitRes.status === 409 || commitRes.status === 412) {
      // Optimistic transaction contention: retry safely
      continue;
    }

    const commitErr = (await commitRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(commitErr.error?.message || `Firestore commit failed (${commitRes.status}).`);
  }

  throw new Error("Firestore transaction aborted due to repeated contention.");
}

function toPublicWalletFromDoc(wallet: TokenWalletRecord): PublicTokenWallet {
  return {
    accountId: wallet.accountId,
    balance: wallet.balance,
    welcomeRewardGranted: wallet.welcomeRewardGranted,
    welcomeRewardAt: wallet.welcomeRewardAt,
    unlockedTrailIds: [...(wallet.unlockedTrailIds || [])],
    totalUnlockedGames: (wallet.unlockedTrailIds || []).length,
    transactions: [...(wallet.transactions || [])],
    updatedAt: wallet.updatedAt,
  };
}

export async function fsGetOrInitWallet(
  msisdn: string,
  accountId: string,
  options?: FirestoreAdapterOptions,
): Promise<PublicTokenWallet> {
  const walletKey = hashWalletKey(msisdn);
  return runFirestoreTransaction<PublicTokenWallet>(async ({ getDoc }) => {
    const existing = await getDoc<TokenWalletRecord>("wallets", walletKey);
    if (existing.data) {
      return { result: toPublicWalletFromDoc(existing.data), writes: [] };
    }
    const now = new Date().toISOString();
    const created: TokenWalletRecord = {
      msisdn,
      accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };
    return {
      result: toPublicWalletFromDoc(created),
      writes: [
        {
          update: {
            name: docPath("wallets", walletKey),
            fields: encodeFields(created as unknown as Record<string, unknown>),
          },
          currentDocument: { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsGrantWelcomeTokensOnce(
  msisdn: string,
  accountId: string,
  options?: FirestoreAdapterOptions,
): Promise<{
  wallet: PublicTokenWallet;
  grantedNow: boolean;
  transaction: TokenTransactionRecord | null;
}> {
  const walletKey = hashWalletKey(msisdn);
  const idempotencyKey = `welcome:${accountId}`;
  const keyDocId = hashKeyId(idempotencyKey);

  return runFirestoreTransaction<{
    wallet: PublicTokenWallet;
    grantedNow: boolean;
    transaction: TokenTransactionRecord | null;
  }>(async ({ getDoc }) => {
    const [walletSnap, keySnap] = await Promise.all([
      getDoc<TokenWalletRecord>("wallets", walletKey),
      getDoc<Record<string, unknown>>("processedKeys", keyDocId),
    ]);

    const now = new Date().toISOString();
    const wallet: TokenWalletRecord = walletSnap.data || {
      msisdn,
      accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };

    if (wallet.welcomeRewardGranted || keySnap.data) {
      return {
        result: {
          wallet: toPublicWalletFromDoc(wallet),
          grantedNow: false,
          transaction: null,
        },
        writes: [],
      };
    }

    const nextBalance = wallet.balance + 10;
    const tx: TokenTransactionRecord = {
      id: `TX-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      accountId: wallet.accountId,
      type: "welcome_reward",
      amount: 10,
      balanceAfter: nextBalance,
      descriptionEn: "Welcome Reward for new verified RobiTrail player",
      descriptionBn: "নতুন যাচাইকৃত রবিট্রেইল খেলোয়াড়ের জন্য স্বাগতম পুরস্কার",
      status: "completed",
      mode: "live_bdapps",
      idempotencyKey,
      createdAt: now,
    };

    const updatedWallet: TokenWalletRecord = {
      ...wallet,
      balance: nextBalance,
      welcomeRewardGranted: true,
      welcomeRewardAt: now,
      transactions: [tx, ...(wallet.transactions || [])].slice(0, 50),
      updatedAt: now,
    };

    return {
      result: {
        wallet: toPublicWalletFromDoc(updatedWallet),
        grantedNow: true,
        transaction: tx,
      },
      writes: [
        {
          update: {
            name: docPath("wallets", walletKey),
            fields: encodeFields(updatedWallet as unknown as Record<string, unknown>),
          },
          currentDocument: walletSnap.updateTime
            ? { updateTime: walletSnap.updateTime }
            : { exists: false },
        },
        {
          update: {
            name: docPath("processedKeys", keyDocId),
            fields: encodeFields({ key: idempotencyKey, kind: "welcome", createdAt: now }),
          },
          currentDocument: { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsUnlockGameWithTokens(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    idempotencyKey?: string;
  } = {},
  options?: FirestoreAdapterOptions,
): Promise<{
  ok: boolean;
  alreadyUnlocked: boolean;
  insufficientTokens: boolean;
  deducted: number;
  wallet: PublicTokenWallet;
  transaction: TokenTransactionRecord | null;
}> {
  const walletKey = hashWalletKey(msisdn);
  const cost = Math.max(0, opts.cost ?? 2);
  const key = opts.idempotencyKey || `unlock:${accountId}:${trailId}`;
  const keyDocId = hashKeyId(key);

  return runFirestoreTransaction<{
    ok: boolean;
    alreadyUnlocked: boolean;
    insufficientTokens: boolean;
    deducted: number;
    wallet: PublicTokenWallet;
    transaction: TokenTransactionRecord | null;
  }>(async ({ getDoc }) => {
    const [walletSnap, keySnap] = await Promise.all([
      getDoc<TokenWalletRecord>("wallets", walletKey),
      getDoc<Record<string, unknown>>("processedKeys", keyDocId),
    ]);

    const now = new Date().toISOString();
    const wallet: TokenWalletRecord = walletSnap.data || {
      msisdn,
      accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };

    if (!VALID_TRAIL_SET.has(trailId)) {
      return {
        result: {
          ok: false,
          alreadyUnlocked: false,
          insufficientTokens: false,
          deducted: 0,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: null,
        },
        writes: [],
      };
    }

    if ((wallet.unlockedTrailIds || []).includes(trailId) || keySnap.data) {
      const prevTx = (wallet.transactions || []).find((t) => t.idempotencyKey === key) || null;
      return {
        result: {
          ok: true,
          alreadyUnlocked: true,
          insufficientTokens: false,
          deducted: 0,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: prevTx,
        },
        writes: [],
      };
    }

    if (wallet.balance < cost) {
      return {
        result: {
          ok: false,
          alreadyUnlocked: false,
          insufficientTokens: true,
          deducted: 0,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: null,
        },
        writes: [],
      };
    }

    const nextBalance = wallet.balance - cost;
    const tx: TokenTransactionRecord = {
      id: `TX-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      accountId: wallet.accountId,
      type: "game_unlock",
      amount: -cost,
      balanceAfter: nextBalance,
      referenceId: trailId,
      descriptionEn: `Unlocked game: ${opts.trailTitleEn || trailId}`,
      descriptionBn: `গেম আনলক: ${opts.trailTitleBn || trailId}`,
      status: "completed",
      mode: "live_bdapps",
      idempotencyKey: key,
      createdAt: now,
    };

    const updatedWallet: TokenWalletRecord = {
      ...wallet,
      balance: nextBalance,
      unlockedTrailIds: [...(wallet.unlockedTrailIds || []), trailId],
      transactions: [tx, ...(wallet.transactions || [])].slice(0, 50),
      updatedAt: now,
    };

    return {
      result: {
        ok: true,
        alreadyUnlocked: false,
        insufficientTokens: false,
        deducted: cost,
        wallet: toPublicWalletFromDoc(updatedWallet),
        transaction: tx,
      },
      writes: [
        {
          update: {
            name: docPath("wallets", walletKey),
            fields: encodeFields(updatedWallet as unknown as Record<string, unknown>),
          },
          currentDocument: walletSnap.updateTime
            ? { updateTime: walletSnap.updateTime }
            : { exists: false },
        },
        {
          update: {
            name: docPath("processedKeys", keyDocId),
            fields: encodeFields({ key, kind: "unlock", createdAt: now }),
          },
          currentDocument: { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsRecordMistakePenalty(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    idempotencyKey?: string;
  } = {},
  options?: FirestoreAdapterOptions,
): Promise<{
  deducted: number;
  wallet: PublicTokenWallet;
  transaction: TokenTransactionRecord | null;
}> {
  const walletKey = hashWalletKey(msisdn);
  const requestedCost = Math.max(1, opts.cost ?? 1);
  const key = opts.idempotencyKey || `mistake:${accountId}:${trailId}:${Date.now()}`;
  const keyDocId = hashKeyId(key);

  return runFirestoreTransaction(async ({ getDoc }) => {
    const [walletSnap, keySnap] = await Promise.all([
      getDoc<TokenWalletRecord>("wallets", walletKey),
      getDoc<Record<string, unknown>>("processedKeys", keyDocId),
    ]);

    const now = new Date().toISOString();
    const wallet: TokenWalletRecord = walletSnap.data || {
      msisdn,
      accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };

    if (keySnap.data) {
      const existingTx = (wallet.transactions || []).find((t) => t.idempotencyKey === key) || null;
      return {
        result: {
          deducted: 0,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: existingTx,
        },
        writes: [],
      };
    }

    const actualDeduct = Math.min(wallet.balance, requestedCost);
    if (actualDeduct <= 0) {
      return {
        result: {
          deducted: 0,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: null,
        },
        writes: [
          {
            update: {
              name: docPath("processedKeys", keyDocId),
              fields: encodeFields({ key, kind: "mistake", createdAt: now }),
            },
            currentDocument: { exists: false },
          },
        ],
      };
    }

    const nextBalance = Math.max(0, wallet.balance - actualDeduct);
    const tx: TokenTransactionRecord = {
      id: `TX-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      accountId: wallet.accountId,
      type: "mistake_penalty",
      amount: -actualDeduct,
      balanceAfter: nextBalance,
      referenceId: trailId,
      descriptionEn: `2 gameplay mistakes in ${opts.trailTitleEn || trailId}`,
      descriptionBn: `${opts.trailTitleBn || trailId}-এ ২টি ভুলের জন্য টোকেন কর্তন`,
      status: "completed",
      mode: "live_bdapps",
      idempotencyKey: key,
      createdAt: now,
    };

    const updatedWallet: TokenWalletRecord = {
      ...wallet,
      balance: nextBalance,
      transactions: [tx, ...(wallet.transactions || [])].slice(0, 50),
      updatedAt: now,
    };

    return {
      result: {
        deducted: actualDeduct,
        wallet: toPublicWalletFromDoc(updatedWallet),
        transaction: tx,
      },
      writes: [
        {
          update: {
            name: docPath("wallets", walletKey),
            fields: encodeFields(updatedWallet as unknown as Record<string, unknown>),
          },
          currentDocument: walletSnap.updateTime
            ? { updateTime: walletSnap.updateTime }
            : { exists: false },
        },
        {
          update: {
            name: docPath("processedKeys", keyDocId),
            fields: encodeFields({ key, kind: "mistake", createdAt: now }),
          },
          currentDocument: { exists: false },
        },
      ],
    };
  }, options);
}

/**
 * Step 1 of safe production CaaS checkout:
 * Atomically records a `pending` purchase order BEFORE calling PHP CaaS charge.
 * NEVER increments wallet balance in this step.
 */
export async function fsCreatePendingPurchase(
  msisdn: string,
  accountId: string,
  opts: {
    externalTrxId: string;
    packageId: string;
    tokens: number;
    priceBdt: number;
  },
  options?: FirestoreAdapterOptions,
): Promise<{
  duplicate: boolean;
  purchase: TokenPurchaseOrderRecord;
  wallet: PublicTokenWallet;
}> {
  const walletKey = hashWalletKey(msisdn);
  const trxDocId = safeDocId(opts.externalTrxId);

  return runFirestoreTransaction<{
    duplicate: boolean;
    purchase: TokenPurchaseOrderRecord;
    wallet: PublicTokenWallet;
  }>(async ({ getDoc }) => {
    const [walletSnap, trxSnap] = await Promise.all([
      getDoc<TokenWalletRecord>("wallets", walletKey),
      getDoc<TokenPurchaseOrderRecord>("tokenPurchases", trxDocId),
    ]);

    const now = new Date().toISOString();
    const wallet: TokenWalletRecord = walletSnap.data || {
      msisdn,
      accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };

    if (trxSnap.data) {
      return {
        result: {
          duplicate: true,
          purchase: trxSnap.data,
          wallet: toPublicWalletFromDoc(wallet),
        },
        writes: [],
      };
    }

    const order: TokenPurchaseOrderRecord = {
      externalTrxId: opts.externalTrxId,
      walletKey,
      msisdn,
      accountId,
      packageId: opts.packageId,
      tokens: opts.tokens,
      priceBdt: opts.priceBdt,
      status: "pending",
      mode: "live_bdapps",
      providerStatusCode: "PENDING",
      providerStatusDetail: "Awaiting verified bdapps CaaS payment confirmation.",
      createdAt: now,
      updatedAt: now,
      settledAt: null,
    };

    const writes: Array<{
      update: { name: string; fields: Record<string, FsValue> };
      currentDocument?: { exists?: boolean; updateTime?: string };
    }> = [
      {
        update: {
          name: docPath("tokenPurchases", trxDocId),
          fields: encodeFields(order as unknown as Record<string, unknown>),
        },
        currentDocument: { exists: false },
      },
    ];

    if (!walletSnap.data) {
      writes.push({
        update: {
          name: docPath("wallets", walletKey),
          fields: encodeFields(wallet as unknown as Record<string, unknown>),
        },
        currentDocument: { exists: false },
      });
    }

    return {
      result: {
        duplicate: false,
        purchase: order,
        wallet: toPublicWalletFromDoc(wallet),
      },
      writes,
    };
  }, options);
}

/**
 * Step 2 of safe production CaaS checkout:
 * Atomically transitions `pending` -> `confirmed` (crediting tokens once) or `failed` (zero tokens).
 * Duplicate callbacks or retries are guaranteed idempotent.
 */
export async function fsSettlePurchaseTransaction(
  externalTrxId: string,
  outcome: "confirmed" | "failed",
  meta: {
    providerStatusCode?: string;
    providerStatusDetail?: string;
  } = {},
  options?: FirestoreAdapterOptions,
): Promise<{
  found: boolean;
  alreadySettled: boolean;
  purchase: TokenPurchaseOrderRecord | null;
  wallet: PublicTokenWallet | null;
  transaction: TokenTransactionRecord | null;
}> {
  const trxDocId = safeDocId(externalTrxId);
  const settleKey = `purchase_settle:${externalTrxId}`;
  const keyDocId = hashKeyId(settleKey);

  return runFirestoreTransaction<{
    found: boolean;
    alreadySettled: boolean;
    purchase: TokenPurchaseOrderRecord | null;
    wallet: PublicTokenWallet | null;
    transaction: TokenTransactionRecord | null;
  }>(async ({ getDoc }) => {
    const [trxSnap, keySnap] = await Promise.all([
      getDoc<TokenPurchaseOrderRecord>("tokenPurchases", trxDocId),
      getDoc<Record<string, unknown>>("processedKeys", keyDocId),
    ]);

    if (!trxSnap.data) {
      return {
        result: {
          found: false,
          alreadySettled: false,
          purchase: null,
          wallet: null,
          transaction: null,
        },
        writes: [],
      };
    }

    const order = trxSnap.data;
    const walletSnap = await getDoc<TokenWalletRecord>("wallets", order.walletKey);
    const now = new Date().toISOString();
    const wallet: TokenWalletRecord = walletSnap.data || {
      msisdn: order.msisdn,
      accountId: order.accountId,
      balance: 0,
      welcomeRewardGranted: false,
      welcomeRewardAt: null,
      unlockedTrailIds: [],
      transactions: [],
      processedKeys: [],
      updatedAt: now,
    };

    if (order.status !== "pending" || keySnap.data) {
      const existingTx =
        (wallet.transactions || []).find((t) => t.idempotencyKey === externalTrxId) || null;
      return {
        result: {
          found: true,
          alreadySettled: true,
          purchase: order,
          wallet: toPublicWalletFromDoc(wallet),
          transaction: existingTx,
        },
        writes: [],
      };
    }

    const delta = outcome === "confirmed" ? order.tokens : 0;
    const nextBalance = wallet.balance + delta;
    const tx: TokenTransactionRecord = {
      id: `TX-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      accountId: wallet.accountId,
      type: "token_purchase",
      amount: delta,
      balanceAfter: nextBalance,
      packageId: order.packageId,
      priceBdt: order.priceBdt,
      descriptionEn:
        outcome === "confirmed"
          ? `Token Shop purchase confirmed: +${order.tokens} Tokens (BDT ${order.priceBdt})`
          : `Token Shop charge failed: ${order.tokens} Tokens (BDT ${order.priceBdt})`,
      descriptionBn:
        outcome === "confirmed"
          ? `টোকেন শপ ক্রয় নিশ্চিত: +${order.tokens}টি টোকেন (BDT ${order.priceBdt})`
          : `টোকেন শপ চার্জ ব্যর্থ: ${order.tokens}টি টোকেন (BDT ${order.priceBdt})`,
      status: outcome === "confirmed" ? "completed" : "failed",
      mode: "live_bdapps",
      idempotencyKey: externalTrxId,
      createdAt: now,
    };

    const updatedOrder: TokenPurchaseOrderRecord = {
      ...order,
      status: outcome,
      providerStatusCode: meta.providerStatusCode || (outcome === "confirmed" ? "S1000" : "FAILED"),
      providerStatusDetail:
        meta.providerStatusDetail ||
        (outcome === "confirmed"
          ? "Confirmed by bdapps charging notification."
          : "Payment failed."),
      updatedAt: now,
      settledAt: now,
    };

    const updatedWallet: TokenWalletRecord = {
      ...wallet,
      balance: nextBalance,
      transactions: [tx, ...(wallet.transactions || [])].slice(0, 50),
      updatedAt: now,
    };

    return {
      result: {
        found: true,
        alreadySettled: false,
        purchase: updatedOrder,
        wallet: toPublicWalletFromDoc(updatedWallet),
        transaction: tx,
      },
      writes: [
        {
          update: {
            name: docPath("tokenPurchases", trxDocId),
            fields: encodeFields(updatedOrder as unknown as Record<string, unknown>),
          },
          currentDocument: trxSnap.updateTime ? { updateTime: trxSnap.updateTime } : undefined,
        },
        {
          update: {
            name: docPath("wallets", order.walletKey),
            fields: encodeFields(updatedWallet as unknown as Record<string, unknown>),
          },
          currentDocument: walletSnap.updateTime
            ? { updateTime: walletSnap.updateTime }
            : { exists: false },
        },
        {
          update: {
            name: docPath("processedKeys", keyDocId),
            fields: encodeFields({
              key: settleKey,
              kind: "purchase",
              externalTrxId,
              createdAt: now,
            }),
          },
          currentDocument: { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsGetAccount(
  msisdn: string,
  options?: FirestoreAdapterOptions,
): Promise<PlayerAccountRecord | null> {
  const walletKey = hashWalletKey(msisdn);
  return runFirestoreTransaction(async ({ getDoc }) => {
    const snap = await getDoc<PlayerAccountRecord>("accounts", walletKey);
    return { result: snap.data, writes: [] };
  }, options);
}

export async function fsUpsertAccount(
  msisdn: string,
  maskedPhone: string,
  opts: {
    displayName?: string;
    completedTrailIds?: string[];
    certificateIds?: string[];
    preferredLang?: "en" | "bn";
    preferredCityId?: "chattogram" | "dhaka" | "sylhet";
  } = {},
  options?: FirestoreAdapterOptions,
): Promise<PlayerAccountRecord> {
  const walletKey = hashWalletKey(msisdn);
  return runFirestoreTransaction(async ({ getDoc }) => {
    const snap = await getDoc<PlayerAccountRecord>("accounts", walletKey);
    const existing = snap.data;
    const now = new Date().toISOString();

    const mergedTrails = sanitizeTrailIds([
      ...(existing?.completedTrailIds || []),
      ...(opts.completedTrailIds || []),
    ]);
    const certIds = Array.from(
      new Set([...(existing?.certificateIds || []), ...(opts.certificateIds || [])]),
    );
    const cleanName =
      typeof opts.displayName === "string" && opts.displayName.trim().length > 0
        ? opts.displayName.trim().slice(0, 60)
        : existing?.displayName || "RobiTrail Explorer";
    const preferredLang: "en" | "bn" =
      opts.preferredLang === "bn" || opts.preferredLang === "en"
        ? opts.preferredLang
        : existing?.preferredLang || "en";
    const preferredCityId: "chattogram" | "dhaka" | "sylhet" =
      opts.preferredCityId === "chattogram" ||
      opts.preferredCityId === "dhaka" ||
      opts.preferredCityId === "sylhet"
        ? opts.preferredCityId
        : existing?.preferredCityId || "chattogram";

    const next: PlayerAccountRecord = {
      accountId:
        existing?.accountId ||
        `RTU-${crypto.createHash("sha256").update(msisdn).digest("hex").slice(0, 10).toUpperCase()}`,
      msisdn,
      maskedPhone,
      displayName: cleanName,
      completedTrailIds: mergedTrails,
      achievements: computeAchievements(mergedTrails, existing?.achievements || []),
      certificateIds: certIds,
      preferredLang,
      preferredCityId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    return {
      result: next,
      writes: [
        {
          update: {
            name: docPath("accounts", walletKey),
            fields: encodeFields(next as unknown as Record<string, unknown>),
          },
          currentDocument: snap.updateTime ? { updateTime: snap.updateTime } : { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsSaveSubscription(
  record: SubscriptionRecord,
  options?: FirestoreAdapterOptions,
): Promise<SubscriptionRecord> {
  const walletKey = hashWalletKey(record.msisdn);
  return runFirestoreTransaction(async ({ getDoc }) => {
    const snap = await getDoc<SubscriptionRecord>("subscriptions", walletKey);
    return {
      result: record,
      writes: [
        {
          update: {
            name: docPath("subscriptions", walletKey),
            fields: encodeFields(record as unknown as Record<string, unknown>),
          },
          currentDocument: snap.updateTime ? { updateTime: snap.updateTime } : { exists: false },
        },
      ],
    };
  }, options);
}

export async function fsGetSubscription(
  msisdn: string,
  options?: FirestoreAdapterOptions,
): Promise<SubscriptionRecord | null> {
  const walletKey = hashWalletKey(msisdn);
  return runFirestoreTransaction(async ({ getDoc }) => {
    const snap = await getDoc<SubscriptionRecord>("subscriptions", walletKey);
    return { result: snap.data, writes: [] };
  }, options);
}

export async function fsDeleteAccountData(
  msisdn: string,
  options?: FirestoreAdapterOptions,
): Promise<boolean> {
  const walletKey = hashWalletKey(msisdn);
  return runFirestoreTransaction(async ({ getDoc }) => {
    const [accSnap, subSnap, walSnap] = await Promise.all([
      getDoc<PlayerAccountRecord>("accounts", walletKey),
      getDoc<SubscriptionRecord>("subscriptions", walletKey),
      getDoc<TokenWalletRecord>("wallets", walletKey),
    ]);
    const existed = Boolean(accSnap.data || subSnap.data || walSnap.data);
    return {
      result: existed,
      writes: [
        { delete: docPath("accounts", walletKey) },
        { delete: docPath("subscriptions", walletKey) },
        { delete: docPath("wallets", walletKey) },
      ],
    };
  }, options);
}
