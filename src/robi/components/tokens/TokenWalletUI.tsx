import React, { useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import {
  filterTransactionsByCategory,
  getTransactionTypeLabel,
  type TokenTransactionType,
} from "../../services/tokens/TokenTransactionService";
import { AnimatedTokenCount, TokenEmblem } from "./TokenEmblem";
import { AlertTriangle, CheckCircle2, Coins, Gift, History, Lock, UserPlus } from "lucide-react";

type TxFilter = "all" | TokenTransactionType;

export const TokenWalletSummary: React.FC = () => {
  const { lang, signedIn, tokenWallet, tokenBusy, claimWelcomeReward } = useRobiTrail();
  const { navigate } = useAppRouter();

  const balance = tokenWallet?.balance ?? 0;

  return (
    <section
      aria-label={lang === "bn" ? "ওয়ালেট সারসংক্ষেপ" : "Wallet Summary"}
      className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-rose-700 uppercase tracking-wider">
          <Coins className="w-4 h-4" />
          <span>{lang === "bn" ? "ওয়ালেট সারসংক্ষেপ" : "Wallet Summary"}</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {lang === "bn" ? "কোনো মেয়াদ নেই · bdapps" : "No Expiry · bdapps Wallet"}
        </div>
      </div>

      {/* Block A: 4 Clean Wallet KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* 1. Current Tokens */}
        <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4 flex items-center gap-3.5">
          <TokenEmblem size="lg" />
          <div>
            <div className="text-[11px] font-semibold text-slate-600">
              {lang === "bn" ? "বর্তমান টোকেন" : "Current Tokens"}
            </div>
            <div className="text-3xl font-extrabold text-slate-950 leading-none mt-1">
              <AnimatedTokenCount value={balance} />{" "}
              <span className="text-xs font-bold text-slate-600">
                {lang === "bn" ? "টোকেন" : "Tokens"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {lang === "bn" ? "ব্যবহারের কোনো মেয়াদ নেই" : "Never expires"}
            </div>
          </div>
        </div>

        {/* 2. Welcome Bonus Status */}
        <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Gift className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{lang === "bn" ? "স্বাগতম বোনাস" : "Welcome Bonus"}</span>
          </div>

          {!signedIn ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">
                {lang === "bn" ? "নিবন্ধনে +১০ টোকেন ফ্রি" : "+10 Free on Signup"}
              </div>
              <button
                type="button"
                onClick={() => navigate("/account")}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "অ্যাকাউন্ট খুলুন" : "Register Now"}</span>
              </button>
            </div>
          ) : tokenWallet?.welcomeRewardGranted ? (
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lang === "bn" ? "গৃহীত (+১০ টোকেন)" : "Received (+10)"}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {lang === "bn" ? "স্বাগতম বোনাস যুক্ত হয়েছে" : "Welcome bonus credited"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-amber-800">
                {lang === "bn" ? "এখনো নেওয়া হয়নি" : "Not Received Yet"}
              </div>
              <button
                type="button"
                disabled={tokenBusy}
                onClick={() => void claimWelcomeReward()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                {lang === "bn" ? "+১০ বোনাস সংগ্রহ করুন" : "Claim +10 Tokens"}
              </button>
            </div>
          )}
        </div>

        {/* 3. Locked Game Unlock Cost */}
        <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{lang === "bn" ? "লকড গেম আনলক খরচ" : "Locked Game Unlock"}</span>
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-950 font-mono-num">
              {lang === "bn" ? "২ টোকেন / গেম" : "2 Tokens / Game"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {lang === "bn" ? "একবার আনলক করলে স্থায়ীভাবে খোলা" : "Permanent unlock per game"}
            </div>
          </div>
        </div>

        {/* 4. Mistake Penalty */}
        <div className="rounded-2xl bg-[#FAF8F5] border border-slate-200 p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lang === "bn" ? "ভুল উত্তর কর্তন" : "Mistake Penalty"}</span>
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-950 font-mono-num">
              {lang === "bn" ? "২ ভুল = ১ টোকেন" : "2 Mistakes = 1 Token"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {lang === "bn"
                ? "“The Message Journey” সম্পূর্ণ ফ্রি"
                : "The Message Journey is always free"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TokenActivityHistory: React.FC = () => {
  const { lang, signedIn, tokenWallet } = useRobiTrail();
  const [txFilter, setTxFilter] = useState<TxFilter>("all");

  const transactions = tokenWallet?.transactions || [];
  const filteredTransactions = filterTransactionsByCategory(transactions, txFilter);

  const filterTabs: { id: TxFilter; en: string; bn: string }[] = [
    { id: "all", en: "All", bn: "সব" },
    { id: "token_purchase", en: "Purchases", bn: "ক্রয়" },
    { id: "game_unlock", en: "Unlocks", bn: "আনলক" },
    { id: "mistake_penalty", en: "Mistakes", bn: "ভুল কর্তন" },
    { id: "welcome_reward", en: "Rewards", bn: "পুরস্কার" },
  ];

  return (
    <section
      aria-label={lang === "bn" ? "সাম্প্রতিক টোকেন কার্যক্রম" : "Recent Token Activity"}
      className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-base font-bold text-slate-950">
          <History className="w-4 h-4 text-rose-600" />
          <span>
            {lang === "bn"
              ? "সাম্প্রতিক টোকেন কার্যক্রম ও ক্রয়ের ইতিহাস"
              : "Recent Token Activity & Purchase History"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTxFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                txFilter === tab.id
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {lang === "bn" ? tab.bn : tab.en}
            </button>
          ))}
        </div>
      </div>

      {!signedIn ? (
        <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 px-4 py-6 text-center text-xs sm:text-sm text-slate-600">
          {lang === "bn"
            ? "আপনার টোকেন ক্রয় ও ব্যবহারের ইতিহাস দেখতে অ্যাকাউন্টে লগ-ইন করুন।"
            : "Sign in to view your token purchases, game unlocks, and deduction history."}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 px-4 py-6 text-center text-xs sm:text-sm text-slate-600">
          {lang === "bn"
            ? "এই বিভাগে এখনো কোনো টোকেন লেনদেন নেই।"
            : "No token transactions recorded in this category yet."}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
          {filteredTransactions.slice(0, 12).map((tx) => {
            const isCredit = tx.amount > 0 && tx.status === "completed";
            const isFailed = tx.status === "failed";
            return (
              <div
                key={tx.id}
                className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50/70"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-950">
                      {getTransactionTypeLabel(tx.type, lang)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span
                      className={`font-semibold ${isFailed ? "text-rose-700" : "text-emerald-700"}`}
                    >
                      {isFailed
                        ? lang === "bn"
                          ? "ব্যর্থ"
                          : "Failed"
                        : lang === "bn"
                          ? "সম্পন্ন"
                          : "Completed"}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {tx.mode === "live_bdapps" ? "LIVE" : "DEMO"}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate">
                    {lang === "bn" ? tx.descriptionBn : tx.descriptionEn}
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-400">
                    {tx.createdAt.slice(0, 19).replace("T", " ")}
                    {tx.priceBdt ? ` · BDT ${tx.priceBdt}` : ""}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-extrabold font-mono-num ${
                      isFailed
                        ? "text-slate-400 line-through"
                        : isCredit
                          ? "text-emerald-700"
                          : "text-rose-700"
                    }`}
                  >
                    {isFailed ? `+${tx.amount}` : isCredit ? `+${tx.amount}` : `${tx.amount}`}{" "}
                    {lang === "bn" ? "টোকেন" : "Tokens"}
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-500">
                    {lang === "bn" ? "ব্যালেন্স:" : "Bal:"} {tx.balanceAfter}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const TokenWalletUI: React.FC = () => (
  <div className="space-y-6">
    <TokenWalletSummary />
    <TokenActivityHistory />
  </div>
);
