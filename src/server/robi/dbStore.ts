import crypto from "node:crypto";

export const VALID_TRAIL_IDS = [
  "ctg-1",
  "ctg-2",
  "ctg-3",
  "ctg-4",
  "dhk-1",
  "dhk-2",
  "dhk-3",
  "dhk-4",
  "dhk-5",
  "syl-1",
  "syl-2",
  "syl-3",
  "syl-4",
  "syl-5",
  "syl-6",
  "syl-7",
] as const;

const VALID_TRAIL_SET = new Set<string>(VALID_TRAIL_IDS);

export const CITY_TRAIL_GROUPS: Record<"chattogram" | "dhaka" | "sylhet", string[]> = {
  chattogram: ["ctg-1", "ctg-2", "ctg-3", "ctg-4"],
  dhaka: ["dhk-1", "dhk-2", "dhk-3", "dhk-4", "dhk-5"],
  sylhet: ["syl-1", "syl-2", "syl-3", "syl-4", "syl-5", "syl-6", "syl-7"],
};

export interface PlayerAchievement {
  id: string;
  cityId: "chattogram" | "dhaka" | "sylhet" | "national";
  titleEn: string;
  titleBn: string;
  unlockedAt: string;
}

export type PlayerAuthMethod = "robi_direct" | "otp" | "demo";

export interface PlayerAccountRecord {
  accountId: string;
  msisdn: string;
  maskedPhone: string;
  displayName: string;
  authMethod?: PlayerAuthMethod;
  completedTrailIds: string[];
  achievements: PlayerAchievement[];
  certificateIds: string[];
  preferredLang: "en" | "bn";
  preferredCityId: "chattogram" | "dhaka" | "sylhet";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SubscriptionRecord {
  msisdn: string;
  status: "inactive" | "active_preview" | "active_production" | "unsubscribed";
  mode: "preview" | "production";
  planName: string;
  priceLabel: string;
  billingFrequency: string;
  renewalTerms: string;
  cancellationMethod: string;
  consentTimestamp: string | null;
  nextRenewalAt: string | null;
  entitlementActive: boolean;
  subscriberId: string;
  updatedAt: string;
}

export interface CertificateRecord {
  certificateId: string;
  learnerName: string;
  completedTrailIds: string[];
  scorePercent: number;
  passed: boolean;
  issuedAt: string;
  prototypeLabel: string;
  ownerAccountId?: string;
}

export type TokenTransactionType =
  "welcome_reward" | "game_unlock" | "mistake_penalty" | "token_purchase" | "admin_adjustment";

export interface TokenTransactionRecord {
  id: string;
  accountId: string;
  type: TokenTransactionType;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  packageId?: string;
  priceBdt?: number;
  descriptionEn: string;
  descriptionBn: string;
  status: "completed" | "failed";
  mode: "demo" | "live_bdapps";
  idempotencyKey: string;
  createdAt: string;
}

export interface TokenWalletRecord {
  msisdn: string;
  accountId: string;
  balance: number;
  welcomeRewardGranted: boolean;
  welcomeRewardAt: string | null;
  unlockedTrailIds: string[];
  transactions: TokenTransactionRecord[];
  processedKeys: string[];
  pendingSubscriptionTrxId?: string | null;
  updatedAt: string;
}

export interface PublicTokenWallet {
  accountId: string;
  balance: number;
  welcomeRewardGranted: boolean;
  welcomeRewardAt: string | null;
  unlockedTrailIds: string[];
  totalUnlockedGames: number;
  transactions: TokenTransactionRecord[];
  updatedAt: string;
}

interface DatabaseSchema {
  accounts: Record<string, PlayerAccountRecord>;
  subscriptions: Record<string, SubscriptionRecord>;
  certificates: Record<string, CertificateRecord>;
  wallets: Record<string, TokenWalletRecord>;
}

function createEmptyDb(): DatabaseSchema {
  return {
    accounts: {},
    subscriptions: {},
    certificates: {},
    wallets: {},
  };
}

let memoryDb: DatabaseSchema | null = null;

function readDbFromDisk(): DatabaseSchema {
  return createEmptyDb();
}

// Workers have no disk: data lives in memory per server instance.
function writeDbToDisk(_db: DatabaseSchema) {}

function getDb(): DatabaseSchema {
  if (!memoryDb) {
    memoryDb = readDbFromDisk();
  }
  return memoryDb;
}

function saveDb() {
  if (memoryDb) {
    writeDbToDisk(memoryDb);
  }
}

export function sanitizeTrailIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && VALID_TRAIL_SET.has(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

export function computeAchievements(
  completedTrailIds: string[],
  existing: PlayerAchievement[] = [],
): PlayerAchievement[] {
  const done = new Set(completedTrailIds);
  const byId = new Map(existing.map((a) => [a.id, a]));
  const now = new Date().toISOString();
  const results: PlayerAchievement[] = [];

  const candidates: Array<{
    id: string;
    cityId: "chattogram" | "dhaka" | "sylhet" | "national";
    titleEn: string;
    titleBn: string;
    unlocked: boolean;
  }> = [
    {
      id: "ach-chattogram",
      cityId: "chattogram",
      titleEn: "Bay Relay Navigator",
      titleBn: "বে রিলে ন্যাভিগেটর",
      unlocked: CITY_TRAIL_GROUPS.chattogram.every((id) => done.has(id)),
    },
    {
      id: "ach-dhaka",
      cityId: "dhaka",
      titleEn: "Metro Signal Architect",
      titleBn: "মেট্রো সিগন্যাল স্থপতি",
      unlocked: CITY_TRAIL_GROUPS.dhaka.every((id) => done.has(id)),
    },
    {
      id: "ach-sylhet",
      cityId: "sylhet",
      titleEn: "Valley Wave Pioneer",
      titleBn: "ভ্যালি ওয়েভ অগ্রদূত",
      unlocked: CITY_TRAIL_GROUPS.sylhet.every((id) => done.has(id)),
    },
    {
      id: "ach-national",
      cityId: "national",
      titleEn: "All-Bangladesh Trail Master",
      titleBn: "সর্ববাংলাদেশ ট্রেইল মাস্টার",
      unlocked: VALID_TRAIL_IDS.every((id) => done.has(id)),
    },
  ];

  for (const c of candidates) {
    if (c.unlocked) {
      results.push({
        id: c.id,
        cityId: c.cityId,
        titleEn: c.titleEn,
        titleBn: c.titleBn,
        unlockedAt: byId.get(c.id)?.unlockedAt || now,
      });
    }
  }
  return results;
}

export function getAccount(msisdn: string): PlayerAccountRecord | null {
  const db = getDb();
  return db.accounts[msisdn] || null;
}

export function upsertAccount(
  msisdn: string,
  maskedPhone: string,
  opts: {
    displayName?: string;
    completedTrailIds?: string[];
    certificateIds?: string[];
    preferredLang?: "en" | "bn";
    preferredCityId?: "chattogram" | "dhaka" | "sylhet";
    authMethod?: PlayerAuthMethod;
    recordLogin?: boolean;
  } = {},
): PlayerAccountRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.accounts[msisdn];

  const mergedTrails = sanitizeTrailIds([
    ...(existing?.completedTrailIds || []),
    ...(opts.completedTrailIds || []),
  ]);

  const validCertIds = Array.from(
    new Set([
      ...(existing?.certificateIds || []),
      ...(opts.certificateIds || []).filter((id) => Boolean(db.certificates[id])),
    ]),
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
    authMethod: opts.authMethod || existing?.authMethod,
    completedTrailIds: mergedTrails,
    achievements: computeAchievements(mergedTrails, existing?.achievements || []),
    certificateIds: validCertIds,
    preferredLang,
    preferredCityId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastLoginAt:
      opts.recordLogin || !existing ? now : existing.lastLoginAt || existing.createdAt || now,
  };

  db.accounts[msisdn] = next;
  saveDb();
  return next;
}

export function sanitizePublicAccount(acc: PlayerAccountRecord) {
  const db = getDb();
  const certificates = acc.certificateIds
    .map((id) => db.certificates[id])
    .filter((c): c is CertificateRecord => Boolean(c));

  return {
    accountId: acc.accountId,
    maskedPhone: acc.maskedPhone,
    displayName: acc.displayName,
    authMethod: acc.authMethod,
    completedTrailIds: acc.completedTrailIds,
    achievements: acc.achievements,
    certificateIds: acc.certificateIds,
    certificates,
    preferredLang: acc.preferredLang,
    preferredCityId: acc.preferredCityId,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
    lastLoginAt: acc.lastLoginAt || acc.updatedAt,
  };
}

export function getSubscription(msisdn: string): SubscriptionRecord | null {
  const db = getDb();
  return db.subscriptions[msisdn] || null;
}

export function saveSubscription(record: SubscriptionRecord): SubscriptionRecord {
  const db = getDb();
  db.subscriptions[record.msisdn] = record;
  saveDb();
  return record;
}

export function deleteAccountAndSubscription(msisdn: string): boolean {
  const db = getDb();
  const existed = Boolean(db.accounts[msisdn] || db.subscriptions[msisdn] || db.wallets[msisdn]);
  delete db.accounts[msisdn];
  delete db.subscriptions[msisdn];
  delete db.wallets[msisdn];
  saveDb();
  return existed;
}

export function saveCertificate(record: CertificateRecord): CertificateRecord {
  const db = getDb();
  db.certificates[record.certificateId] = record;
  saveDb();
  return record;
}

export function getCertificate(id: string): CertificateRecord | null {
  const db = getDb();
  return db.certificates[id] || null;
}

export function getOrInitWallet(msisdn: string, accountId: string): TokenWalletRecord {
  const db = getDb();
  const existing = db.wallets[msisdn];
  if (existing) return existing;
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
  db.wallets[msisdn] = created;
  saveDb();
  return created;
}

export function toPublicWallet(wallet: TokenWalletRecord): PublicTokenWallet {
  return {
    accountId: wallet.accountId,
    balance: wallet.balance,
    welcomeRewardGranted: wallet.welcomeRewardGranted,
    welcomeRewardAt: wallet.welcomeRewardAt,
    unlockedTrailIds: [...wallet.unlockedTrailIds],
    totalUnlockedGames: wallet.unlockedTrailIds.length,
    transactions: [...wallet.transactions],
    updatedAt: wallet.updatedAt,
  };
}

export function grantWelcomeTokensOnce(
  msisdn: string,
  accountId: string,
  mode: "demo" | "live_bdapps" = "demo",
): { wallet: PublicTokenWallet; grantedNow: boolean; transaction: TokenTransactionRecord | null } {
  const wallet = getOrInitWallet(msisdn, accountId);
  const idempotencyKey = `welcome:${accountId}`;
  if (wallet.welcomeRewardGranted || wallet.processedKeys.includes(idempotencyKey)) {
    return { wallet: toPublicWallet(wallet), grantedNow: false, transaction: null };
  }

  const now = new Date().toISOString();
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
    mode,
    idempotencyKey,
    createdAt: now,
  };

  wallet.balance = nextBalance;
  wallet.welcomeRewardGranted = true;
  wallet.welcomeRewardAt = now;
  wallet.processedKeys.push(idempotencyKey);
  wallet.transactions.unshift(tx);
  wallet.updatedAt = now;
  saveDb();

  return { wallet: toPublicWallet(wallet), grantedNow: true, transaction: tx };
}

export function unlockGameWithTokens(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    mode?: "demo" | "live_bdapps";
    idempotencyKey?: string;
  } = {},
): {
  ok: boolean;
  alreadyUnlocked: boolean;
  insufficientTokens: boolean;
  deducted: number;
  wallet: PublicTokenWallet;
  transaction: TokenTransactionRecord | null;
} {
  const wallet = getOrInitWallet(msisdn, accountId);
  const cost = Math.max(0, opts.cost ?? 2);

  if (!VALID_TRAIL_SET.has(trailId)) {
    return {
      ok: false,
      alreadyUnlocked: false,
      insufficientTokens: false,
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: null,
    };
  }

  if (wallet.unlockedTrailIds.includes(trailId)) {
    return {
      ok: true,
      alreadyUnlocked: true,
      insufficientTokens: false,
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: null,
    };
  }

  const key = opts.idempotencyKey || `unlock:${accountId}:${trailId}`;
  if (wallet.processedKeys.includes(key)) {
    const prevTx = wallet.transactions.find((t) => t.idempotencyKey === key) || null;
    return {
      ok: true,
      alreadyUnlocked: true,
      insufficientTokens: false,
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: prevTx,
    };
  }

  if (wallet.balance < cost) {
    return {
      ok: false,
      alreadyUnlocked: false,
      insufficientTokens: true,
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: null,
    };
  }

  const now = new Date().toISOString();
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
    mode: opts.mode || "demo",
    idempotencyKey: key,
    createdAt: now,
  };

  wallet.balance = nextBalance;
  wallet.unlockedTrailIds.push(trailId);
  wallet.processedKeys.push(key);
  wallet.transactions.unshift(tx);
  wallet.updatedAt = now;
  saveDb();

  return {
    ok: true,
    alreadyUnlocked: false,
    insufficientTokens: false,
    deducted: cost,
    wallet: toPublicWallet(wallet),
    transaction: tx,
  };
}

export function recordMistakePenalty(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    mode?: "demo" | "live_bdapps";
    idempotencyKey?: string;
  } = {},
): {
  deducted: number;
  wallet: PublicTokenWallet;
  transaction: TokenTransactionRecord | null;
} {
  const wallet = getOrInitWallet(msisdn, accountId);
  const requestedCost = Math.max(1, opts.cost ?? 1);
  const key = opts.idempotencyKey || `mistake:${accountId}:${trailId}:${Date.now()}`;

  if (wallet.processedKeys.includes(key)) {
    const existingTx = wallet.transactions.find((t) => t.idempotencyKey === key) || null;
    return {
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: existingTx,
    };
  }

  const actualDeduct = Math.min(wallet.balance, requestedCost);
  wallet.processedKeys.push(key);
  if (wallet.processedKeys.length > 250) {
    wallet.processedKeys = wallet.processedKeys.slice(-200);
  }

  if (actualDeduct <= 0) {
    wallet.updatedAt = new Date().toISOString();
    saveDb();
    return {
      deducted: 0,
      wallet: toPublicWallet(wallet),
      transaction: null,
    };
  }

  const now = new Date().toISOString();
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
    mode: opts.mode || "demo",
    idempotencyKey: key,
    createdAt: now,
  };

  wallet.balance = nextBalance;
  wallet.transactions.unshift(tx);
  wallet.updatedAt = now;
  saveDb();

  return {
    deducted: actualDeduct,
    wallet: toPublicWallet(wallet),
    transaction: tx,
  };
}

export function recordTokenPurchaseTransaction(
  msisdn: string,
  accountId: string,
  opts: {
    packageId: string;
    tokens: number;
    priceBdt: number;
    status: "completed" | "failed";
    mode: "demo" | "live_bdapps";
    idempotencyKey: string;
  },
): {
  duplicate: boolean;
  wallet: PublicTokenWallet;
  transaction: TokenTransactionRecord;
} {
  const wallet = getOrInitWallet(msisdn, accountId);

  const existingTx = wallet.transactions.find((t) => t.idempotencyKey === opts.idempotencyKey);
  if (existingTx) {
    return {
      duplicate: true,
      wallet: toPublicWallet(wallet),
      transaction: existingTx,
    };
  }

  const now = new Date().toISOString();
  const delta = opts.status === "completed" ? opts.tokens : 0;
  const nextBalance = wallet.balance + delta;
  const tx: TokenTransactionRecord = {
    id: `TX-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
    accountId: wallet.accountId,
    type: "token_purchase",
    amount: delta,
    balanceAfter: nextBalance,
    packageId: opts.packageId,
    priceBdt: opts.priceBdt,
    descriptionEn:
      opts.status === "completed"
        ? `Token Shop purchase: +${opts.tokens} Tokens (BDT ${opts.priceBdt})`
        : `Token Shop simulated failure: ${opts.tokens} Tokens (BDT ${opts.priceBdt})`,
    descriptionBn:
      opts.status === "completed"
        ? `টোকেন শপ ক্রয়: +${opts.tokens}টি টোকেন (BDT ${opts.priceBdt})`
        : `টোকেন শপ সিমুলেশন ব্যর্থ: ${opts.tokens}টি টোকেন (BDT ${opts.priceBdt})`,
    status: opts.status,
    mode: opts.mode,
    idempotencyKey: opts.idempotencyKey,
    createdAt: now,
  };

  wallet.balance = nextBalance;
  wallet.processedKeys.push(opts.idempotencyKey);
  wallet.transactions.unshift(tx);
  wallet.updatedAt = now;
  saveDb();

  return {
    duplicate: false,
    wallet: toPublicWallet(wallet),
    transaction: tx,
  };
}
