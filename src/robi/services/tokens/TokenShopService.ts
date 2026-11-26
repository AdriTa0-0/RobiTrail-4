import { getSubscriberToken, setSubscriberToken } from "../auth/sessionMemory";
import type {
  SmsPreviewNotification,
  TokenPackage,
  TokenTransaction,
  TokenWalletState,
} from "./TokenTransactionService";
import { TOKEN_PACKAGES } from "./TokenTransactionService";
import { writeCachedWallet } from "./TokenWalletService";

export interface TokenShopPackagesResponse {
  mode: "demo" | "live_bdapps";
  billingChannel: "caas";
  subscriptionEnabled: boolean;
  subscriptionTermsText: string;
  phpGatewayConfigured: boolean;
  gatewayReady: boolean;
  gatewayBlockedReason: string | null;
  otpRequestReady: boolean;
  otpBlockedReason: string | null;
  freeSubscriptionVerifyReady: boolean;
  packages: TokenPackage[];
}

export interface TokenPurchaseResponse {
  ok: boolean;
  duplicate: boolean;
  pendingConfirmation: boolean;
  status: "confirmed" | "pending" | "failed";
  externalTrxId: string | null;
  wallet: TokenWalletState | null;
  transaction: TokenTransaction | null;
  smsPreview: SmsPreviewNotification | null;
  notice?: string;
  mode: "demo" | "live_bdapps";
}

export async function fetchTokenShopPackages(): Promise<TokenShopPackagesResponse> {
  try {
    const res = await fetch("/api/tokens/packages");
    if (!res.ok) throw new Error("Unable to fetch token packages");
    const data = (await res.json()) as Partial<TokenShopPackagesResponse>;
    return {
      mode: data.mode || "demo",
      billingChannel: "caas",
      subscriptionEnabled: Boolean(data.subscriptionEnabled),
      subscriptionTermsText: typeof data.subscriptionTermsText === "string" ? data.subscriptionTermsText : "",
      phpGatewayConfigured: Boolean(data.phpGatewayConfigured),
      gatewayReady: Boolean(data.gatewayReady),
      gatewayBlockedReason: data.gatewayBlockedReason || null,
      otpRequestReady: Boolean(data.otpRequestReady),
      otpBlockedReason: data.otpBlockedReason || null,
      freeSubscriptionVerifyReady: Boolean(data.freeSubscriptionVerifyReady),
      packages:
        Array.isArray(data.packages) && data.packages.length > 0
          ? data.packages
          : [...TOKEN_PACKAGES],
    };
  } catch {
    return {
      mode: "demo",
      billingChannel: "caas",
      subscriptionEnabled: false,
      subscriptionTermsText: "",
      phpGatewayConfigured: false,
      gatewayReady: false,
      gatewayBlockedReason: "Unable to verify bdapps Subscription gateway status.",
      otpRequestReady: false,
      otpBlockedReason: "Unable to verify bdapps OTP gateway status.",
      freeSubscriptionVerifyReady: false,
      packages: [...TOKEN_PACKAGES],
    };
  }
}

export async function purchaseTokenPackage(
  packageId: string,
  opts: {
    idempotencyKey?: string;
    consentAccepted?: boolean;
  } = {},
): Promise<TokenPurchaseResponse> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Please sign in or create an account before buying tokens.");
  if (opts.consentAccepted !== true) throw new Error("Confirm the one-time mobile-balance charge first.");
  const idempotencyKey =
    opts.idempotencyKey ||
    `shop:${packageId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  const res = await fetch("/api/tokens/shop/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      packageId,
      userConfirmed: true,
      consentAccepted: opts.consentAccepted === true,
      idempotencyKey,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    duplicate?: boolean;
    pendingConfirmation?: boolean;
    status?: "confirmed" | "pending" | "failed";
    externalTrxId?: string;
    wallet?: TokenWalletState;
    transaction?: TokenTransaction | null;
    smsPreview?: SmsPreviewNotification | null;
    notice?: string;
    mode?: "demo" | "live_bdapps";
    error?: string;
    blocked?: boolean;
  };
  if (data.wallet) {
    writeCachedWallet(data.wallet);
  }
  if (!res.ok) {
    const err = new Error(
      data.error || "bdapps CaaS gateway could not complete this token purchase.",
    ) as Error & {
      wallet?: TokenWalletState;
      transaction?: TokenTransaction | null;
      blocked?: boolean;
      status?: string;
    };
    err.wallet = data.wallet;
    err.transaction = data.transaction || null;
    err.blocked = Boolean(data.blocked);
    err.status = data.status;
    throw err;
  }
  const pendingConfirmation = Boolean(data.pendingConfirmation) || res.status === 202;
  return {
    ok: Boolean(data.ok),
    duplicate: Boolean(data.duplicate),
    pendingConfirmation,
    status: data.status || (pendingConfirmation ? "pending" : "confirmed"),
    externalTrxId: data.externalTrxId || null,
    wallet: data.wallet || null,
    transaction: data.transaction || null,
    smsPreview: data.smsPreview || null,
    notice: data.notice,
    mode: data.mode || "live_bdapps",
  };
}

export async function checkTokenPurchaseStatus(
  externalTrxId: string,
): Promise<TokenPurchaseResponse> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Please sign in to check subscription status.");
  const res = await fetch(
    `/api/tokens/shop/status?externalTrxId=${encodeURIComponent(externalTrxId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    pendingConfirmation?: boolean;
    status?: "confirmed" | "pending" | "failed";
    externalTrxId?: string;
    wallet?: TokenWalletState;
    transaction?: TokenTransaction | null;
    smsPreview?: SmsPreviewNotification | null;
    notice?: string;
    mode?: "demo" | "live_bdapps";
    error?: string;
  };
  if (data.wallet) {
    writeCachedWallet(data.wallet);
  }
  if (!res.ok) {
    throw new Error(data.error || "Unable to verify bdapps CaaS payment status.");
  }
  const pendingConfirmation = Boolean(data.pendingConfirmation) || res.status === 202;
  return {
    ok: Boolean(data.ok),
    duplicate: false,
    pendingConfirmation,
    status: data.status || (pendingConfirmation ? "pending" : "confirmed"),
    externalTrxId: data.externalTrxId || externalTrxId,
    wallet: data.wallet || null,
    transaction: data.transaction || null,
    smsPreview: data.smsPreview || null,
    notice: data.notice,
    mode: data.mode || "live_bdapps",
  };
}

// Provider-managed subscription OTP. Never generate or store a frontend OTP code.
// The signed-in phone number is checked again on the server.
async function checkoutPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Please sign in with your RobiTrail account first.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "bdapps request was not successful.");
  return data;
}

export async function requestTokenCheckoutOtp(phoneNumber: string): Promise<{
  referenceNo: string;
  maskedNumber: string;
  notice?: string;
}> {
  return checkoutPost("/api/bdapps/subscription/otp/request", {
    purpose: "free_subscription", phoneNumber,
    consentAccepted: true, termsAccepted: true,
  });
}

export async function verifyTokenCheckoutOtp(referenceNo: string, otp: string): Promise<{
  verified: boolean;
  subscriptionActive: boolean;
  notice?: string;
}> {
  const result = await checkoutPost<{
    verified: boolean;
    subscriptionActive: boolean;
    token?: string;
    notice?: string;
  }>("/api/bdapps/subscription/otp/verify", {
    purpose: "free_subscription", referenceNo, otp,
    consentAccepted: true, termsAccepted: true,
  });
  // Provider verification upgrades the existing account's authenticated bearer token.
  if (result.verified && result.token) setSubscriberToken(result.token);
  return result;
}
