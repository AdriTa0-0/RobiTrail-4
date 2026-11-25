import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { TOKEN_PACKAGES, type TokenPackage } from "../../services/tokens/TokenTransactionService";
import { fetchTokenShopPackages } from "../../services/tokens/TokenShopService";
import { TokenEmblem } from "./TokenEmblem";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserPlus,
  X,
} from "lucide-react";

export const TokenShop: React.FC<{ onPurchaseComplete?: () => void }> = ({
  onPurchaseComplete,
}) => {
  const {
    lang,
    signedIn,
    tokenBusy,
    lastSmsPreview,
    purchaseTokensFromShop,
    checkShopOrderStatus,
  } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [packages, setPackages] = useState<TokenPackage[]>([...TOKEN_PACKAGES]);
  const [confirmingPkg, setConfirmingPkg] = useState<TokenPackage | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{
    externalTrxId: string;
    pkg: TokenPackage;
  } | null>(null);
  const [shopFeedback, setShopFeedback] = useState<{
    kind: "confirmed" | "pending" | "error";
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

  const handleConfirmPurchase = async () => {
    if (!confirmingPkg) return;
    const targetPkg = confirmingPkg;
    setShopFeedback(null);
    setPendingOrder(null);
    const result = await purchaseTokensFromShop(targetPkg.packageId);
    setConfirmingPkg(null);
    if (result.ok && result.pendingConfirmation) {
      if (result.externalTrxId) {
        setPendingOrder({ externalTrxId: result.externalTrxId, pkg: targetPkg });
      }
      setShopFeedback({
        kind: "pending",
        message:
          result.notice ||
          (lang === "bn"
            ? `সাবস্ক্রিপশন অনুরোধ পাঠানো হয়েছে (${targetPkg.tokens} টোকেন · ৳${targetPkg.priceBdt})। bdapps থেকে নিশ্চিতকরণ এলে টোকেন আপনার ওয়ালেটে যুক্ত হবে।`
            : `Subscription request submitted for +${targetPkg.tokens} tokens (BDT ${targetPkg.priceBdt}). Tokens will be credited once bdapps confirms the subscription.`),
      });
    } else if (result.ok) {
      setShopFeedback({
        kind: "confirmed",
        message:
          lang === "bn"
            ? `ক্রয় নিশ্চিত হয়েছে! bdapps সাবস্ক্রিপশন API-এর মাধ্যমে আপনার ওয়ালেটে +${targetPkg.tokens}টি টোকেন যুক্ত হয়েছে (৳${targetPkg.priceBdt})।`
            : `Purchase confirmed! +${targetPkg.tokens} tokens credited via bdapps Subscription API (BDT ${targetPkg.priceBdt}).`,
      });
      onPurchaseComplete?.();
    } else {
      setShopFeedback({
        kind: "error",
        message:
          result.error ||
          (lang === "bn"
            ? "bdapps সাবস্ক্রিপশন গেটওয়ে থেকে ক্রয় সম্পন্ন করা যায়নি।"
            : "bdapps Subscription gateway could not complete this token purchase."),
      });
    }
  };

  const handleCheckPendingOrder = async () => {
    if (!pendingOrder) return;
    const result = await checkShopOrderStatus(pendingOrder.externalTrxId);
    if (result.ok && !result.pendingConfirmation) {
      const confirmedPkg = pendingOrder.pkg;
      setPendingOrder(null);
      setShopFeedback({
        kind: "confirmed",
        message:
          lang === "bn"
            ? `সাবস্ক্রিপশন নিশ্চিত হয়েছে! আপনার ওয়ালেটে +${confirmedPkg.tokens}টি টোকেন যুক্ত হয়েছে।`
            : `Subscription confirmed! +${confirmedPkg.tokens} tokens credited to your wallet via bdapps Subscription API.`,
      });
      onPurchaseComplete?.();
    } else if (result.ok && result.pendingConfirmation) {
      setShopFeedback({
        kind: "pending",
        message:
          result.notice ||
          (lang === "bn"
            ? "bdapps নিশ্চিতকরণ এখনো অপেক্ষমাণ রয়েছে। কিছুক্ষণ পর আবার যাচাই করুন।"
            : "Subscription confirmation is still pending from bdapps. Please check again shortly."),
      });
    } else {
      setPendingOrder(null);
      setShopFeedback({
        kind: "error",
        message:
          result.error ||
          (lang === "bn"
            ? "সাবস্ক্রিপশন নিশ্চিত করা যায়নি; কোনো টোকেন যোগ হয়নি।"
            : "Subscription confirmation failed; no tokens were credited."),
      });
    }
  };

  return (
    <section
      aria-labelledby="token-store-heading"
      className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-6 shadow-sm"
    >
      {/* Storefront Heading */}
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
              ? "রবি bdapps সাবস্ক্রিপশন API-এর মাধ্যমে টোকেন প্যাক কিনুন। ক্যারিয়ার নিশ্চিতকরণ সম্পন্ন হওয়ার পর প্যাকেজের টোকেন আপনার ওয়ালেটে যুক্ত হবে এবং টোকেনের কোনো মেয়াদ নেই।"
              : "Purchase token packs via the Robi bdapps Subscription API. Pack tokens are credited to your wallet once carrier confirmation completes and never expire."}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {lang === "bn"
            ? "৬টি নির্ধারিত প্যাক · bdapps সাবস্ক্রিপশন"
            : "6 Standard Packs · bdapps Subscription API"}
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
                          ? `টোকেন প্যাক · ৳${unitRate}/টোকেন`
                          : `Token pack · ৳${unitRate}/token`}
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
                      ? "bdapps সাবস্ক্রিপশন API-এর মাধ্যমে চার্জ হবে"
                      : "Charged via bdapps Subscription API"}
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
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex flex-wrap items-start justify-between gap-3 ${
            shopFeedback.kind === "confirmed"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : shopFeedback.kind === "pending"
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : "bg-rose-50 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-[220px]">
            {shopFeedback.kind === "confirmed" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : shopFeedback.kind === "pending" ? (
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{shopFeedback.message}</span>
          </div>

          {shopFeedback.kind === "pending" && pendingOrder && (
            <button
              type="button"
              disabled={tokenBusy}
              onClick={() => void handleCheckPendingOrder()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tokenBusy ? "animate-spin" : ""}`} />
              <span>{lang === "bn" ? "নিশ্চিতকরণ যাচাই করুন" : "Check Confirmation Status"}</span>
            </button>
          )}
        </div>
      )}

      {/* SMS Notification Status */}
      {lastSmsPreview && (
        <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 p-4 space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
              <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
              <span>{lang === "bn" ? "এসএমএস নিশ্চিতকরণ তথ্য" : "SMS Notification Status"}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {lastSmsPreview.maskedMsisdn} · {lastSmsPreview.notice}
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
                    ? `রবি bdapps সাবস্ক্রিপশন API-এর মাধ্যমে ৳${confirmingPkg.priceBdt} অনুরোধ পাঠানো হবে।`
                    : `BDT ${confirmingPkg.priceBdt} will be processed via Robi bdapps Subscription API.`}
                </span>
              </div>
              <p className="text-amber-900/90 leading-relaxed">
                {lang === "bn"
                  ? `নিশ্চিত করলে bdapps সাবস্ক্রিপশন অনুরোধ শুরু হবে। ক্যারিয়ার নিশ্চিত হওয়ার পর +${confirmingPkg.tokens}টি টোকেন আপনার ওয়ালেটে যুক্ত হবে এবং টোকেনের কোনো মেয়াদ নেই।`
                  : `By confirming, you authorize a bdapps subscription request for +${confirmingPkg.tokens} Tokens. Pack tokens are credited once confirmed and never expire.`}
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

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
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
                onClick={() => void handleConfirmPurchase()}
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
          </div>
        </div>
      )}
    </section>
  );
};
