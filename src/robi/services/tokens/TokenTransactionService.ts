export type TokenTransactionType =
  "welcome_reward" | "game_unlock" | "mistake_penalty" | "token_purchase" | "admin_adjustment";

export interface TokenTransaction {
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

export interface TokenWalletState {
  accountId: string;
  balance: number;
  welcomeRewardGranted: boolean;
  welcomeRewardAt: string | null;
  unlockedTrailIds: string[];
  totalUnlockedGames: number;
  transactions: TokenTransaction[];
  updatedAt: string;
}

export interface TokenPackage {
  packageId: string;
  tokens: number;
  priceBdt: number;
  labelEn: string;
  labelBn: string;
}

export interface SmsPreviewNotification {
  event: string;
  mode: "demo" | "live_bdapps";
  deliveredLive: boolean;
  maskedMsisdn: string;
  messageEn: string;
  messageBn: string;
  notice: string;
}

export const TOKEN_PACKAGES: readonly TokenPackage[] = [
  { packageId: "pkg-6", tokens: 6, priceBdt: 2, labelEn: "6 Tokens", labelBn: "৬টি টোকেন" },
  { packageId: "pkg-10", tokens: 10, priceBdt: 7, labelEn: "10 Tokens", labelBn: "১০টি টোকেন" },
  { packageId: "pkg-15", tokens: 15, priceBdt: 10, labelEn: "15 Tokens", labelBn: "১৫টি টোকেন" },
  { packageId: "pkg-20", tokens: 20, priceBdt: 17, labelEn: "20 Tokens", labelBn: "২০টি টোকেন" },
  { packageId: "pkg-25", tokens: 25, priceBdt: 22, labelEn: "25 Tokens", labelBn: "২৫টি টোকেন" },
  { packageId: "pkg-31", tokens: 31, priceBdt: 26, labelEn: "31 Tokens", labelBn: "৩১টি টোকেন" },
] as const;

export function getTransactionTypeLabel(type: TokenTransactionType, lang: "en" | "bn"): string {
  switch (type) {
    case "welcome_reward":
      return lang === "bn" ? "স্বাগতম পুরস্কার" : "Welcome Reward";
    case "game_unlock":
      return lang === "bn" ? "গেম আনলক" : "Game Unlock";
    case "mistake_penalty":
      return lang === "bn" ? "ভুল জনিত কর্তন" : "Mistake Deduction";
    case "token_purchase":
      return lang === "bn" ? "টোকেন ক্রয়" : "Token Purchase";
    case "admin_adjustment":
      return lang === "bn" ? "ব্যালেন্স সমন্বয়" : "Adjustment";
  }
}

export function filterTransactionsByCategory(
  transactions: TokenTransaction[],
  filter: "all" | TokenTransactionType,
): TokenTransaction[] {
  if (filter === "all") return transactions;
  return transactions.filter((tx) => tx.type === filter);
}
