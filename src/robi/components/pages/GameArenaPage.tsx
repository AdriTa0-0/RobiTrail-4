import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { getTrailById } from "../../data/trails/trails";
import { getCityById } from "../../data/cities/cities";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { TrailSymbol } from "../game/TrailSymbol";
import { ChattogramTrailEngine } from "../game/ChattogramTrails";
import { DhakaTrailEngine } from "../game/DhakaTrails";
import { SylhetTrailsPart1 } from "../game/SylhetTrailsPart1";
import { SylhetTrailsPart2 } from "../game/SylhetTrailsPart2";
import { ambientSynth } from "../../services/audio/ambientSynth";
import { findFreeIntroTrail, isFreeIntroTrail } from "../../services/tokens/GameAccessService";
import { isMistakeTrackingEnabledForTrail } from "../../services/tokens/MistakeTracker";
import { TokenEmblem } from "../tokens/TokenEmblem";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Home,
  Lightbulb,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

export const GameArenaPage: React.FC<{
  cityId: "chattogram" | "dhaka" | "sylhet";
  gameId: string;
}> = ({ cityId, gameId }) => {
  const {
    lang,
    completeTrail,
    devTestingMode,
    tokenPreviewMode,
    setTokenPreviewMode,
    getTrailAccess,
    signedIn,
    tokenWallet,
    tokenBusy,
    unlockTrailWithTokens,
    openTrail,
    reportGameMistake,
    resetMistakeSession,
    mistakeCountInRun,
    soundEnabled,
    setSoundEnabled,
    openHandbookTopic,
  } = useRobiTrail();
  const { navigate, setActiveMissionDirty } = useAppRouter();

  const trail = getTrailById(gameId);
  const city = getCityById(trail?.cityId || cityId);

  const [hintLevel, setHintLevel] = useState<number>(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);

  // Reset local mission state whenever route changes to a new gameId
  useEffect(() => {
    setProgressPct(0);
    setJustCompleted(false);
    setPaused(false);
    setHintLevel(0);
    setControlsOpen(false);
    setDemoOpen(false);
    setMobileSheetOpen(false);
    resetMistakeSession(gameId);
  }, [gameId, resetMistakeSession]);

  // Register dirty mission guard when active unfinished progress exists
  useEffect(() => {
    const isDirty = progressPct > 0 && !justCompleted;
    setActiveMissionDirty(isDirty);
    return () => setActiveMissionDirty(false);
  }, [progressPct, justCompleted, setActiveMissionDirty]);

  // Escape key toggles pause inside active games
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !justCompleted) {
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [justCompleted]);

  if (!trail) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === "en" ? "Mission Not Found" : "মিশন পাওয়া যায়নি"}
        </h1>
        <button
          type="button"
          onClick={() => navigate("/games")}
          className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold"
        >
          {lang === "en" ? "Browse All Games" : "সকল গেম দেখুন"}
        </button>
      </div>
    );
  }

  const trailAccess = getTrailAccess(trail);
  const isLockedGate = !trailAccess.accessible;
  const freeIntroTrail = findFreeIntroTrail();
  const isFreeIntro = isFreeIntroTrail(trail);
  const mistakeTrackingOn = isMistakeTrackingEnabledForTrail(trail);

  const handleComplete = () => {
    completeTrail(trail.id);
    setProgressPct(100);
    setJustCompleted(true);
    setActiveMissionDirty(false);
    ambientSynth.playSuccessChime(soundEnabled);
  };

  const handleRestart = () => {
    setProgressPct(0);
    setJustCompleted(false);
    setPaused(false);
    setHintLevel(0);
    resetMistakeSession(trail.id);
    setRestartNonce((n) => n + 1);
  };

  const advanceHint = () => {
    setHintLevel((lvl) => (lvl >= 3 ? 0 : lvl + 1));
  };

  const is3DGame =
    trail.cityId === "chattogram" ||
    (trail.cityId === "dhaka" && trail.id !== "dhk-3") ||
    trail.cityId === "sylhet";

  const cityTheme =
    city.id === "chattogram"
      ? {
          headerTint: "border-rose-500/25",
          hudBorder: "border-rose-400/35",
          accentText: "text-rose-400",
          cityTag: { en: "PORT BAY", bn: "বন্দর নগরী" },
        }
      : city.id === "dhaka"
        ? {
            headerTint: "border-sky-500/25",
            hudBorder: "border-sky-400/35",
            accentText: "text-sky-400",
            cityTag: { en: "METRO HUB", bn: "মেট্রো হাব" },
          }
        : {
            headerTint: "border-emerald-500/25",
            hudBorder: "border-emerald-400/35",
            accentText: "text-emerald-400",
            cityTag: { en: "TEA VALLEY", bn: "চা-উপত্যকা" },
          };

  const handleMistake = (actionKey: string) => {
    reportGameMistake(trail.id, actionKey);
  };

  const renderTrailEngine = () => {
    if (trail.cityId === "chattogram") {
      return (
        <ChattogramTrailEngine
          trailId={trail.id}
          paused={paused}
          hintLevel={hintLevel}
          onProgress={setProgressPct}
          onComplete={handleComplete}
          onMistake={handleMistake}
        />
      );
    }
    if (trail.cityId === "dhaka") {
      return (
        <DhakaTrailEngine
          trailId={trail.id}
          paused={paused}
          hintLevel={hintLevel}
          onProgress={setProgressPct}
          onComplete={handleComplete}
          onMistake={handleMistake}
        />
      );
    }
    if (["syl-1", "syl-2", "syl-3", "syl-4"].includes(trail.id)) {
      return (
        <SylhetTrailsPart1
          trailId={trail.id}
          paused={paused}
          hintLevel={hintLevel}
          onProgress={setProgressPct}
          onComplete={handleComplete}
          onMistake={handleMistake}
        />
      );
    }
    return (
      <SylhetTrailsPart2
        trailId={trail.id}
        paused={paused}
        hintLevel={hintLevel}
        onProgress={setProgressPct}
        onComplete={handleComplete}
        onMistake={handleMistake}
      />
    );
  };

  const renderProgressiveHintPanel = (dark: boolean) => {
    if (hintLevel === 0) return null;
    return (
      <div
        className={`rounded-lg p-2.5 text-[11px] leading-relaxed space-y-1.5 border ${
          dark
            ? "bg-amber-950/75 border-amber-500/40 text-amber-100"
            : "bg-amber-50 border-amber-200 text-amber-950"
        }`}
      >
        <div className="flex items-center justify-between font-mono text-[10px] font-bold">
          <span>
            {hintLevel === 1
              ? lang === "en"
                ? "HINT 1/3 · GUIDANCE"
                : "সহায়তা ১/৩ · দিকনির্দেশনা"
              : hintLevel === 2
                ? lang === "en"
                  ? "HINT 2/3 · HIGHLIGHT TARGET"
                  : "সহায়তা ২/৩ · লক্ষ্য চিহ্নিত"
                : lang === "en"
                  ? "HINT 3/3 · NEXT ACTION"
                  : "সহায়তা ৩/৩ · পরবর্তী কাজ"}
          </span>
          <button
            type="button"
            onClick={() => setHintLevel(0)}
            className="opacity-80 hover:opacity-100"
            aria-label="Close hint"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p>{t(trail.tip, lang)}</p>
        {hintLevel >= 2 && (
          <p
            className={`pt-1 border-t ${dark ? "border-amber-500/30 text-sky-200" : "border-amber-200 text-sky-900"}`}
          >
            {t(trail.hintTarget, lang)}
          </p>
        )}
        {hintLevel >= 3 && (
          <p
            className={`pt-1 border-t font-semibold ${dark ? "border-amber-500/30 text-emerald-200" : "border-amber-200 text-emerald-900"}`}
          >
            {t(trail.hintAction, lang)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 text-white">
      {/* Compact Game Arena Header */}
      <div
        className={`bg-slate-950 border-b ${cityTheme.headerTint} px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-30`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/cities/${city.id}`)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(UI_DICT.mission.exitToCity, lang)}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={t(UI_DICT.mission.exitToHome, lang)}
            aria-label={t(UI_DICT.mission.exitToHome, lang)}
          >
            <Home className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
            <TrailSymbol
              type={trail.iconType}
              className={`w-5 h-5 ${cityTheme.accentText}`}
              active
            />
            <div>
              <div className="text-[10px] font-mono text-slate-400">
                #{trail.order} · {t(city.name, lang)} ·{" "}
                <span className={cityTheme.accentText}>{cityTheme.cityTag[lang]}</span>
                {devTestingMode && (
                  <span className="text-sky-300">
                    {" "}
                    · {lang === "en" ? "DEV UNLOCKED" : "ডেভ আনলকড"}
                  </span>
                )}
              </div>
              <div className="text-sm font-bold leading-tight">{t(trail.title, lang)}</div>
            </div>
          </div>
        </div>

        {/* Live Progress Meter + Compact Token Indicator + Arena Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {isFreeIntro ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-2 py-1 text-[11px] font-bold text-emerald-300">
              {lang === "bn" ? "চিরদিন ফ্রি" : "Free Forever"}
            </span>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-[11px] font-mono-num"
              title={lang === "bn" ? "টোকেন ব্যালেন্স" : "Token Balance"}
            >
              <TokenEmblem size="xs" />
              <span className="font-bold text-amber-300">
                {signedIn ? (tokenWallet?.balance ?? 0) : lang === "bn" ? "গেস্ট" : "Guest"}
              </span>
              {mistakeTrackingOn && mistakeCountInRun % 2 === 1 && (
                <span className="text-[10px] text-amber-400 font-sans font-semibold ml-1">
                  · {lang === "bn" ? "সতর্কতা ১/২" : "Warn 1/2"}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 border border-white/10 rounded-lg px-2 sm:px-2.5 py-1">
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
              {t(UI_DICT.mission.progress, lang)}
            </span>
            <div className="w-12 sm:w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPct >= 100 ? "bg-emerald-500" : "bg-rose-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono-num text-xs font-bold text-amber-300">{progressPct}%</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t(UI_DICT.mission.pause, lang)}</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t(UI_DICT.mission.restart, lang)}</span>
          </button>

          <button
            type="button"
            onClick={() => openHandbookTopic(trail.handbookTopicId)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t(UI_DICT.mission.learnMore, lang)}</span>
          </button>
        </div>
      </div>

      {/* Main Arena Viewport */}
      {isLockedGate ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-7 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            {trailAccess.requiresRegistration ? (
              <>
                <h2 className="text-xl font-bold">
                  {lang === "bn" ? "আপনার অভিযান তো সবে শুরু!" : "Your Journey Has Just Begun!"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === "bn"
                    ? "আপনার অগ্রগতি সংরক্ষণ করতে, সম্পূর্ণ রবিট্রেইল অভিজ্ঞতা আনলক করতে এবং ১০টি স্বাগতম টোকেন পেতে একটি অ্যাকাউন্ট তৈরি করুন।"
                    : "Create an account to save your progress, unlock the full RobiTrail experience, and receive 10 Welcome Tokens."}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/account")}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold cursor-pointer"
                  >
                    {lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account"}
                  </button>
                  {freeIntroTrail && (
                    <button
                      type="button"
                      onClick={() => openTrail(freeIntroTrail.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-200 text-xs font-semibold cursor-pointer"
                    >
                      {lang === "bn" ? "ফ্রি শেখা চালিয়ে যান" : "Continue Free Learning"}
                    </button>
                  )}
                </div>
              </>
            ) : (tokenWallet?.balance ?? 0) >= trailAccess.unlockCost ? (
              <>
                <h2 className="text-xl font-bold">
                  {lang === "bn" ? "মিশন আনলক করুন" : "Unlock This Adventure"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === "bn"
                    ? `${t(trail.title, lang)} আনলক করতে ${trailAccess.unlockCost}টি টোকেন খরচ হবে। আপনার ব্যালেন্স: ${tokenWallet?.balance ?? 0} টোকেন।`
                    : `Unlock ${t(trail.title, lang)} permanently for ${trailAccess.unlockCost} Tokens. Current balance: ${tokenWallet?.balance ?? 0} Tokens.`}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={tokenBusy}
                    onClick={() => void unlockTrailWithTokens(trail.id)}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    {tokenBusy
                      ? lang === "bn"
                        ? "আনলক হচ্ছে..."
                        : "Unlocking..."
                      : lang === "bn"
                        ? `আনলক নিশ্চিত করুন (${trailAccess.unlockCost} টোকেন)`
                        : `Confirm Unlock (${trailAccess.unlockCost} Tokens)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/cities/${city.id}`)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                  >
                    {t(UI_DICT.mission.exitToCity, lang)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">
                  {lang === "bn" ? "পর্যাপ্ত টোকেন নেই" : "Not Enough Tokens"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === "bn"
                    ? "এই অ্যাডভেঞ্চারটি আনলক করতে ২টি টোকেন প্রয়োজন।"
                    : "You need 2 tokens to unlock this adventure."}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/tokens")}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold cursor-pointer"
                  >
                    {lang === "bn" ? "টোকেন সেন্টার দেখুন" : "Open Token Center"}
                  </button>
                  {freeIntroTrail && (
                    <button
                      type="button"
                      onClick={() => openTrail(freeIntroTrail.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-200 text-xs font-semibold cursor-pointer"
                    >
                      {lang === "bn" ? "ফ্রি শেখা চালিয়ে যান" : "Continue Free Learning"}
                    </button>
                  )}
                </div>
              </>
            )}

            {devTestingMode && tokenPreviewMode && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTokenPreviewMode(false)}
                  className="text-[11px] text-sky-300 hover:underline cursor-pointer"
                >
                  {lang === "bn" ? "ডেভ টেস্টিং ওপেনে ফিরে যান" : "Switch back to Dev Testing Open"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col">
          {is3DGame ? (
            <>
              {/* MOBILE (< md): Minimal Floating Progress Pill + Expandable Mission Sheet */}
              <div className="md:hidden absolute top-3 left-3 z-20 max-w-[155px]">
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(true)}
                  aria-expanded={mobileSheetOpen}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/92 border ${cityTheme.hudBorder} text-white shadow-lg text-xs font-semibold cursor-pointer max-w-full`}
                >
                  <TrailSymbol
                    type={trail.iconType}
                    className={`w-3.5 h-3.5 shrink-0 ${cityTheme.accentText}`}
                    active
                  />
                  <span className="truncate">{lang === "en" ? "Mission" : "লক্ষ্য"}</span>
                  <span className="font-mono-num text-[11px] font-bold text-amber-300 shrink-0">
                    {progressPct}%
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </button>
              </div>

              {mobileSheetOpen && (
                <div
                  className="md:hidden fixed inset-0 z-50 bg-slate-950/65 flex items-end justify-center p-3"
                  role="dialog"
                  aria-modal="true"
                  onClick={() => setMobileSheetOpen(false)}
                >
                  <div
                    className={`w-full max-w-md rounded-2xl bg-slate-950 border ${cityTheme.hudBorder} p-4 shadow-2xl space-y-3 text-white max-h-[72vh] overflow-y-auto`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5">
                      <div>
                        <div
                          className={`text-[10px] font-mono ${cityTheme.accentText} font-semibold`}
                        >
                          #{trail.order} · {t(city.name, lang)} · {progressPct}%
                        </div>
                        <h2 className="text-sm font-bold text-white leading-snug">
                          {t(trail.title, lang)}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileSheetOpen(false)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        aria-label="Close mission sheet"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div
                        className={`text-[10px] font-mono ${cityTheme.accentText} font-semibold mb-0.5`}
                      >
                        {t(UI_DICT.mission.objective, lang)}
                      </div>
                      <p className="text-xs font-medium text-slate-100 leading-relaxed">
                        {t(trail.objective, lang)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-900 border border-sky-500/30 p-2.5 space-y-1 text-[11px] leading-relaxed">
                      <div>
                        <span className="font-mono text-sky-300 font-bold">WATCH: </span>
                        <span className="text-slate-200">{t(trail.watchDemo, lang)}</span>
                      </div>
                      <div>
                        <span className="font-mono text-emerald-300 font-bold">TRY: </span>
                        <span className="text-slate-200">{t(trail.tryPrompt, lang)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-white/10 pt-2">
                      <div className="text-[11px] font-mono text-slate-300 font-semibold">
                        {t(UI_DICT.mission.howToPlay, lang)}
                      </div>
                      <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                        {trail.howToPlay.map((step, i) => (
                          <li key={i}>{t(step, lang)}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={advanceHint}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          hintLevel > 0
                            ? "bg-amber-500 text-slate-950"
                            : "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>
                          {hintLevel === 0
                            ? lang === "en"
                              ? "Hint (1/3)"
                              : "সহায়তা (১/৩)"
                            : hintLevel === 1
                              ? lang === "en"
                                ? "Target (2/3)"
                                : "লক্ষ্য (২/৩)"
                              : hintLevel === 2
                                ? lang === "en"
                                  ? "Next Step (3/3)"
                                  : "পরবর্তী কাজ (৩/৩)"
                                : lang === "en"
                                  ? "Hide Hints"
                                  : "লুকান"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          openHandbookTopic(trail.handbookTopicId);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-slate-100 text-xs font-semibold"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                        <span>{t(UI_DICT.mission.learnMore, lang)}</span>
                      </button>
                    </div>

                    {renderProgressiveHintPanel(true)}
                  </div>
                </div>
              )}

              {/* DESKTOP (md+): Top-Left HUD */}
              <div className="hidden md:block pointer-events-none absolute top-3 left-3 z-20 max-w-sm space-y-1.5">
                <div
                  className={`pointer-events-auto rounded-xl bg-slate-950/92 border ${cityTheme.hudBorder} p-3 shadow-xl space-y-2`}
                >
                  <div>
                    <div className={`text-[10px] font-mono ${cityTheme.accentText} font-semibold`}>
                      {t(UI_DICT.mission.objective, lang)}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
                      {t(trail.objective, lang)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setDemoOpen((o) => !o)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        demoOpen
                          ? "bg-sky-600 text-white"
                          : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-200"
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{lang === "en" ? "Quick Demo" : "সহজ নমুনা"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setControlsOpen((o) => !o)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[11px] font-medium text-slate-200 cursor-pointer"
                    >
                      <span>{t(UI_DICT.mission.howToPlay, lang)}</span>
                      {controlsOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={advanceHint}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        hintLevel > 0
                          ? "bg-amber-500 text-slate-950"
                          : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
                      }`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>
                        {hintLevel === 0
                          ? lang === "en"
                            ? "Hint (1/3)"
                            : "সহায়তা (১/৩)"
                          : hintLevel === 1
                            ? lang === "en"
                              ? "Target (2/3)"
                              : "লক্ষ্য (২/৩)"
                            : hintLevel === 2
                              ? lang === "en"
                                ? "Next Step (3/3)"
                                : "পরবর্তী কাজ (৩/৩)"
                              : lang === "en"
                                ? "Hide Hints"
                                : "লুকান"}
                      </span>
                    </button>
                  </div>

                  {demoOpen && (
                    <div className="rounded-lg bg-slate-900 border border-sky-500/30 p-2.5 space-y-1.5 text-[11px] leading-relaxed">
                      <div>
                        <span className="font-mono text-sky-300 font-bold">WATCH: </span>
                        <span className="text-slate-200">{t(trail.watchDemo, lang)}</span>
                      </div>
                      <div>
                        <span className="font-mono text-emerald-300 font-bold">TRY: </span>
                        <span className="text-slate-200">{t(trail.tryPrompt, lang)}</span>
                      </div>
                      <div>
                        <span className="font-mono text-amber-300 font-bold">PLAY: </span>
                        <span className="text-slate-300">
                          {lang === "en"
                            ? "Walk/click objects in 3D & adjust the Camera Distance bar on the right."
                            : "৩ডি-তে হেঁটে বা ক্লিক করে যন্ত্র পরিচালনা করুন এবং ডানের স্লাইডার দিয়ে ক্যামেরা দেখুন।"}
                        </span>
                      </div>
                    </div>
                  )}

                  {controlsOpen && (
                    <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside border-t border-white/10 pt-2">
                      {trail.howToPlay.map((step, i) => (
                        <li key={i}>{t(step, lang)}</li>
                      ))}
                    </ol>
                  )}

                  {renderProgressiveHintPanel(true)}
                </div>
              </div>

              {/* Full-Viewport 3D Game Stage */}
              <div key={`${trail.id}-${restartNonce}`} className="flex-1 relative min-h-[540px]">
                {renderTrailEngine()}
              </div>
            </>
          ) : (
            /* Dedicated Interactive Speed-vs-Data Lab Arena (dhk-3) */
            <div className="flex-1 bg-[#FAF8F5] text-slate-900 p-4 sm:p-6 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-5">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-2">
                    <div className="text-[11px] font-mono font-semibold text-rose-600">
                      {t(UI_DICT.mission.objective, lang)}
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {t(trail.objective, lang)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                        <span className="font-mono font-bold text-sky-700">WATCH · </span>
                        <span className="text-slate-800">{t(trail.watchDemo, lang)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="font-mono font-bold text-emerald-700">TRY · </span>
                        <span className="text-slate-800">{t(trail.tryPrompt, lang)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-4 flex flex-col justify-between gap-2">
                    <button
                      type="button"
                      onClick={advanceHint}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-950"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {hintLevel === 0
                            ? lang === "en"
                              ? "Show Hint (1/3)"
                              : "সহায়তা দেখুন (১/৩)"
                            : hintLevel === 1
                              ? lang === "en"
                                ? "Highlight Target (2/3)"
                                : "লক্ষ্য চিহ্নিত (২/৩)"
                              : hintLevel === 2
                                ? lang === "en"
                                  ? "Show Next Action (3/3)"
                                  : "পরবর্তী কাজ দেখান (৩/৩)"
                                : lang === "en"
                                  ? "Hide Hints"
                                  : "লুকান"}
                        </span>
                      </span>
                      {hintLevel > 0 ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {renderProgressiveHintPanel(false)}
                  </div>
                </div>

                <div
                  key={`${trail.id}-${restartNonce}`}
                  className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm"
                >
                  {renderTrailEngine()}
                </div>
              </div>
            </div>
          )}

          {/* Pause Modal Overlay (Escape) */}
          {paused && !justCompleted && (
            <div className="absolute inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
              <div className="max-w-sm w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 text-center space-y-4 shadow-2xl">
                <h2 className="text-xl font-bold text-white">{t(UI_DICT.mission.pause, lang)}</h2>
                <p className="text-xs text-slate-300">
                  {is3DGame
                    ? lang === "en"
                      ? "WASD / Click ground to move · Drag to orbit · Click objects or Operate"
                      : "WASD বা মাউসে ক্লিক করে সরুন · সরাসরি ক্লিক বা অপারেট ব্যবহার করুন"
                    : t(trail.title, lang)}
                </p>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaused(false)}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t(UI_DICT.mission.resume, lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                  >
                    {t(UI_DICT.mission.restart, lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/cities/${city.id}`)}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                  >
                    {t(UI_DICT.mission.exitToCity, lang)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mission Completion Overlay with DISCOVER Takeaway */}
          {justCompleted && (
            <div className="absolute inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
              <div className="max-w-md w-full rounded-2xl bg-white text-slate-900 border border-emerald-200 p-6 space-y-4 shadow-2xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-mono text-emerald-700 font-semibold">
                      #{trail.order} · {t(trail.title, lang)}
                    </div>
                    <h2 className="text-xl font-bold text-slate-950 mt-0.5">
                      {t(UI_DICT.mission.completedTitle, lang)}
                    </h2>
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono font-bold">DISCOVER · </span>
                        {t(trail.discoverNote, lang)}
                      </div>
                    </div>
                    {trail.nextTeaser && (
                      <p className="text-xs text-slate-600 mt-2">
                        {t(trail.nextTeaser.text, lang)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  {trail.nextTeaser && (
                    <button
                      type="button"
                      onClick={() => openTrail(trail.nextTeaser!.targetTrailId)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>{t(UI_DICT.mission.continueNext, lang)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openHandbookTopic(trail.handbookTopicId)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t(UI_DICT.mission.learnMore, lang)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/cities/${city.id}`)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    {t(UI_DICT.mission.exitToCity, lang)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
