import React from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { TokenEmblem } from "../tokens/TokenEmblem";
import { TokenActivityHistory, TokenWalletSummary } from "../tokens/TokenWalletUI";
import { TokenShop } from "../tokens/TokenShop";
import {
  AlertCircle,
  Compass,
  Gift,
  Infinity as InfinityIcon,
  Lock,
  ShoppingBag,
  UserPlus,
} from "lucide-react";

export const TokenCenterPage: React.FC = () => {
  const { lang, signedIn } = useRobiTrail();
  const { navigate } = useAppRouter();

  const ruleBullets = [
    {
      icon: Gift,
      bn: "নিবন্ধনের পর ১০টি স্বাগতম টোকেন পাবেন",
      en: "Receive 10 free welcome tokens after Robi-number registration and OTP verification",
    },
    {
      icon: Compass,
      bn: "“The Message Journey” সবার জন্য ফ্রি",
      en: "Chattogram intro game “The Message Journey” stays 100% free for everyone",
    },
    {
      icon: AlertCircle,
      bn: "নির্দিষ্ট গেমে ২টি ভুল = ১ টোকেন কর্তন",
      en: "Every 2 validated mistakes in token-enabled games deducts 1 token",
    },
    {
      icon: Lock,
      bn: "লকড গেম আনলক করতে ২ টোকেন লাগবে",
      en: "Each locked adventure costs 2 tokens to unlock permanently",
    },
    {
      icon: InfinityIcon,
      bn: "টোকেনের কোনো মেয়াদ নেই",
      en: "Tokens never expire—keep and use your balance until spent",
    },
    {
      icon: ShoppingBag,
      bn: "প্রয়োজন হলে যেকোনো সময় আরও টোকেন কেনা যাবে",
      en: "Buy additional token packs anytime, even if you still have remaining balance",
    },
  ];

  return (
    <div className="bg-[#FAF8F5] min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Page Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-rose-700 uppercase tracking-wider">
              <TokenEmblem size="xs" />
              <span>{lang === "bn" ? "টোকেন ইকোনমি" : "Token Economy"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display text-balance">
              {lang === "bn" ? "টোকেন সেন্টার" : "Token Center"}
            </h1>
            <p className="text-sm text-slate-700 leading-relaxed">
              {lang === "bn"
                ? "রবিট্রেইল টোকেন হলো গেম আনলক ও অনুশীলনের সহজ ডিজিটাল ব্যালেন্স। bdapps সাবস্ক্রিপশন API-এর মাধ্যমে কেনা টোকেন খরচ না হওয়া পর্যন্ত আজীবন ব্যবহার করা যায়।"
                : "RobiTrail Tokens unlock adventures and track gameplay—powered by Robi bdapps Subscription API with zero token expiration."}
            </p>
          </div>

          {!signedIn && (
            <button
              type="button"
              onClick={() => navigate("/account")}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {lang === "bn" ? "নিবন্ধন করে +১০ টোকেন নিন" : "Register for +10 Welcome Tokens"}
              </span>
            </button>
          )}
        </header>

        {/* Block A: Wallet Summary */}
        <TokenWalletSummary />

        {/* Block B: How Tokens Work (Bangla-first Info Card) */}
        <section
          aria-labelledby="how-tokens-work-heading"
          className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h2
                id="how-tokens-work-heading"
                className="text-xl font-extrabold text-slate-950 font-display"
              >
                {lang === "bn" ? "টোকেন কীভাবে কাজ করে" : "How Tokens Work"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {lang === "bn"
                  ? "কেন টোকেন প্রয়োজন, কীভাবে ব্যবহার করবেন এবং কতদিন ব্যবহার করা যায়—সব নিয়ম এক নজরে।"
                  : "What tokens are, why they are needed, how they work, and why they never expire."}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              {lang === "bn"
                ? "bdapps সাবস্ক্রিপশন · মেয়াদহীন টোকেন"
                : "bdapps Subscription · Never Expire"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {ruleBullets.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-[#FAF8F5] border border-slate-200 px-4 py-3.5 flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-950 leading-snug">
                      {lang === "bn" ? item.bn : item.en}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug">
                      {lang === "bn" ? item.en : item.bn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Block C & D: Buy Tokens Storefront + Confirmation Modal */}
        <TokenShop />

        {/* Activity & Purchase History */}
        <TokenActivityHistory />
      </div>
    </div>
  );
};
