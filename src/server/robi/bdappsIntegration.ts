// Server-only bdapps integration boundary for APP_140847.
// Routes all carrier SMS and CaaS calls through the signed PHP gateway (`bdapps-php/`).
// Never import credentials or dispatch secrets into browser code.

import {
  chargeCaasViaPhpGateway,
  getPhpGatewayConfig,
  sendSmsViaPhpGateway,
} from "./phpGatewayClient";
import { getLiveChargingGateStatus, getPersistenceBackend } from "./walletPersistence";

export interface TokenShopPackage {
  packageId: string;
  tokens: number;
  priceBdt: number;
  labelEn: string;
  labelBn: string;
}

export const TOKEN_SHOP_PACKAGES: readonly TokenShopPackage[] = [
  { packageId: "pkg-6", tokens: 6, priceBdt: 2, labelEn: "6 Tokens", labelBn: "৬টি টোকেন" },
  { packageId: "pkg-10", tokens: 10, priceBdt: 7, labelEn: "10 Tokens", labelBn: "১০টি টোকেন" },
  { packageId: "pkg-15", tokens: 15, priceBdt: 10, labelEn: "15 Tokens", labelBn: "১৫টি টোকেন" },
  { packageId: "pkg-20", tokens: 20, priceBdt: 17, labelEn: "20 Tokens", labelBn: "২০টি টোকেন" },
  { packageId: "pkg-25", tokens: 25, priceBdt: 22, labelEn: "25 Tokens", labelBn: "২৫টি টোকেন" },
  { packageId: "pkg-31", tokens: 31, priceBdt: 26, labelEn: "31 Tokens", labelBn: "৩১টি টোকেন" },
] as const;

export function getTokenPackageById(packageId: string): TokenShopPackage | null {
  return TOKEN_SHOP_PACKAGES.find((p) => p.packageId === packageId) || null;
}

export interface BdappsRuntimeConfig {
  appId: string;
  apiSecretConfigured: boolean;
  phpGatewayConfigured: boolean;
  baseUrl: string;
  shortCode: string;
  mode: "preview" | "production";
  liveChargingEnabled: boolean;
  liveChargingBlockedReason: string | null;
  subscriptionEnabled: boolean;
  persistenceBackend: "memory_preview" | "firestore" | "firestore_unconfigured";
}

export function getBdappsRuntimeConfig(): BdappsRuntimeConfig {
  const env = process.env as Record<string, string | undefined>;
  const phpCfg = getPhpGatewayConfig();
  const appId = env.BDAPPS_APP_ID || "APP_140847";
  const apiSecret = env.BDAPPS_API_SECRET || "";
  const baseUrl = env.BDAPPS_BASE_URL || "https://developer.bdapps.com";
  const shortCode = env.BDAPPS_SHORTCODE || "21213";
  const mode: "preview" | "production" =
    env.BDAPPS_MODE === "production" ? "production" : "preview";
  const gate = getLiveChargingGateStatus();

  return {
    appId,
    apiSecretConfigured: Boolean(apiSecret),
    phpGatewayConfigured: phpCfg.configured,
    baseUrl,
    shortCode,
    mode,
    liveChargingEnabled: gate.allowed,
    liveChargingBlockedReason: gate.reason,
    subscriptionEnabled: phpCfg.subscriptionEnabled,
    persistenceBackend: getPersistenceBackend(),
  };
}

export type SmsNotificationEvent =
  | "registration_confirmation"
  | "welcome_tokens_reward"
  | "token_purchase_confirmation"
  | "subscription_confirmation";

export interface SmsDispatchResult {
  event: SmsNotificationEvent;
  mode: "demo" | "live_bdapps";
  deliveredLive: boolean;
  maskedMsisdn: string;
  messageEn: string;
  messageBn: string;
  notice: string;
}

export function buildSmsNotificationPreview(
  event: SmsNotificationEvent,
  maskedMsisdn: string,
  meta: { tokens?: number; priceBdt?: number; balanceAfter?: number } = {},
): SmsDispatchResult {
  const cfg = getBdappsRuntimeConfig();
  let messageEn = "";
  let messageBn = "";

  if (event === "registration_confirmation") {
    messageEn = `RobiTrail: Welcome! Mobile ${maskedMsisdn} is verified. Enjoy exploring telecom trails.`;
    messageBn = `রবিট্রেইল: স্বাগতম! আপনার ${maskedMsisdn} নম্বর যাচাই সম্পন্ন হয়েছে।`;
  } else if (event === "welcome_tokens_reward") {
    const qty = meta.tokens ?? 10;
    messageEn = `RobiTrail: You received +${qty} Welcome Tokens! Current wallet balance: ${meta.balanceAfter ?? qty} Tokens.`;
    messageBn = `রবিট্রেইল: আপনি +${qty}টি স্বাগতম টোকেন পেয়েছেন! বর্তমান ব্যালেন্স: ${meta.balanceAfter ?? qty} টোকেন।`;
  } else if (event === "token_purchase_confirmation") {
    messageEn = `RobiTrail Token Shop: +${meta.tokens ?? 0} Tokens (${meta.priceBdt ?? 0} BDT) added. Balance: ${meta.balanceAfter ?? 0} Tokens.`;
    messageBn = `রবিট্রেইল টোকেন শপ: +${meta.tokens ?? 0}টি টোকেন (${meta.priceBdt ?? 0} টাকা) যোগ হয়েছে। ব্যালেন্স: ${meta.balanceAfter ?? 0}।`;
  } else {
    messageEn = `RobiTrail notification sent for ${maskedMsisdn}.`;
    messageBn = `${maskedMsisdn} নম্বরের জন্য রবিট্রেইল নোটিফিকেশন পাঠানো হয়েছে।`;
  }

  return {
    event,
    mode: cfg.mode === "production" ? "live_bdapps" : "demo",
    deliveredLive: false,
    maskedMsisdn,
    messageEn,
    messageBn,
    notice:
      cfg.mode === "production"
        ? `Prepared for bdapps ${cfg.appId} via PHP SMS gateway.`
        : "Demo Simulation: SMS template prepared locally (no live carrier SMS sent).",
  };
}

export async function dispatchBdappsSmsNotification(
  msisdn: string,
  maskedMsisdn: string,
  event: SmsNotificationEvent,
  meta: { tokens?: number; priceBdt?: number; balanceAfter?: number } = {},
  fetcher?: typeof fetch,
): Promise<SmsDispatchResult> {
  const preview = buildSmsNotificationPreview(event, maskedMsisdn, meta);
  const cfg = getBdappsRuntimeConfig();

  if (cfg.mode !== "production" || !cfg.phpGatewayConfigured) {
    return preview;
  }

  const res = await sendSmsViaPhpGateway(msisdn, preview.messageEn, fetcher);
  const delivered = Boolean(res.ok && res.data?.deliveredLive);

  return {
    ...preview,
    deliveredLive: delivered,
    notice: delivered
      ? `Dispatched via PHP bdapps gateway (${cfg.appId}).`
      : res.error || "PHP bdapps SMS gateway did not confirm live delivery.",
  };
}

export interface CaasChargeResult {
  ok: boolean;
  blocked?: boolean;
  txState: "pending" | "confirmed" | "failed";
  mode: "demo" | "live_bdapps";
  externalTransactionId: string;
  statusCode?: string;
  notice: string;
}

export async function executeBdappsCaasCharge(
  msisdn: string,
  pkg: TokenShopPackage,
  idempotencyKey: string,
  simulateOutcome: "success" | "failure" = "success",
  opts: { userConfirmed?: boolean; fetcher?: typeof fetch } = {},
): Promise<CaasChargeResult> {
  const cfg = getBdappsRuntimeConfig();

  if (cfg.mode !== "production") {
    if (simulateOutcome === "failure") {
      return {
        ok: false,
        txState: "failed",
        mode: "demo",
        externalTransactionId: `SIM-FAIL-${idempotencyKey.slice(-8).toUpperCase()}`,
        statusCode: "PREVIEW_FAILURE",
        notice: "Payment Simulation Failed: No tokens credited and zero real balance deducted.",
      };
    }
    return {
      ok: true,
      txState: "confirmed",
      mode: "demo",
      externalTransactionId: `SIM-CAAS-${idempotencyKey.slice(-8).toUpperCase()}`,
      statusCode: "PREVIEW_SUCCESS",
      notice: "Payment Simulation — No real balance was deducted.",
    };
  }

  // Production Safety Lock: Never charge live balance unless PHP gateway, persistence,
  // explicit user confirmation, and BDAPPS_LIVE_CHARGING_ENABLED=true are all verified.
  if (!cfg.liveChargingEnabled) {
    return {
      ok: false,
      blocked: true,
      txState: "failed",
      mode: "live_bdapps",
      externalTransactionId: idempotencyKey,
      statusCode: "LIVE_CHARGING_DISABLED",
      notice:
        cfg.liveChargingBlockedReason || "Live CaaS charging is disabled pending bdapps approval.",
    };
  }

  if (opts.userConfirmed !== true) {
    return {
      ok: false,
      blocked: true,
      txState: "failed",
      mode: "live_bdapps",
      externalTransactionId: idempotencyKey,
      statusCode: "USER_CONFIRMATION_REQUIRED",
      notice: "Explicit user confirmation is required before charging.",
    };
  }

  const res = await chargeCaasViaPhpGateway(
    {
      msisdn,
      packageId: pkg.packageId,
      tokens: pkg.tokens,
      priceBdt: pkg.priceBdt,
      externalTrxId: idempotencyKey,
      userConfirmed: true,
    },
    opts.fetcher,
  );

  const txState: "pending" | "confirmed" | "failed" =
    res.data?.txState === "confirmed"
      ? "confirmed"
      : res.data?.txState === "pending"
        ? "pending"
        : "failed";

  return {
    ok: res.ok && txState !== "failed",
    blocked: Boolean(res.data?.blocked),
    txState,
    mode: "live_bdapps",
    externalTransactionId: String(res.data?.externalTrxId || idempotencyKey),
    statusCode: typeof res.data?.statusCode === "string" ? res.data.statusCode : undefined,
    notice:
      typeof res.data?.statusDetail === "string" && res.data.statusDetail
        ? res.data.statusDetail
        : res.error ||
          (txState === "pending"
            ? "Awaiting bdapps charging confirmation."
            : "CaaS request declined."),
  };
}
