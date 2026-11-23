import { getSubscriberToken } from "../auth/sessionMemory";
import type { TokenPackage, TokenTransaction, TokenWalletState } from "./TokenTransactionService";

const WALLET_CACHE_KEY_PREFIX = "robitrail_token_wallet_cache_v1_";

export function readCachedWallet(accountId: string): TokenWalletState | null {
  try {
    const raw = localStorage.getItem(`${WALLET_CACHE_KEY_PREFIX}${accountId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenWalletState>;
    if (!parsed || parsed.accountId !== accountId || typeof parsed.balance !== "number") {
      return null;
    }
    return {
      accountId: parsed.accountId,
      balance: Math.max(0, parsed.balance),
      welcomeRewardGranted: Boolean(parsed.welcomeRewardGranted),
      welcomeRewardAt: parsed.welcomeRewardAt || null,
      unlockedTrailIds: Array.isArray(parsed.unlockedTrailIds) ? parsed.unlockedTrailIds : [],
      totalUnlockedGames: Array.isArray(parsed.unlockedTrailIds)
        ? parsed.unlockedTrailIds.length
        : 0,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCachedWallet(wallet: TokenWalletState | null): void {
  if (!wallet) return;
  try {
    localStorage.setItem(`${WALLET_CACHE_KEY_PREFIX}${wallet.accountId}`, JSON.stringify(wallet));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCachedWallet(accountId?: string): void {
  if (!accountId) return;
  try {
    localStorage.removeItem(`${WALLET_CACHE_KEY_PREFIX}${accountId}`);
  } catch {
    // Ignore storage errors
  }
}

export async function fetchWalletFromServer(): Promise<{
  mode: "demo" | "live_bdapps";
  wallet: TokenWalletState;
  packages: TokenPackage[];
}> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Authentication required");
  const res = await fetch("/api/tokens/wallet", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    mode: "demo" | "live_bdapps";
    wallet: TokenWalletState;
    packages: TokenPackage[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Unable to load token wallet");
  writeCachedWallet(data.wallet);
  return data;
}

export async function unlockTrailOnServer(
  trailId: string,
  meta: { titleEn?: string; titleBn?: string; idempotencyKey?: string } = {},
): Promise<{
  unlocked: boolean;
  alreadyUnlocked: boolean;
  deducted: number;
  wallet: TokenWalletState;
  transaction: TokenTransaction | null;
}> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Please sign in first to unlock missions.");
  const res = await fetch("/api/tokens/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      trailId,
      trailTitleEn: meta.titleEn,
      trailTitleBn: meta.titleBn,
      idempotencyKey: meta.idempotencyKey,
    }),
  });
  const data = (await res.json()) as {
    unlocked?: boolean;
    alreadyUnlocked?: boolean;
    insufficientTokens?: boolean;
    deducted?: number;
    wallet: TokenWalletState;
    transaction: TokenTransaction | null;
    error?: string;
  };
  if (!res.ok) {
    const err = new Error(data.error || "Unable to unlock mission") as Error & {
      insufficientTokens?: boolean;
      wallet?: TokenWalletState;
    };
    err.insufficientTokens = Boolean(data.insufficientTokens);
    err.wallet = data.wallet;
    throw err;
  }
  writeCachedWallet(data.wallet);
  return {
    unlocked: Boolean(data.unlocked),
    alreadyUnlocked: Boolean(data.alreadyUnlocked),
    deducted: data.deducted || 0,
    wallet: data.wallet,
    transaction: data.transaction,
  };
}

export async function deductMistakeTokenOnServer(
  trailId: string,
  meta: { titleEn?: string; titleBn?: string; idempotencyKey?: string } = {},
): Promise<{
  deducted: number;
  wallet: TokenWalletState;
  transaction: TokenTransaction | null;
}> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch("/api/tokens/mistake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      trailId,
      trailTitleEn: meta.titleEn,
      trailTitleBn: meta.titleBn,
      idempotencyKey: meta.idempotencyKey,
    }),
  });
  const data = (await res.json()) as {
    deducted: number;
    wallet: TokenWalletState;
    transaction: TokenTransaction | null;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Unable to record mistake deduction");
  writeCachedWallet(data.wallet);
  return data;
}
