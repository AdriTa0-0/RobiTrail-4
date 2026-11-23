import React from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { TokenEmblem } from "./TokenEmblem";
import { AlertTriangle, Info, Sparkles, X } from "lucide-react";

export const TokenToastOverlay: React.FC = () => {
  const { lang, tokenToasts, dismissTokenToast } = useRobiTrail();

  if (tokenToasts.length === 0) return null;

  return (
    <div
      className="fixed top-16 right-3 sm:right-5 z-[68] flex flex-col gap-2 max-w-xs w-[calc(100%-1.5rem)] pointer-events-none"
      aria-live="polite"
    >
      {tokenToasts.map((toast) => {
        const toneStyles =
          toast.tone === "reward"
            ? "bg-white border-emerald-300 text-slate-900 shadow-lg"
            : toast.tone === "warning"
              ? "bg-amber-50 border-amber-300 text-amber-950 shadow-lg"
              : toast.tone === "penalty" || toast.tone === "error"
                ? "bg-rose-50 border-rose-300 text-rose-950 shadow-lg"
                : "bg-white border-slate-200 text-slate-900 shadow-lg";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 transition-all duration-200 ${toneStyles}`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.tone === "reward" ? (
                <TokenEmblem size="sm" />
              ) : toast.tone === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : toast.tone === "penalty" || toast.tone === "error" ? (
                <Sparkles className="w-4 h-4 text-rose-600" />
              ) : (
                <Info className="w-4 h-4 text-sky-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold leading-snug">
                {lang === "bn" ? toast.titleBn : toast.titleEn}
              </div>
              {(toast.detailEn || toast.detailBn) && (
                <div className="text-[11px] opacity-85 mt-0.5 leading-snug">
                  {lang === "bn" ? toast.detailBn : toast.detailEn}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissTokenToast(toast.id)}
              className="p-0.5 rounded opacity-60 hover:opacity-100 cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
