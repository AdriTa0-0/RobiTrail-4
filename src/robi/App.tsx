import { motion } from "motion/react";
import React, { useEffect } from "react";
import { RouterProvider, useAppRouter } from "./router/RouterContext";
import { RobiTrailProvider, useRobiTrail } from "./context/RobiTrailContext";
import { APP_CONFIG } from "./config/appConfig";
import { t, UI_DICT } from "./data/translations/dictionary";
import { VersionMarquee } from "./components/motion/VersionMarquee";
import { HomePage } from "./components/pages/HomePage";
import { CitiesPage } from "./components/pages/CitiesPage";
import { GamesDirectoryPage } from "./components/pages/GamesDirectoryPage";
import { GameArenaPage } from "./components/pages/GameArenaPage";
import { SignalWavesExhibitPage } from "./components/pages/SignalWavesExhibitPage";
import { RobiJourneySection } from "./components/museum/RobiJourneySection";
import { VideosTutorialsSection } from "./components/videos/VideosTutorialsSection";
import {
  InteractiveHandbookSection,
  HandbookQuickDrawer,
} from "./components/handbook/InteractiveHandbookSection";
import { CertificationSection } from "./components/certification/CertificationSection";
import { AboutPage } from "./components/pages/AboutPage";
import { AccountPage } from "./components/pages/AccountPage";
import { TokenCenterPage } from "./components/pages/TokenCenterPage";
import { BangladeshResearchPage } from "./components/pages/BangladeshResearchPage";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { ambientSynth } from "./services/audio/ambientSynth";
import { AnimatedTokenCount, TokenEmblem } from "./components/tokens/TokenEmblem";
import { TokenAccessModals } from "./components/tokens/TokenAccessModals";
import { TokenToastOverlay } from "./components/tokens/TokenToastOverlay";
import { AlertTriangle, Volume2, VolumeX, UserCircle2 } from "lucide-react";

const RobiTrailLogo: React.FC = () => (
  <span className="inline-flex items-center gap-2 select-none">
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Radiating signal arcs */}
      <path
        d="M22.5 7.5C25.2 10.2 25.2 14.8 22.5 17.5"
        stroke="#E11D48"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M25.8 4.8C30.1 9.1 30.1 15.9 25.8 20.2"
        stroke="#FB7185"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Map pin body */}
      <path
        d="M13.5 4C8.8 4 5 7.7 5 12.4C5 18.7 13.5 28 13.5 28C13.5 28 22 18.7 22 12.4C22 7.7 18.2 4 13.5 4Z"
        fill="#E11D48"
      />
      <circle cx="13.5" cy="12.2" r="3.4" fill="#FFFFFF" />
    </svg>
    <span className="text-lg sm:text-xl font-extrabold tracking-tight font-display leading-none">
      <span className="text-rose-600">Robi</span>
      <span className="text-slate-950">Trail</span>
    </span>
  </span>
);

const RobiTrailShell: React.FC = () => {
  const { lang, setLang, soundEnabled, setSoundEnabled, accountProfile, signedIn, tokenWallet } =
    useRobiTrail();
  const { route, navigate, pendingExitPath, confirmLeaveMission, cancelLeaveMission } =
    useAppRouter();

  const isGameSession = route.name === "game-session";

  // Mild Bangla gameplay music ONLY when in an active game session AND soundEnabled is true
  useEffect(() => {
    if (isGameSession && soundEnabled) {
      const citySeed = route.cityId === "dhaka" ? 1 : route.cityId === "sylhet" ? 2 : 0;
      ambientSynth.startGameplayMusic(citySeed);
      return () => {
        ambientSynth.stopAmbient();
      };
    }
    ambientSynth.stopAmbient();
    return undefined;
  }, [isGameSession, soundEnabled, route]);

  // Tactile click sound across buttons when sound is enabled
  useEffect(() => {
    if (!soundEnabled) return undefined;
    const handlePointerClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('button, a, [role="button"]')) {
        ambientSynth.playClick(true);
      }
    };
    window.addEventListener("click", handlePointerClick, true);
    return () => window.removeEventListener("click", handlePointerClick, true);
  }, [soundEnabled]);

  const navItems = [
    { key: "cities", path: "/cities", label: t(UI_DICT.nav.exploreCities, lang) },
    { key: "games", path: "/games", label: t(UI_DICT.nav.games, lang) },
    { key: "robi-journey", path: "/robi-journey", label: t(UI_DICT.nav.robiJourney, lang) },
    { key: "videos", path: "/videos", label: t(UI_DICT.nav.videosTutorials, lang) },
    { key: "handbook", path: "/handbook", label: t(UI_DICT.nav.handbook, lang) },
    { key: "certification", path: "/certification", label: t(UI_DICT.nav.certification, lang) },
    { key: "about", path: "/about", label: lang === "bn" ? "আমাদের কথা" : "About" },
  ] as const;

  const accountLabel =
    signedIn && accountProfile?.displayName
      ? accountProfile.displayName.split(" ")[0].slice(0, 14)
      : t(UI_DICT.nav.account, lang);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900">
      {/* Sticky Single-Line Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-[0_1px_10px_rgba(15,23,42,0.04)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-5">
          {/* Zone 1: Custom RobiTrail SVG Mark + Wordmark */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="whitespace-nowrap shrink-0 cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            aria-label="RobiTrail Home"
          >
            <RobiTrailLogo />
          </button>

          {/* Zone 2: Concise Single-Line Route Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-700"
          >
            {navItems.map((item) => {
              const active =
                route.name === item.key ||
                (item.key === "games" && route.name === "game-session") ||
                (item.key === "handbook" && route.name === "research-bangladesh");
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`relative px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "text-rose-700 font-bold bg-rose-50/90"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 hover:-translate-y-[1px]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span
                      className="absolute left-3 right-3 bottom-0.5 h-[2px] rounded-full bg-rose-600"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Sound Toggle, Language Toggle & Account */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs transition-all duration-150 cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title={soundEnabled ? t(UI_DICT.hero.soundOn, lang) : t(UI_DICT.hero.soundOff, lang)}
              aria-label={
                soundEnabled ? t(UI_DICT.hero.soundOn, lang) : t(UI_DICT.hero.soundOff, lang)
              }
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Switch language"
            >
              {lang === "en" ? "বাংলা" : "EN"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/tokens")}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.name === "tokens"
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-slate-900"
              }`}
              title={t(UI_DICT.nav.tokenCenter, lang)}
              aria-label={t(UI_DICT.nav.tokenCenter, lang)}
            >
              <TokenEmblem size="xs" />
              {signedIn ? (
                <AnimatedTokenCount value={tokenWallet?.balance ?? 0} className="text-rose-700" />
              ) : (
                <span className="text-rose-700">{t(UI_DICT.nav.tokenCenter, lang)}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/account")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:-translate-y-[1px] ${
                route.name === "account"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              }`}
            >
              <UserCircle2 className="w-4 h-4" />
              <span>{accountLabel}</span>
            </button>
          </div>
        </div>

        {/* Compact Mobile Secondary Navigation Strip (hidden inside active game sessions) */}
        {!isGameSession && (
          <div className="md:hidden border-t border-slate-100 bg-slate-50/95 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const active = route.name === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? "bg-rose-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate("/tokens")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                route.name === "tokens"
                  ? "bg-rose-600 text-white"
                  : "bg-amber-50 text-rose-700 border border-amber-200 hover:border-rose-300"
              }`}
            >
              {t(UI_DICT.nav.tokenCenter, lang)}
            </button>
          </div>
        )}
      </header>

      {/* Moving Narrative Ticker on non-game routes */}
      {!isGameSession && <VersionMarquee />}

      <main className="flex-1 flex flex-col">
        {route.name === "home" && <HomePage />}
        {route.name === "cities" && <CitiesPage routeCityId={route.cityId} />}
        {route.name === "games" && <GamesDirectoryPage routeCityId={route.cityId} />}
        {route.name === "game-session" && (
          <GameArenaPage cityId={route.cityId} gameId={route.gameId} />
        )}
        {route.name === "discover" && <SignalWavesExhibitPage />}
        {route.name === "robi-journey" && <RobiJourneySection />}
        {route.name === "videos" && <VideosTutorialsSection />}
        {route.name === "handbook" && <InteractiveHandbookSection />}
        {route.name === "research-bangladesh" && <BangladeshResearchPage />}
        {route.name === "certification" && <CertificationSection />}
        {route.name === "account" && <AccountPage />}
        {route.name === "tokens" && <TokenCenterPage />}
        {route.name === "about" && <AboutPage />}
      </main>

      {!isGameSession && (
        <motion.footer
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 bg-slate-950 text-slate-300 border-t border-slate-800 py-10"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-6 md:grid-cols-2 md:items-start text-sm">
            <div className="space-y-2">
              <div>
                <strong className="text-white font-display text-base">RobiTrail</strong>
                <span className="text-slate-500"> · v{APP_CONFIG.version}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/research/bangladesh")}
                className="text-sky-300 hover:text-sky-200 hover:underline underline-offset-4 cursor-pointer"
              >
                {t(UI_DICT.nav.research, lang)}
              </button>
            </div>
            <div className="space-y-2 md:text-right">
              <p className="text-slate-300 leading-relaxed">
                {lang === "bn"
                  ? "BDapps Tech Quest-এর জন্য নির্মিত একটি শিক্ষামূলক ইন্টারঅ্যাকটিভ অ্যাপ। বাংলাদেশের ডিজিটাল যোগাযোগ ও প্রযুক্তি সম্পর্কে শেখাকে আরও সহজ, আকর্ষণীয় ও উপভোগ্য করে তোলাই আমাদের লক্ষ্য।"
                  : "An interactive educational app built for BDapps Tech Quest. Our goal is to make learning about digital communication and technology in Bangladesh easier, more engaging and more enjoyable."}
              </p>
              <p className="text-xs text-slate-500">
                {lang === "bn"
                  ? "Team Torongo-র তৈরি একটি স্বাধীন শিক্ষার্থী-নির্মিত শিক্ষামূলক প্রকল্প; রবি আজিয়াটা পিএলসি বা bdapps-এর আনুষ্ঠানিক পণ্য নয়।"
                  : "An independent, student-developed educational project by Team Torongo. Not an official Robi Axiata PLC or bdapps product."}
              </p>
            </div>
          </div>
        </motion.footer>
      )}

      {/* Mid-Mission Exit Confirmation Dialog */}
      {pendingExitPath && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-sm w-full rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  {t(UI_DICT.mission.leaveTitle, lang)}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {t(UI_DICT.mission.leaveBody, lang)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelLeaveMission}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                {t(UI_DICT.mission.stayBtn, lang)}
              </button>
              <button
                type="button"
                onClick={confirmLeaveMission}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                {t(UI_DICT.mission.leaveBtn, lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Handbook Quick Drawer */}
      <HandbookQuickDrawer />

      {/* Token Economy Access Gate Modals & Subtle Notifications */}
      <TokenAccessModals />
      <TokenToastOverlay />
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider>
        <RobiTrailProvider>
          <RobiTrailShell />
        </RobiTrailProvider>
      </RouterProvider>
    </AppErrorBoundary>
  );
}
