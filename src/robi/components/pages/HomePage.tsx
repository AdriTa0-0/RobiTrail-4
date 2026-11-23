import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { CITIES } from "../../data/cities/cities";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { HeroWorldSection } from "../world/HeroWorldSection";
import { LivePreviewClips } from "../motion/LivePreviewClips";
import { ArrowRight, MapPin, Landmark } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const PREVIEW_MARKERS = [
  { year: "1997", x: 60, y: 66 },
  { year: "2010", x: 225, y: 36 },
  { year: "2016", x: 390, y: 76 },
  { year: "2020", x: 555, y: 36 },
  { year: "2026", x: 700, y: 62 },
];

const PREVIEW_WAVE_PATH =
  "M 60 66 C 140 66, 145 36, 225 36 C 305 36, 310 76, 390 76 C 470 76, 475 36, 555 36 C 630 36, 640 62, 700 62";

export const HomePage: React.FC = () => {
  const { lang, getCityProgress, setActiveCityId } = useRobiTrail();
  const { navigate } = useAppRouter();

  return (
    <div className="space-y-4">
      {/* 1. Animated 360° 3D Bangladesh City World + Clean Floating Controls */}
      <HeroWorldSection onScrollToCities={() => navigate("/cities")} />

      {/* 2. Four Interactive Functional Preview Blocks + Corridor Banner */}
      <LivePreviewClips />

      {/* 3. Concise City Preview Strip (Links to Dedicated /cities/:cityId Pages) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t border-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono text-rose-600 uppercase tracking-wider mb-1">
              {t(UI_DICT.cities.sectionTitle, lang)}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950 font-display">
              {lang === "en" ? "Choose Your Bangladeshi City" : "বাংলাদেশের শহর নির্বাচন করুন"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/cities")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <span>
              {lang === "en" ? "Open Full Bangladesh Map" : "সম্পূর্ণ বাংলাদেশের মানচিত্র দেখুন"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CITIES.map((city) => {
            const prog = getCityProgress(city.id);
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  setActiveCityId(city.id);
                  navigate(`/cities/${city.id}`);
                }}
                className="group text-left rounded-2xl bg-white border border-slate-200 hover:border-rose-400 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 font-mono mb-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      {t(city.regionLabel, lang)}
                    </span>
                    <span className="font-mono-num text-slate-800 font-bold">
                      {prog.completed}/{prog.total}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 group-hover:text-rose-700 transition-colors">
                    {t(city.name, lang)}
                  </h3>
                  <p className="text-xs text-slate-700 mt-1.5 line-clamp-2">
                    {t(city.description, lang)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-600">
                  <span>{lang === "en" ? "Explore City & Games" : "শহর ও গেম দেখুন"}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Compact Animated 1997–2026 Robi Journey Teaser */}
      <HomeJourneyPreview />
    </div>
  );
};

const HomeJourneyPreview: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const curvePathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (curvePathRef.current) {
        const len = curvePathRef.current.getTotalLength();
        gsap.set(curvePathRef.current, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(curvePathRef.current, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: previewRef.current,
            start: "top 82%",
            once: true,
          },
        });
      }
    }, previewRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={previewRef} className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
      <div className="rounded-2xl bg-stone-900 text-stone-100 p-6 sm:p-8 border border-stone-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-300">
              <Landmark className="w-4 h-4" />
              <span>1997 — 2026</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white font-display">
              {lang === "en" ? "A Journey Through Connection" : "সংযোগের পথে এক দীর্ঘ যাত্রা"}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/robi-journey")}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <span>{lang === "en" ? "Explore the Journey" : "যাত্রা শুরু করুন"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Short Compact Curved SVG Timeline Wave */}
        <div className="rounded-xl bg-stone-950/90 border border-stone-800 px-3 py-4">
          <svg
            viewBox="0 0 760 112"
            className="w-full h-24 sm:h-28 overflow-visible"
            role="img"
            aria-label="1997 to 2026 connection curve preview"
          >
            <path
              d={PREVIEW_WAVE_PATH}
              fill="none"
              stroke="#44403C"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              ref={curvePathRef}
              d={PREVIEW_WAVE_PATH}
              fill="none"
              stroke="#E11D48"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {PREVIEW_MARKERS.map((pt) => (
              <g key={pt.year} className="cursor-pointer" onClick={() => navigate("/robi-journey")}>
                <circle cx={pt.x} cy={pt.y} r="9" fill="#0C0A09" stroke="#F43F5E" strokeWidth="3" />
                <text
                  x={pt.x}
                  y={pt.y > 55 ? pt.y + 24 : pt.y - 16}
                  textAnchor="middle"
                  fill="#FDE68A"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {pt.year}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
};
