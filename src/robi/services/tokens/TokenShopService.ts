import { getSubscriberToken } from "../auth/sessionMemory";
import type {
  SmsPreviewNotification,
  TokenPackage,
  TokenTransaction,
  TokenWalletState,
} from "./TokenTransactionService";
import { TOKEN_PACKAGES } from "./TokenTransactionService";
import { writeCachedWallet } from "./TokenWalletService";

export async function fetchTokenShopPackages(): Promise<{
  mode: "demo" | "live_bdapps";
  packages: TokenPackage[];
}> {
  try {
    const res = await fetch("/api/tokens/packages");
    if (!res.ok) throw new Error("Unable to fetch token packages");
    return (await res.json()) as { mode: "demo" | "live_bdapps"; packages: TokenPackage[] };
  } catch {
    return { mode: "demo", packages: [...TOKEN_PACKAGES] };
  }
}

export async function purchaseTokenPackage(
  packageId: string,
  opts: {
    simulateOutcome?: "success" | "failure";
    idempotencyKey?: string;
  } = {},
): Promise<{
  ok: boolean;
  duplicate: boolean;
  wallet: TokenWalletState;
  transaction: TokenTransaction;
  smsPreview: SmsPreviewNotification | null;
  notice?: string;
  mode: "demo" | "live_bdapps";
}> {
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
      simulateOutcome: opts.simulateOutcome || "success",
      userConfirmed: true,
      idempotencyKey,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    duplicate?: boolean;
    wallet: TokenWalletState;
    transaction: TokenTransaction;
    smsPreview?: SmsPreviewNotification | null;
    notice?: string;
    mode?: "demo" | "live_bdapps";
    error?: string;
  };
  if (data.wallet) {
    writeCachedWallet(data.wallet);
  }
  if (!res.ok) {
    const err = new Error(data.error || "Simulated token purchase failed.") as Error & {
      wallet?: TokenWalletState;
      transaction?: TokenTransaction;
    };
    err.wallet = data.wallet;
    err.transaction = data.transaction;
    throw err;
  }
  return {
    ok: Boolean(data.ok),
    duplicate: Boolean(data.duplicate),
    wallet: data.wallet,
    transaction: data.transaction,
    smsPreview: data.smsPreview || null,
    notice: data.notice,
    mode: data.mode || "demo",
  };
}
