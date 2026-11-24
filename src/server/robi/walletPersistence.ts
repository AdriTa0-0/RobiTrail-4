import {
  deleteAccountAndSubscription,
  getAccount,
  getOrInitWallet,
  getSubscription,
  grantWelcomeTokensOnce,
  recordMistakePenalty,
  recordTokenPurchaseTransaction,
  saveSubscription,
  saveCertificate,
  getCertificate,
  type CertificateRecord,
  toPublicWallet,
  unlockGameWithTokens,
  upsertAccount,
  type PlayerAccountRecord,
  type PublicTokenWallet,
  type SubscriptionRecord,
  type TokenTransactionRecord,
} from "./dbStore";
import {
  fsCreatePendingPurchase,
  fsDeleteAccountData,
  fsGetAccount,
  fsGetOrInitWallet,
  fsGetSubscription,
  fsGrantWelcomeTokensOnce,
  fsRecordMistakePenalty,
  fsSaveSubscription,
  fsSettlePurchaseTransaction,
  fsUnlockGameWithTokens,
  fsUpsertAccount,
  isFirestorePersistenceConfigured,
  fsSaveCertificate,
  fsGetCertificate,
  type TokenPurchaseOrderRecord,
} from "./firestoreWalletStore";
import { getPhpGatewayConfig } from "./phpGatewayClient";

export function isProductionMode(): boolean {
  return (process.env as Record<string, string | undefined>).BDAPPS_MODE === "production";
}

export function getPersistenceBackend(): "memory_preview" | "firestore" | "firestore_unconfigured" {
  if (!isProductionMode()) {
    return "memory_preview";
  }
  return isFirestorePersistenceConfigured() ? "firestore" : "firestore_unconfigured";
}

export function getLiveChargingGateStatus(): { allowed: boolean; reason: string | null } {
  const phpCfg = getPhpGatewayConfig();
  if (!isProductionMode()) {
    return { allowed: false, reason: "Preview Mode is active; live charging is disabled." };
  }
  if (!phpCfg.liveChargingEnabled) {
    return {
      allowed: false,
      reason: "BDAPPS_LIVE_CHARGING_ENABLED is not set to true; awaiting bdapps approval.",
    };
  }
  if (!phpCfg.configured) {
    return {
      allowed: false,
      reason: "PHP gateway URL or shared secret is not configured.",
    };
  }
  if (!isFirestorePersistenceConfigured()) {
    return {
      allowed: false,
      reason:
        "Firestore server persistence is not configured; in-memory dbStore is never allowed for production paid tokens.",
    };
  }
  return { allowed: true, reason: null };
}

function assertProductionPersistenceReady(): void {
  if (isProductionMode() && !isFirestorePersistenceConfigured()) {
    throw new Error(
      "Production Firestore persistence is not configured. In-memory dbStore cannot be used as the production source of truth.",
    );
  }
}

export async function loadAccount(msisdn: string): Promise<PlayerAccountRecord | null> {
  if (!isProductionMode()) {
    return getAccount(msisdn);
  }
  assertProductionPersistenceReady();
  return fsGetAccount(msisdn);
}

export async function saveOrUpdateAccount(
  msisdn: string,
  maskedPhone: string,
  opts: {
    displayName?: string;
    completedTrailIds?: string[];
    certificateIds?: string[];
    preferredLang?: "en" | "bn";
    preferredCityId?: "chattogram" | "dhaka" | "sylhet";
  } = {},
): Promise<PlayerAccountRecord> {
  if (!isProductionMode()) {
    return upsertAccount(msisdn, maskedPhone, opts);
  }
  assertProductionPersistenceReady();
  return fsUpsertAccount(msisdn, maskedPhone, opts);
}

export async function loadOrInitWallet(
  msisdn: string,
  accountId: string,
): Promise<PublicTokenWallet> {
  if (!isProductionMode()) {
    return toPublicWallet(getOrInitWallet(msisdn, accountId));
  }
  assertProductionPersistenceReady();
  return fsGetOrInitWallet(msisdn, accountId);
}

export async function grantWelcomeTokensIdempotent(
  msisdn: string,
  accountId: string,
): Promise<{
  wallet: PublicTokenWallet;
  grantedNow: boolean;
  transaction: TokenTransactionRecord | null;
}> {
  if (!isProductionMode()) {
    return grantWelcomeTokensOnce(msisdn, accountId, "demo");
  }
  assertProductionPersistenceReady();
  return fsGrantWelcomeTokensOnce(msisdn, accountId);
}

export async function unlockTrailWithTokensIdempotent(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    idempotencyKey?: string;
  } = {},
) {
  if (!isProductionMode()) {
    return unlockGameWithTokens(msisdn, accountId, trailId, { ...opts, mode: "demo" });
  }
  assertProductionPersistenceReady();
  return fsUnlockGameWithTokens(msisdn, accountId, trailId, opts);
}

export async function recordMistakePenaltyIdempotent(
  msisdn: string,
  accountId: string,
  trailId: string,
  opts: {
    cost?: number;
    trailTitleEn?: string;
    trailTitleBn?: string;
    idempotencyKey?: string;
  } = {},
) {
  if (!isProductionMode()) {
    return recordMistakePenalty(msisdn, accountId, trailId, { ...opts, mode: "demo" });
  }
  assertProductionPersistenceReady();
  return fsRecordMistakePenalty(msisdn, accountId, trailId, opts);
}

export async function recordPreviewTokenPurchase(
  msisdn: string,
  accountId: string,
  opts: {
    packageId: string;
    tokens: number;
    priceBdt: number;
    status: "completed" | "failed";
    idempotencyKey: string;
  },
) {
  return recordTokenPurchaseTransaction(msisdn, accountId, { ...opts, mode: "demo" });
}

export async function createLivePendingPurchase(
  msisdn: string,
  accountId: string,
  opts: {
    externalTrxId: string;
    packageId: string;
    tokens: number;
    priceBdt: number;
  },
): Promise<{
  duplicate: boolean;
  purchase: TokenPurchaseOrderRecord;
  wallet: PublicTokenWallet;
}> {
  assertProductionPersistenceReady();
  return fsCreatePendingPurchase(msisdn, accountId, opts);
}

export async function settleLivePurchase(
  externalTrxId: string,
  outcome: "confirmed" | "failed",
  meta: {
    providerStatusCode?: string;
    providerStatusDetail?: string;
    callbackMsisdn?: string;
    callbackAmountBdt?: string;
    callbackCurrency?: string;
  } = {},
) {
  assertProductionPersistenceReady();
  return fsSettlePurchaseTransaction(externalTrxId, outcome, meta);
}

export async function loadSubscription(msisdn: string): Promise<SubscriptionRecord | null> {
  if (!isProductionMode()) {
    return getSubscription(msisdn);
  }
  assertProductionPersistenceReady();
  return fsGetSubscription(msisdn);
}

export async function persistSubscription(record: SubscriptionRecord): Promise<SubscriptionRecord> {
  if (!isProductionMode()) {
    return saveSubscription(record);
  }
  assertProductionPersistenceReady();
  return fsSaveSubscription(record);
}

export async function deleteAccountData(msisdn: string): Promise<boolean> {
  if (!isProductionMode()) {
    return deleteAccountAndSubscription(msisdn);
  }
  assertProductionPersistenceReady();
  return fsDeleteAccountData(msisdn);
}

/** Same certificate backing store as accounts: Firestore in production, RAM preview only. */
export async function persistCertificate(record: CertificateRecord): Promise<CertificateRecord> {
  if (!isProductionMode()) return saveCertificate(record);
  assertProductionPersistenceReady();
  return fsSaveCertificate(record);
}

export async function loadCertificate(id: string): Promise<CertificateRecord | null> {
  if (!isProductionMode()) return getCertificate(id);
  assertProductionPersistenceReady();
  return fsGetCertificate(id);
}
