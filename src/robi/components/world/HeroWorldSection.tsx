import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { CITIES } from "../../data/cities/cities";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { CityWorld3D } from "./CityWorld3D";
import { ChevronDown, MapPin, ZoomIn, ZoomOut, RotateCcw, Play, Compass } from "lucide-react";

export const HeroWorldSection: React.FC<{ onScrollToCities: () => void }> = ({
  onScrollToCities,
}) => {
  const {
    lang,
    activeCity,
    setActiveCityId,
    getCityProgress,
    cameraDistance,
    setCameraDistance,
    triggerResetView,
  } = useRobiTrail();
  const { navigate } = useAppRouter();

  const [cityMenuOpen, setCityMenuOpen] = useState(false);

  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headlineRef.current) {
        gsap.fromTo(
          headlineRef.current.querySelectorAll(".word-reveal"),
          { y: 12, opacity: 1 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.04,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
        );
      }
      if (subRef.current) {
        gsap.fromTo(
          subRef.current,
          { y: 8, opacity: 1 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            delay: 0.15,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
      }
    });
    return () => ctx.revert();
  }, [lang, activeCity.id]);

  // Close city dropdown on outside pointer click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(target)) {
        setCityMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCityMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const words = t(UI_DICT.hero.headline, lang).split(" ");

  return (
    <section
      id="world-stage"
      className="relative w-full h-[80vh] min-h-[540px] max-h-[820px] bg-slate-950 overflow-hidden"
    >
      {/* Full 360-degree 3D Bangladesh City Canvas */}
      <CityWorld3D />

      {/* Subtle top readability scrim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 sm:h-56 bg-gradient-to-b from-slate-950/90 via-slate-950/45 to-transparent z-10" />

      {/* Top Responsive Overlay: Headline + CTAs and City Selector (Stacked cleanly on < sm to prevent overlap) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 sm:p-6 md:px-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* City Selector First on Mobile Top-Right, Right on Desktop */}
        <div className="pointer-events-auto flex justify-end sm:order-2 shrink-0">
          <div ref={cityDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setCityMenuOpen((o) => !o)}
              aria-expanded={cityMenuOpen}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/20 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-slate-300 font-normal hidden sm:inline">
                {lang === "en" ? "City:" : "শহর:"}
              </span>
              <span>{t(activeCity.name, lang)}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-300 transition-transform ${cityMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {cityMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-950 border border-white/15 shadow-2xl p-1.5 text-white space-y-1 z-40">
                {CITIES.map((c) => {
                  const prog = getCityProgress(c.id);
                  const selected = c.id === activeCity.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCityId(c.id);
                        setCityMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                        selected ? "bg-rose-600 text-white" : "hover:bg-white/10 text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{t(c.name, lang)}</div>
                        <div
                          className={`text-[11px] ${selected ? "text-rose-100" : "text-slate-400"}`}
                        >
                          {c.trailIds.length} {lang === "en" ? "Trails" : "টি ট্রেইল"}
                        </div>
                      </div>
                      <span className="font-mono-num text-xs font-bold opacity-90">
                        {prog.completed}/{prog.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Clean Headline & Primary Play / Explore Cities CTAs */}
        <div className="sm:order-1 max-w-lg pr-2 sm:pr-6">
          <div className="flex items-center gap-2 text-xs text-amber-200 font-semibold tracking-wide mb-1.5 sm:mb-2">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="shrink-0">{t(activeCity.name, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t(activeCity.tagline, lang)}</span>
          </div>

          <h1
            ref={headlineRef}
            className={`text-2xl sm:text-4xl lg:text-[2.5rem] font-extrabold text-white tracking-tight text-balance font-display ${
              lang === "bn" ? "leading-[1.32]" : "leading-[1.18]"
            }`}
          >
            {words.map((w, i) => (
              <span key={i} className="inline-block py-0.5 mr-[0.26em] align-bottom">
                <span className="word-reveal inline-block">{w}</span>
              </span>
            ))}
          </h1>

          <p
            ref={subRef}
            className="mt-2 text-xs sm:text-sm text-slate-100 leading-relaxed max-w-md"
          >
            {t(UI_DICT.hero.subheadline, lang)}
          </p>

          <div className="pointer-events-auto mt-3.5 sm:mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/games")}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition-all duration-150 shadow-md hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t(UI_DICT.hero.playCta, lang)}</span>
            </button>

            <button
              type="button"
              onClick={onScrollToCities}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/25 text-white text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-300" />
              <span>{t(UI_DICT.hero.enterExplore, lang)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-Right Unobtrusive Camera Controls */}
      <div className="hidden sm:flex absolute bottom-4 right-4 md:right-6 z-20 items-center gap-1.5 rounded-xl bg-slate-950/90 border border-white/15 px-2.5 py-1.5 shadow-lg text-white">
        <button
          type="button"
          onClick={() => setCameraDistance(Math.max(10, cameraDistance - 4))}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Zoom in"
          title={t(UI_DICT.hero.closer, lang)}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={10}
          max={42}
          step={1}
          value={cameraDistance}
          onChange={(e) => setCameraDistance(Number(e.target.value))}
          aria-label={t(UI_DICT.hero.cameraDistance, lang)}
          className="w-20 accent-rose-500 cursor-pointer"
        />

        <button
          type="button"
          onClick={() => setCameraDistance(Math.min(42, cameraDistance + 4))}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Zoom out"
          title={t(UI_DICT.hero.wider, lang)}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono-num text-[11px] text-amber-300 w-7 text-right">
          {cameraDistance}m
        </span>

        <button
          type="button"
          onClick={triggerResetView}
          className="ml-0.5 p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white cursor-pointer"
          title={t(UI_DICT.hero.resetView, lang)}
          aria-label={t(UI_DICT.hero.resetView, lang)}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
