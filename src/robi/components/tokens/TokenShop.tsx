import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { TOKEN_PACKAGES, type TokenPackage } from "../../services/tokens/TokenTransactionService";
import { fetchTokenShopPackages } from "../../services/tokens/TokenShopService";
import { TokenEmblem } from "./TokenEmblem";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

export const TokenShop: React.FC<{ onPurchaseComplete?: () => void }> = ({
  onPurchaseComplete,
}) => {
  const { lang, signedIn, tokenBusy, lastSmsPreview, purchaseTokensFromShop } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [packages, setPackages] = useState<TokenPackage[]>([...TOKEN_PACKAGES]);
  const [confirmingPkg, setConfirmingPkg] = useState<TokenPackage | null>(null);
  const [shopFeedback, setShopFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchTokenShopPackages()
      .then((res) => {
        if (active && Array.isArray(res.packages) && res.packages.length > 0) {
          setPackages(res.packages);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!confirmingPkg) return undefined;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !tokenBusy) {
        setConfirmingPkg(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingPkg, tokenBusy]);

  const handleConfirmPurchase = async (outcome: "success" | "failure") => {
    if (!confirmingPkg) return;
    const targetPkg = confirmingPkg;
    setShopFeedback(null);
    const result = await purchaseTokensFromShop(targetPkg.packageId, outcome);
    setConfirmingPkg(null);
    if (result.ok) {
      setShopFeedback({
        ok: true,
        message:
          lang === "bn"
            ? `ক্রয় সফল হয়েছে! আপনার ওয়ালেটে +${targetPkg.tokens}টি টোকেন যুক্ত হয়েছে (৳${targetPkg.priceBdt} প্রিভিউ সিমুলেশন — কোনো আসল টাকা কাটা হয়নি)।`
            : `Purchase successful! +${targetPkg.tokens} tokens added to your wallet (BDT ${targetPkg.priceBdt} preview simulation — zero real charge).`,
      });
      onPurchaseComplete?.();
    } else {
      setShopFeedback({
        ok: false,
        message:
          lang === "bn"
            ? "সিমুলেটেড পেমেন্ট ব্যর্থ হয়েছে: কোনো টোকেন যোগ হয়নি এবং লেনদেনের তালিকায় ব্যর্থ হিসেবে সংরক্ষিত হয়েছে।"
            : "Simulated payment failed: no tokens were added and the failed attempt was recorded in activity.",
      });
    }
  };

  return (
    <section
      aria-labelledby="token-store-heading"
      className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-6 shadow-sm"
    >
      {/* Storefront Heading & Preview Disclosure */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-700 uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{lang === "bn" ? "টোকেন স্টোর" : "Token Store"}</span>
          </div>
          <h2
            id="token-store-heading"
            className="text-xl font-extrabold text-slate-950 font-display"
          >
            {lang === "bn" ? "টোকেন প্যাকেজ কিনুন" : "Buy Token Packages"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {lang === "bn"
              ? "আপনার ব্যালেন্স থাকলেও যেকোনো সময় প্রয়োজন অনুযায়ী এককালীন টোকেন কিনতে পারবেন। কোনো সাবস্ক্রিপশন বা স্বয়ংক্রিয় নবায়ন নেই।"
              : "Purchase one-time token packs anytime—even while you still have balance. No subscription, no renewal, and no expiry."}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {lang === "bn" ? "৬টি নির্ধারিত প্যাক · মেয়াদহীন" : "6 Standard Packs · Never Expire"}
        </div>
      </div>

      {/* Exact 6 Token Packages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const unitRate = (pkg.priceBdt / pkg.tokens).toFixed(2);
          return (
            <div
              key={pkg.packageId}
              className="rounded-2xl bg-[#FAF8F5] border border-slate-200 hover:border-rose-300 p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <TokenEmblem size="md" />
                    <div>
                      <div className="text-lg font-extrabold text-slate-950 font-mono-num leading-tight">
                        {pkg.tokens} {lang === "bn" ? "টোকেন" : "Tokens"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        {lang === "bn"
                          ? `এককালীন প্যাক · মেয়াদহীন`
                          : `One-time pack · ৳${unitRate}/token`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-rose-700 font-mono-num">
                      ৳{pkg.priceBdt}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">BDT {pkg.priceBdt}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                  <Smartphone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>
                    {lang === "bn"
                      ? "রবি ব্যালেন্স থেকে কাটা হবে"
                      : "Charged from Robi mobile balance"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={tokenBusy}
                onClick={() => {
                  setShopFeedback(null);
                  setConfirmingPkg(pkg);
                }}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === "bn" ? "এখনই কিনুন" : "Buy Now"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchase Result Notification */}
      {shopFeedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5 ${
            shopFeedback.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : "bg-rose-50 border-rose-200 text-rose-950"
          }`}
        >
          {shopFeedback.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{shopFeedback.message}</span>
        </div>
      )}

      {/* Small Demo SMS Confirmation Preview */}
      {lastSmsPreview && (
        <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 p-4 space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
              <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {lang === "bn"
                  ? "এসএমএস নিশ্চিতকরণ প্রিভিউ (ডেমো)"
                  : "SMS Confirmation Preview (Demo)"}
              </span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {lastSmsPreview.maskedMsisdn} ·{" "}
              {lastSmsPreview.deliveredLive ? "LIVE SMS" : "DEMO PREVIEW"}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {lang === "bn" ? lastSmsPreview.messageBn : lastSmsPreview.messageEn}
          </p>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {confirmingPkg && (
        <div
          className="fixed inset-0 z-[74] bg-slate-950/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-token-purchase-title"
          onClick={() => {
            if (!tokenBusy) setConfirmingPkg(null);
          }}
        >
          <div
            className="max-w-md w-full rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-2xl space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={tokenBusy}
              onClick={() => setConfirmingPkg(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              aria-label={lang === "bn" ? "বন্ধ করুন" : "Close modal"}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-8">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 shrink-0">
                <TokenEmblem size="md" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-rose-700 uppercase">
                  {lang === "bn" ? "ক্রয় নিশ্চিতকরণ" : "Confirm Token Purchase"}
                </div>
                <h3
                  id="confirm-token-purchase-title"
                  className="text-lg font-extrabold text-slate-950 font-display mt-0.5"
                >
                  {lang === "bn" ? confirmingPkg.labelBn : confirmingPkg.labelEn}
                </h3>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  {lang === "bn" ? "প্যাকেজের নাম:" : "Package Name:"}
                </span>
                <span className="font-bold text-slate-950">
                  {lang === "bn" ? confirmingPkg.labelBn : confirmingPkg.labelEn}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  {lang === "bn" ? "টোকেন সংখ্যা:" : "Token Amount:"}
                </span>
                <span className="font-mono-num font-bold text-slate-950">
                  +{confirmingPkg.tokens} {lang === "bn" ? "টোকেন" : "Tokens"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">
                  {lang === "bn" ? "মোট মূল্য:" : "Total Price:"}
                </span>
                <span className="text-base font-mono-num font-extrabold text-rose-700">
                  ৳{confirmingPkg.priceBdt} (BDT {confirmingPkg.priceBdt})
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  {lang === "bn"
                    ? `এই ৳${confirmingPkg.priceBdt} আপনার রবি মোবাইল ব্যালেন্স থেকে কাটা হবে।`
                    : `BDT ${confirmingPkg.priceBdt} will be charged from your Robi mobile balance.`}
                </span>
              </div>
              <p className="text-amber-900/90 leading-relaxed">
                {lang === "bn"
                  ? "প্রিভিউ মোডে এখন সফল ক্রয় সিমুলেট হবে এবং কোনো আসল টাকা কাটা হবে না। টোকেনের কোনো মেয়াদ নেই।"
                  : "In Preview Mode, this simulates a successful purchase with zero real charge. Purchased tokens never expire."}
              </p>
            </div>

            {!signedIn && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-950 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {lang === "bn"
                    ? "টোকেন কিনতে ও সংরক্ষণ করতে আগে আপনার রবি নম্বর দিয়ে অ্যাকাউন্টে লগ-ইন করুন।"
                    : "Sign in or create your Robi mobile account first to credit tokens to your wallet."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingPkg(null);
                    navigate("/account");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{lang === "bn" ? "অ্যাকাউন্টে যান" : "Go to Account"}</span>
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={tokenBusy}
                  onClick={() => setConfirmingPkg(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={tokenBusy || !signedIn}
                  onClick={() => void handleConfirmPurchase("success")}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {tokenBusy
                      ? lang === "bn"
                        ? "প্রক্রিয়াধীন..."
                        : "Processing..."
                      : lang === "bn"
                        ? "ক্রয় নিশ্চিত করুন"
                        : "Confirm Purchase"}
                  </span>
                </button>
              </div>

              {signedIn && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    {lang === "bn" ? "ডেমো কিউএ পরীক্ষা:" : "Demo QA test:"}
                  </span>
                  <button
                    type="button"
                    disabled={tokenBusy}
                    onClick={() => void handleConfirmPurchase("failure")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-rose-700 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{lang === "bn" ? "ব্যর্থ পেমেন্ট পরীক্ষা" : "Test Failed Payment"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
