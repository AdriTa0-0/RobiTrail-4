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
  type PlayerAuthMethod,
  type PublicTokenWallet,
  type SubscriptionRecord,
  type TokenTransactionRecord,
} from "./dbStore";
import {
  fsCreatePendingPurchase,
  fsDeleteAccountData,
  fsGetAccount,
  fsGetOrInitWallet,
  fsGetPurchaseOrder,
  fsGetSubscription,
  fsGrantWelcomeTokensOnce,
  fsRecordMistakePenalty,
  fsSaveSubscription,
  fsSettlePendingSubscriptionPurchaseForMsisdn,
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

export function shouldUseFirestorePersistence(): boolean {
  return isFirestorePersistenceConfigured();
}

export function getPersistenceBackend(): "memory_preview" | "firestore" | "firestore_unconfigured" {
  if (isFirestorePersistenceConfigured()) {
    return "firestore";
  }
  return isProductionMode() ? "firestore_unconfigured" : "memory_preview";
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

export function getLiveSubscriptionGateStatus(): { allowed: boolean; reason: string | null } {
  const phpCfg = getPhpGatewayConfig();
  if (!isProductionMode()) {
    return {
      allowed: false,
      reason: "Live bdapps Subscription API is unavailable: BDAPPS_MODE is not set to production.",
    };
  }
  if (!phpCfg.subscriptionEnabled) {
    return {
      allowed: false,
      reason:
        "Live bdapps Subscription API is disabled: BDAPPS_SUBSCRIPTION_ENABLED is not set to true.",
    };
  }
  if (!phpCfg.configured) {
    return {
      allowed: false,
      reason:
        "PHP gateway is not configured: set BDAPPS_PHP_BASE_URL and PHP_GATEWAY_SHARED_SECRET.",
    };
  }
  if (!isFirestorePersistenceConfigured()) {
    return {
      allowed: false,
      reason:
        "Production wallet persistence is not configured: set FIREBASE_SERVICE_ACCOUNT_JSON or FIRESTORE_USE_METADATA_ADC.",
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
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsGetAccount(msisdn);
  }
  return getAccount(msisdn);
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
    authMethod?: PlayerAuthMethod;
    recordLogin?: boolean;
  } = {},
): Promise<PlayerAccountRecord> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsUpsertAccount(msisdn, maskedPhone, opts);
  }
  return upsertAccount(msisdn, maskedPhone, opts);
}

export async function loadOrInitWallet(
  msisdn: string,
  accountId: string,
): Promise<PublicTokenWallet> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsGetOrInitWallet(msisdn, accountId);
  }
  return toPublicWallet(getOrInitWallet(msisdn, accountId));
}

export async function grantWelcomeTokensIdempotent(
  msisdn: string,
  accountId: string,
): Promise<{
  wallet: PublicTokenWallet;
  grantedNow: boolean;
  transaction: TokenTransactionRecord | null;
}> {
  assertProductionPersistenceReady();
  const txMode = isProductionMode() ? "live_bdapps" : "demo";
  if (shouldUseFirestorePersistence()) {
    return fsGrantWelcomeTokensOnce(msisdn, accountId, { mode: txMode });
  }
  return grantWelcomeTokensOnce(msisdn, accountId, txMode);
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
  assertProductionPersistenceReady();
  const txMode = isProductionMode() ? "live_bdapps" : "demo";
  if (shouldUseFirestorePersistence()) {
    return fsUnlockGameWithTokens(msisdn, accountId, trailId, { ...opts, mode: txMode });
  }
  return unlockGameWithTokens(msisdn, accountId, trailId, { ...opts, mode: txMode });
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
  assertProductionPersistenceReady();
  const txMode = isProductionMode() ? "live_bdapps" : "demo";
  if (shouldUseFirestorePersistence()) {
    return fsRecordMistakePenalty(msisdn, accountId, trailId, { ...opts, mode: txMode });
  }
  return recordMistakePenalty(msisdn, accountId, trailId, { ...opts, mode: txMode });
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
    billingChannel?: "subscription" | "caas";
  },
): Promise<{
  duplicate: boolean;
  purchase: TokenPurchaseOrderRecord;
  wallet: PublicTokenWallet;
}> {
  assertProductionPersistenceReady();
  return fsCreatePendingPurchase(msisdn, accountId, opts);
}

export async function getLivePurchaseOrder(externalTrxId: string) {
  assertProductionPersistenceReady();
  return fsGetPurchaseOrder(externalTrxId);
}

export async function settlePendingSubscriptionPurchaseForMsisdn(
  msisdn: string,
  outcome: "confirmed" | "failed",
  meta: {
    providerStatusCode?: string;
    providerStatusDetail?: string;
  } = {},
) {
  assertProductionPersistenceReady();
  return fsSettlePendingSubscriptionPurchaseForMsisdn(msisdn, outcome, meta);
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
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsGetSubscription(msisdn);
  }
  return getSubscription(msisdn);
}

export async function persistSubscription(record: SubscriptionRecord): Promise<SubscriptionRecord> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsSaveSubscription(record);
  }
  return saveSubscription(record);
}

export async function deleteAccountData(msisdn: string): Promise<boolean> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) {
    return fsDeleteAccountData(msisdn);
  }
  return deleteAccountAndSubscription(msisdn);
}

/** Same certificate backing store as accounts: Firestore whenever configured, RAM preview fallback otherwise. */
export async function persistCertificate(record: CertificateRecord): Promise<CertificateRecord> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) return fsSaveCertificate(record);
  return saveCertificate(record);
}

export async function loadCertificate(id: string): Promise<CertificateRecord | null> {
  assertProductionPersistenceReady();
  if (shouldUseFirestorePersistence()) return fsGetCertificate(id);
  return getCertificate(id);
}
