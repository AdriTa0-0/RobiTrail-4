import { getSubscriberToken } from "../auth/sessionMemory";
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
  billingChannel: "subscription";
  subscriptionEnabled: boolean;
  phpGatewayConfigured: boolean;
  gatewayReady: boolean;
  gatewayBlockedReason: string | null;
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
      billingChannel: "subscription",
      subscriptionEnabled: Boolean(data.subscriptionEnabled),
      phpGatewayConfigured: Boolean(data.phpGatewayConfigured),
      gatewayReady: Boolean(data.gatewayReady),
      gatewayBlockedReason: data.gatewayBlockedReason || null,
      packages:
        Array.isArray(data.packages) && data.packages.length > 0
          ? data.packages
          : [...TOKEN_PACKAGES],
    };
  } catch {
    return {
      mode: "demo",
      billingChannel: "subscription",
      subscriptionEnabled: false,
      phpGatewayConfigured: false,
      gatewayReady: false,
      gatewayBlockedReason: "Unable to verify bdapps Subscription gateway status.",
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
      consentAccepted: opts.consentAccepted !== false,
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
      data.error || "bdapps Subscription gateway could not complete this token purchase.",
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
    throw new Error(data.error || "Unable to verify bdapps subscription confirmation status.");
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
