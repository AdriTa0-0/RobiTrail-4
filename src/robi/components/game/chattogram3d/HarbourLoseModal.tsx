import React from "react";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { UI_DICT, t } from "../../../data/translations/dictionary";
import { getLoseModalContent, type HarbourCrashCause } from "./harbourChaseLogic";

interface HarbourLoseModalProps {
  lang: "en" | "bn";
  chancesLeft: number;
  crashCause: HarbourCrashCause;
  onRetry: () => void;
  onRestartGame: () => void;
  onExitToCity: () => void;
}

export const HarbourLoseModal: React.FC<HarbourLoseModalProps> = ({
  lang,
  chancesLeft,
  crashCause,
  onRetry,
  onRestartGame,
  onExitToCity,
}) => {
  const copy = getLoseModalContent(
    lang,
    chancesLeft,
    crashCause,
    t(UI_DICT.mission.exitToCity, lang),
  );

  return (
    <div
      className="absolute inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="harbour-lose-title"
    >
      <div className="max-w-md w-full rounded-2xl bg-white text-slate-900 border border-rose-200 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-mono text-rose-700 font-semibold">{copy.kicker}</div>
            <h2 id="harbour-lose-title" className="text-xl font-bold text-slate-950 mt-0.5">
              {copy.title}
            </h2>

            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-mono font-bold tabular-nums">{copy.chancesText}</span>{" "}
                <span>{copy.causeText}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2">{copy.guidanceText}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={chancesLeft > 0 ? onRetry : onRestartGame}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{copy.primaryLabel}</span>
          </button>

          <button
            type="button"
            onClick={onExitToCity}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {copy.secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
