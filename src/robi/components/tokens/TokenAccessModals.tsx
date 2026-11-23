import React, { useEffect } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { t } from "../../data/translations/dictionary";
import { findFreeIntroTrail } from "../../services/tokens/GameAccessService";
import { TrailSymbol } from "../game/TrailSymbol";
import { TokenEmblem } from "./TokenEmblem";
import { AlertCircle, Compass, Sparkles, Unlock, UserPlus, Wallet, X } from "lucide-react";

export const TokenAccessModals: React.FC = () => {
  const {
    lang,
    gateModalState,
    closeGateModal,
    tokenWallet,
    tokenBusy,
    unlockTrailWithTokens,
    openTrail,
  } = useRobiTrail();
  const { navigate } = useAppRouter();

  useEffect(() => {
    if (!gateModalState) return undefined;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeGateModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gateModalState, closeGateModal]);

  if (!gateModalState) return null;

  const balance = tokenWallet?.balance ?? 0;
  const freeIntro = findFreeIntroTrail();

  return (
    <div
      className="fixed inset-0 z-[72] bg-slate-950/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={closeGateModal}
    >
      <div
        className="max-w-md w-full rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeGateModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          aria-label={lang === "bn" ? "বন্ধ করুন" : "Close dialog"}
        >
          <X className="w-4 h-4" />
        </button>

        {gateModalState.kind === "registration_invite" && (
          <>
            <div className="flex items-start gap-3.5 pr-6">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 shrink-0">
                <TokenEmblem size="md" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-rose-600 uppercase">
                  {t(gateModalState.trail.title, lang)}
                </div>
                <h2 className="text-lg font-extrabold text-slate-950 font-display mt-0.5">
                  {lang === "bn" ? "আপনার অভিযান তো সবে শুরু!" : "Your Journey Has Just Begun!"}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {lang === "bn"
                ? "আপনার অগ্রগতি সংরক্ষণ করতে, সম্পূর্ণ রবিট্রেইল অভিজ্ঞতা আনলক করতে এবং ১০টি স্বাগতম টোকেন পেতে একটি অ্যাকাউন্ট তৈরি করুন।"
                : "Create an account to save your progress, unlock the full RobiTrail experience, and receive 10 Welcome Tokens."}
            </p>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {lang === "bn"
                  ? "নতুন যাচাইকৃত অ্যাকাউন্টে পাবেন +১০টি স্বাগতম টোকেন (ডেমো)"
                  : "+10 Welcome Tokens awarded once on demo/verified account setup"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={closeGateModal}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {lang === "bn" ? "পরে দেখব" : "Maybe Later"}
              </button>
              <button
                type="button"
                onClick={() => {
                  closeGateModal();
                  navigate("/account");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account"}</span>
              </button>
            </div>
          </>
        )}

        {gateModalState.kind === "unlock_confirm" && (
          <>
            <div className="flex items-start gap-3.5 pr-6">
              <div className="p-2.5 rounded-xl bg-slate-100 text-rose-600 border border-slate-200 shrink-0">
                <TrailSymbol type={gateModalState.trail.iconType} className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                  #{gateModalState.trail.order} · {t(gateModalState.trail.landmarkLabel, lang)}
                </div>
                <h2 className="text-lg font-extrabold text-slate-950 font-display mt-0.5">
                  {t(gateModalState.trail.title, lang)}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8F5] border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  {lang === "bn" ? "আনলক খরচ:" : "Unlock Cost:"}
                </span>
                <span className="font-mono-num font-bold text-rose-700 inline-flex items-center gap-1.5">
                  <TokenEmblem size="xs" />
                  {gateModalState.unlockCost} {lang === "bn" ? "টোকেন" : "Tokens"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  {lang === "bn" ? "বর্তমান ব্যালেন্স:" : "Current Balance:"}
                </span>
                <span className="font-mono-num font-bold text-slate-900">
                  {balance} {lang === "bn" ? "টোকেন" : "Tokens"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                <span className="text-slate-600">
                  {lang === "bn" ? "আনলকের পর ব্যালেন্স:" : "Remaining After Unlock:"}
                </span>
                <span className="font-mono-num font-bold text-emerald-700">
                  {Math.max(0, balance - gateModalState.unlockCost)}{" "}
                  {lang === "bn" ? "টোকেন" : "Tokens"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === "bn"
                ? "একবার আনলক করলে মিশনটি স্থায়ীভাবে খোলা থাকবে এবং পুনরায় খেলতে কোনো টোকেন লাগবে না।"
                : "Once unlocked, this mission stays unlocked permanently on your account with unlimited replays."}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={tokenBusy}
                onClick={closeGateModal}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={tokenBusy}
                onClick={() => void unlockTrailWithTokens(gateModalState.trail.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>
                  {tokenBusy
                    ? lang === "bn"
                      ? "আনলক হচ্ছে..."
                      : "Unlocking..."
                    : lang === "bn"
                      ? `আনলক নিশ্চিত করুন (${gateModalState.unlockCost} টোকেন)`
                      : `Confirm Unlock (${gateModalState.unlockCost} Tokens)`}
                </span>
              </button>
            </div>
          </>
        )}

        {gateModalState.kind === "insufficient_tokens" && (
          <>
            <div className="flex items-start gap-3.5 pr-6">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                  {t(gateModalState.trail.title, lang)}
                </div>
                <h2 className="text-lg font-extrabold text-slate-950 font-display mt-0.5">
                  {lang === "bn" ? "পর্যাপ্ত টোকেন নেই" : "Not Enough Tokens"}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {lang === "bn"
                ? `এই অ্যাডভেঞ্চারটি আনলক করতে ${gateModalState.requiredTokens}টি টোকেন প্রয়োজন। আপনার বর্তমান ব্যালেন্স: ${balance} টোকেন।`
                : `You need ${gateModalState.requiredTokens} tokens to unlock this adventure. Your current balance is ${balance} token(s).`}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeGateModal}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </button>

              {freeIntro && (
                <button
                  type="button"
                  onClick={() => {
                    closeGateModal();
                    openTrail(freeIntro.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{lang === "bn" ? "ফ্রি শেখা চালিয়ে যান" : "Continue Free Learning"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  closeGateModal();
                  navigate("/tokens");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "টোকেন সেন্টার দেখুন" : "Open Token Center"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
