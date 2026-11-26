import React, { useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { TrailSymbol } from "./TrailSymbol";
import { ambientSynth } from "../../services/audio/ambientSynth";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
  X,
  ArrowRight,
} from "lucide-react";
import { ChattogramTrailEngine } from "./ChattogramTrails";
import { DhakaTrailEngine } from "./DhakaTrails";
import { SylhetTrailsPart1 } from "./SylhetTrailsPart1";
import { SylhetTrailsPart2 } from "./SylhetTrailsPart2";

export interface TrailEngineProps {
  trailId: string;
  paused?: boolean;
  hintLevel?: number;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onMistake?: (actionKey: string) => void;
  onExitToCity?: () => void;
}

export const MissionShell: React.FC<{ onNavigateToTokens: () => void }> = ({
  onNavigateToTokens,
}) => {
  const {
    lang,
    activeTrail,
    closeTrail,
    openTrail,
    completeTrail,
    isTrailUnlocked,
    reportGameMistake,
    resetMistakeSession,
    soundEnabled,
    openHandbookTopic,
  } = useRobiTrail();

  const [tipOpen, setTipOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);

  if (!activeTrail) return null;

  const isLockedPremium = !isTrailUnlocked(activeTrail);

  const handleComplete = () => {
    if (justCompleted) return;
    completeTrail(activeTrail.id);
    setProgressPct(100);
    setJustCompleted(true);
    ambientSynth.playSuccessChime(soundEnabled);
  };

  const handleRestart = () => {
    setProgressPct(0);
    setJustCompleted(false);
    resetMistakeSession(activeTrail.id);
    setRestartNonce((n) => n + 1);
  };

  const handleNextAdventure = () => {
    if (activeTrail.nextTeaser) {
      setProgressPct(0);
      setJustCompleted(false);
      setTipOpen(false);
      openTrail(activeTrail.nextTeaser.targetTrailId);
    } else {
      closeTrail();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-2 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t(activeTrail.title, lang)}
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Game Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400">
              <TrailSymbol type={activeTrail.iconType} className="w-6 h-6" active />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">
                #{activeTrail.order} · {t(activeTrail.landmarkLabel, lang)}
              </div>
              <h2 className="text-lg sm:text-xl font-bold">{t(activeTrail.title, lang)}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openHandbookTopic(activeTrail.handbookTopicId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">{t(UI_DICT.mission.openHandbook, lang)}</span>
            </button>

            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t(UI_DICT.mission.restart, lang)}</span>
            </button>

            <button
              onClick={() => {
                setProgressPct(0);
                setJustCompleted(false);
                closeTrail();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(UI_DICT.mission.exitToCity, lang)}</span>
            </button>
          </div>
        </div>

        {/* Transparent Pre-Entry Notice for Optional Premium Trails */}
        {isLockedPremium ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {t(UI_DICT.mission.premiumNoticeTitle, lang)}
            </h3>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              {t(UI_DICT.mission.premiumNoticeDesc, lang)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  closeTrail();
                  onNavigateToTokens();
                }}
                className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
              >
                {t(UI_DICT.mission.openTokenCenter, lang)}
              </button>
              <button
                onClick={closeTrail}
                className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition-colors"
              >
                {t(UI_DICT.mission.exitToCity, lang)}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Instruction & Live Progress Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="md:col-span-8 space-y-2">
                <div>
                  <div className="text-[11px] font-mono font-semibold text-rose-600">
                    {t(UI_DICT.mission.objective, lang)}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {t(activeTrail.objective, lang)}
                  </p>
                </div>
                <div>
                  <div className="text-[11px] font-mono font-semibold text-slate-500">
                    {t(UI_DICT.mission.howToPlay, lang)}
                  </div>
                  <ol className="mt-1 space-y-0.5 text-xs text-slate-700 list-decimal list-inside">
                    {activeTrail.howToPlay.map((step, i) => (
                      <li key={i}>{t(step, lang)}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-600 mb-1">
                    <span>{t(UI_DICT.mission.progress, lang)}</span>
                    <span className="tabular-nums">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        progressPct >= 100 ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Expandable NEED A TIP? */}
                <div>
                  <button
                    onClick={() => setTipOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-900 transition-colors"
                  >
                    <span>{t(UI_DICT.mission.needTip, lang)}</span>
                    {tipOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {tipOpen && (
                    <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                      {t(activeTrail.tip, lang)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Trail Interactive Simulation Stage */}
            <div key={`${activeTrail.id}-${restartNonce}`}>
              {activeTrail.cityId === "chattogram" && (
                <ChattogramTrailEngine
                  trailId={activeTrail.id}
                  onProgress={setProgressPct}
                  onComplete={handleComplete}
                  onMistake={(key) => reportGameMistake(activeTrail.id, key)}
                  onExitToCity={closeTrail}
                />
              )}
              {activeTrail.cityId === "dhaka" && (
                <DhakaTrailEngine
                  trailId={activeTrail.id}
                  onProgress={setProgressPct}
                  onComplete={handleComplete}
                  onMistake={(key) => reportGameMistake(activeTrail.id, key)}
                />
              )}
              {activeTrail.cityId === "sylhet" &&
                ["syl-1", "syl-2", "syl-3", "syl-4"].includes(activeTrail.id) && (
                  <SylhetTrailsPart1
                    trailId={activeTrail.id}
                    onProgress={setProgressPct}
                    onComplete={handleComplete}
                    onMistake={(key) => reportGameMistake(activeTrail.id, key)}
                  />
                )}
              {activeTrail.cityId === "sylhet" &&
                ["syl-5", "syl-6", "syl-7"].includes(activeTrail.id) && (
                  <SylhetTrailsPart2
                    trailId={activeTrail.id}
                    onProgress={setProgressPct}
                    onComplete={handleComplete}
                    onMistake={(key) => reportGameMistake(activeTrail.id, key)}
                  />
                )}
            </div>

            {/* Completion & Connected Chapter Teaser */}
            {justCompleted && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      {t(UI_DICT.mission.completedTitle, lang)}
                    </h4>
                    {activeTrail.nextTeaser && (
                      <p className="text-xs text-emerald-800 mt-0.5">
                        {t(activeTrail.nextTeaser.text, lang)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTrail.nextTeaser ? (
                    <button
                      onClick={handleNextAdventure}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                    >
                      <span>{t(UI_DICT.mission.continueNext, lang)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={closeTrail}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                    >
                      {t(UI_DICT.mission.exitToCity, lang)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
