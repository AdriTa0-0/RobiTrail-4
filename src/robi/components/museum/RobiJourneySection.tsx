import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BangladeshMapBackdrop } from "../common/BangladeshMapBackdrop";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import {
  ROBI_TIMELINE,
  type RobiTimelineMilestone,
  type VerifiedArchivePhoto,
} from "../../data/robiTimeline";
import type { Lang } from "../../data/translations/dictionary";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Landmark,
  PlayCircle,
  X,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Desktop serpentine curve points inside SVG viewBox 0 0 900 1920 with generous top/bottom safe padding
const DESKTOP_SVG_H = 1920;
const CURVE_POINTS = ROBI_TIMELINE.map((_, i) => ({
  x: i % 2 === 0 ? 245 : 655,
  y: 140 + i * 234,
}));

function buildSerpentineSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midY = (p1.y + p2.y) / 2;
    d += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const DESKTOP_PATH_D = buildSerpentineSvgPath(CURVE_POINTS);

const EraDiagramArt: React.FC<{ media: RobiTimelineMilestone["media"] }> = ({ media }) => {
  return (
    <div className="rounded-xl overflow-hidden border border-stone-200 bg-slate-950 text-white">
      <svg
        viewBox="0 0 560 200"
        className="w-full h-44 object-cover block"
        role="img"
        aria-label={media.title.en}
      >
        <defs>
          <linearGradient id={`grad-${media.eraCode}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop
              offset="100%"
              stopColor={
                media.eraCode.includes("2026") || media.eraCode.includes("2010")
                  ? "#4c0519"
                  : "#1e293b"
              }
            />
          </linearGradient>
        </defs>
        <rect width="560" height="200" fill={`url(#grad-${media.eraCode})`} />
        <g opacity="0.16" stroke="#94a3b8" strokeWidth="1">
          {[40, 80, 120, 160].map((y) => (
            <line key={y} x1="0" y1={y} x2="560" y2={y} />
          ))}
          {[80, 160, 240, 320, 400, 480].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="200" />
          ))}
        </g>

        {media.eraCode === "1997-aktel" && (
          <g>
            <path
              d="M120 175 L140 52 L160 175 M128 130 L152 130 M133 95 L147 95"
              stroke="#e2e8f0"
              strokeWidth="3"
              fill="none"
            />
            <circle cx="140" cy="48" r="6" fill="#f59e0b" />
            <circle
              cx="140"
              cy="48"
              r="24"
              stroke="#f59e0b"
              strokeOpacity="0.45"
              fill="none"
              strokeWidth="2"
            />
            <circle
              cx="140"
              cy="48"
              r="44"
              stroke="#f59e0b"
              strokeOpacity="0.25"
              fill="none"
              strokeWidth="2"
            />
            <rect
              x="360"
              y="70"
              width="44"
              height="86"
              rx="8"
              fill="#334155"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <rect x="368" y="82" width="28" height="22" rx="3" fill="#38bdf8" opacity="0.8" />
            <line
              x1="392"
              y1="70"
              x2="392"
              y2="50"
              stroke="#cbd5e1"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <text
              x="280"
              y="106"
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="13"
              fontFamily="monospace"
            >
              GSM 900 MHz · VOICE ERA
            </text>
          </g>
        )}

        {media.eraCode === "2008-axiata" && (
          <g>
            <circle cx="190" cy="100" r="38" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="370" cy="100" r="38" fill="none" stroke="#f43f5e" strokeWidth="3" />
            <path
              d="M228 100 Q280 65 332 100"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeDasharray="5 4"
            />
            <text
              x="190"
              y="104"
              textAnchor="middle"
              fill="#bae6fd"
              fontSize="12"
              fontWeight="bold"
            >
              ASIA HUB
            </text>
            <text
              x="370"
              y="104"
              textAnchor="middle"
              fill="#fecdd3"
              fontSize="12"
              fontWeight="bold"
            >
              AXIATA BD
            </text>
          </g>
        )}

        {media.eraCode === "2010-robi" && (
          <g>
            <circle cx="280" cy="128" r="44" fill="#e11d48" />
            <circle
              cx="280"
              cy="128"
              r="56"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="8 6"
            />
            <path d="M90 128 L210 128 M350 128 L470 128" stroke="#fda4af" strokeWidth="2" />
            <text
              x="280"
              y="133"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="15"
              fontWeight="bold"
            >
              ROBI · 2010
            </text>
          </g>
        )}

        {media.eraCode === "2016-merger" && (
          <g>
            <rect
              x="115"
              y="65"
              width="110"
              height="64"
              rx="10"
              fill="#9f1239"
              stroke="#fda4af"
              strokeWidth="2"
            />
            <rect
              x="335"
              y="65"
              width="110"
              height="64"
              rx="10"
              fill="#7f1d1d"
              stroke="#fca5a5"
              strokeWidth="2"
            />
            <path d="M225 97 L335 97" stroke="#10b981" strokeWidth="4" />
            <circle cx="280" cy="97" r="16" fill="#10b981" />
            <text x="170" y="102" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
              ROBI
            </text>
            <text x="390" y="102" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
              AIRTEL
            </text>
            <text
              x="280"
              y="102"
              textAnchor="middle"
              fill="#022c22"
              fontSize="14"
              fontWeight="bold"
            >
              +
            </text>
          </g>
        )}

        {media.eraCode === "2018-5g-trial" && (
          <g>
            <rect x="90" y="128" width="90" height="32" rx="6" fill="#0284c7" />
            <rect x="235" y="100" width="90" height="60" rx="6" fill="#0ea5e9" />
            <rect x="380" y="54" width="90" height="106" rx="6" fill="#e11d48" />
            <text x="135" y="148" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
              3G
            </text>
            <text x="280" y="134" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
              4G LTE
            </text>
            <text x="425" y="112" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
              5G &gt;1 Gbps
            </text>
          </g>
        )}

        {media.eraCode === "2020-ipo" && (
          <g>
            <polyline
              points="80,152 170,136 250,118 330,90 450,56"
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="450" cy="56" r="7" fill="#fbbf24" />
            <text
              x="280"
              y="168"
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="12"
              fontFamily="monospace"
            >
              DSE · CSE · TK 523 CRORE IPO
            </text>
          </g>
        )}

        {media.eraCode === "2024-plc" && (
          <g>
            <path d="M262 168 L280 56 L298 168" stroke="#e2e8f0" strokeWidth="3" fill="none" />
            <rect
              x="130"
              y="124"
              width="76"
              height="44"
              rx="4"
              fill="#0369a1"
              stroke="#7dd3fc"
              strokeWidth="2"
            />
            <line x1="206" y1="146" x2="262" y2="146" stroke="#10b981" strokeWidth="3" />
            <text
              x="168"
              y="150"
              textAnchor="middle"
              fill="#e0f2fe"
              fontSize="11"
              fontWeight="bold"
            >
              SOLAR
            </text>
            <text
              x="392"
              y="104"
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="12"
              fontFamily="monospace"
            >
              ROBI AXIATA PLC
            </text>
          </g>
        )}

        {media.eraCode === "2026-5g-era" && (
          <g>
            <line
              x1="180"
              y1="100"
              x2="365"
              y2="145"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />
            <line
              x1="180"
              y1="100"
              x2="365"
              y2="55"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />
            <circle cx="180" cy="100" r="14" fill="#e11d48" />
            <circle cx="365" cy="145" r="12" fill="#f59e0b" />
            <circle cx="365" cy="55" r="12" fill="#10b981" />
            <text x="180" y="130" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
              Dhaka
            </text>
            <text
              x="365"
              y="172"
              textAnchor="middle"
              fill="#fde68a"
              fontSize="11"
              fontWeight="bold"
            >
              Chattogram
            </text>
            <text x="365" y="34" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="bold">
              Sylhet
            </text>
          </g>
        )}
      </svg>
      <div className="px-3.5 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <span className="font-mono text-amber-300">{media.title.en}</span>
        <span className="text-slate-400 text-[10px]">Architectural Vector Diagram</span>
      </div>
    </div>
  );
};

const ArchivalPhotoGallery: React.FC<{
  photos: VerifiedArchivePhoto[];
  lang: Lang;
  milestoneId: string;
}> = ({ photos, lang, milestoneId }) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [pausedHover, setPausedHover] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSlideIdx(0);
  }, [milestoneId]);

  useEffect(() => {
    if (photos.length < 2 || pausedHover) return undefined;
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % photos.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [photos.length, pausedHover]);

  if (photos.length === 0) return null;
  const activePhoto = photos[slideIdx % photos.length];

  return (
    <div
      className="rounded-xl overflow-hidden border border-stone-200 bg-stone-900 text-white"
      onMouseEnter={() => setPausedHover(true)}
      onMouseLeave={() => setPausedHover(false)}
    >
      <div className="relative h-56 sm:h-64 bg-slate-950 overflow-hidden">
        {photos.map((photo, idx) => {
          const visible = idx === slideIdx;
          const broken = failedUrls[photo.url];
          return (
            <div
              key={photo.url}
              className={`absolute inset-0 transition-opacity duration-700 ${
                visible ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {broken ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-rose-950/60 text-center space-y-2">
                  <Camera className="w-7 h-7 text-rose-300" />
                  <div className="text-xs font-bold text-white">{photo.title[lang]}</div>
                  <a
                    href={photo.sourcePage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-amber-300 underline"
                  >
                    <span>Wikimedia Commons Archive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <img
                  src={photo.url}
                  alt={photo.title[lang]}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedUrls((prev) => ({ ...prev, [photo.url]: true }))}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            </div>
          );
        })}

        {/* Slide Controls (Only when 2+ verified photos exist) */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous archive photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-950/75 hover:bg-rose-600 text-white border border-white/20 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % photos.length)}
              aria-label="Next archive photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-950/75 hover:bg-rose-600 text-white border border-white/20 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1.5">
              {photos.map((p, idx) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={`Photo ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === slideIdx ? "w-5 bg-rose-400" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-2.5 left-3 z-20 right-16">
          <div className="text-[11px] font-mono text-amber-300 font-semibold">
            {activePhoto.year} · {activePhoto.license}
          </div>
          <div className="text-xs font-bold text-white truncate">{activePhoto.title[lang]}</div>
        </div>
      </div>

      <div className="px-3.5 py-2.5 bg-stone-950 text-[11px] text-stone-300 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5 max-w-md">
          <p className="text-stone-200">{activePhoto.description[lang]}</p>
          <p className="text-stone-400">{activePhoto.attribution}</p>
        </div>
        <a
          href={activePhoto.sourcePage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium shrink-0"
        >
          <span>{lang === "en" ? "Source" : "সূত্র"}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

const MobileWaveTimeline: React.FC<{ lang: Lang; onSelect: (i: number) => void }> = ({
  lang,
  onSelect,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string }>({ w: 0, h: 0, d: "" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const box = wrap.getBoundingClientRect();
      const pts = nodeRefs.current.filter(Boolean).map((n) => {
        const r = n!.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      if (pts.length === 0) return;
      // Wave: from each node swing out toward the opposite side, like the desktop serpentine.
      let d = `M ${pts[0].x} ${Math.max(0, pts[0].y - 40)} L ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dy = p2.y - p1.y;
        d += ` C ${p1.x} ${p1.y + dy * 0.55}, ${p2.x} ${p2.y - dy * 0.55}, ${p2.x} ${p2.y}`;
      }
      const last = pts[pts.length - 1];
      d += ` L ${last.x} ${last.y + 40}`;
      setGeo({ w: box.width, h: box.height, d });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [lang]);

  useEffect(() => {
    const onScroll = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.7 - r.top) / Math.max(1, r.height);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={wrapRef} className="md:hidden relative py-6">
      {geo.d && (
        <svg
          width={geo.w}
          height={geo.h}
          viewBox={`0 0 ${geo.w} ${geo.h}`}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <path d={geo.d} fill="none" stroke="#D6D3D1" strokeWidth="9" strokeLinecap="round" />
          <path
            d={geo.d}
            fill="none"
            stroke="#FAF8F5"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
          <path
            d={geo.d}
            fill="none"
            stroke="#E11D48"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - progress}
          />
        </svg>
      )}
      <div className="relative space-y-10">
        {ROBI_TIMELINE.map((ms, idx) => {
          const right = idx % 2 === 1;
          return (
            <div
              key={ms.id}
              className={`timeline-node-marker flex items-center gap-3 ${right ? "flex-row-reverse" : ""}`}
            >
              <button
                ref={(el) => {
                  nodeRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => onSelect(idx)}
                aria-label={`${ms.year}: ${ms.title[lang]}`}
                className="relative z-10 w-14 h-14 shrink-0 rounded-full bg-white border-4 border-rose-600 text-stone-900 font-mono-num text-xs font-extrabold flex items-center justify-center shadow-md cursor-pointer hover:bg-rose-600 hover:text-white transition-colors"
              >
                {ms.year}
              </button>
              <button
                type="button"
                onClick={() => onSelect(idx)}
                className={`relative z-10 flex-1 min-w-0 rounded-2xl bg-white/95 backdrop-blur-sm border border-stone-200 hover:border-rose-400 p-4 shadow-md space-y-1 cursor-pointer ${right ? "text-right" : "text-left"}`}
              >
                <div className="text-[11px] font-mono text-rose-700 font-semibold">
                  {ms.exactDate[lang]}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-snug break-words">
                  {ms.title[lang]}
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed break-words">
                  {ms.shortDetail[lang]}
                </p>
                <div
                  className={`pt-1 text-xs font-semibold text-rose-600 inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}
                >
                  <span>{lang === "en" ? "Read milestone details" : "বিস্তারিত পড়ুন"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RobiJourneySection: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressPathRef = useRef<SVGPathElement | null>(null);

  // Scroll-scrubbed progressive path draw & marker reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (progressPathRef.current) {
        const len = progressPathRef.current.getTotalLength();
        gsap.set(progressPathRef.current, {
          strokeDasharray: len,
          strokeDashoffset: len,
        });
        gsap.to(progressPathRef.current, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 65%",
            end: "bottom 80%",
            scrub: 0.6,
          },
        });
      }

      gsap.utils.toArray<HTMLElement>(".timeline-node-marker").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.92, y: 14, opacity: 0.45 },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [lang]);

  // Body scroll lock & keyboard shortcuts when milestone detail modal is open
  useEffect(() => {
    if (selectedIdx === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIdx(null);
      } else if (e.key === "ArrowRight") {
        setSelectedIdx((i) => (i === null ? null : Math.min(ROBI_TIMELINE.length - 1, i + 1)));
      } else if (e.key === "ArrowLeft") {
        setSelectedIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIdx]);

  const activeMilestone = selectedIdx !== null ? ROBI_TIMELINE[selectedIdx] : null;

  return (
    <section
      id="robi-journey"
      className="relative overflow-x-clip border-t border-stone-200 min-h-[86vh]"
    >
      <BangladeshMapBackdrop />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10 sm:space-y-12">
        {/* Clean Editorial Museum Header */}
        <header className="max-w-3xl space-y-2.5 bg-white/75 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-700 uppercase tracking-widest">
            <Landmark className="w-4 h-4" />
            <span>1997 — 2026 · Digital Museum</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight font-display">
            {lang === "en"
              ? "Robi Journey: A Connection Through Time"
              : "রবির পথচলা — সংযোগের ইতিহাস"}
          </h1>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            {lang === "en"
              ? "Follow the winding route across Bangladesh’s telecommunications milestones. Click any circular year node or milestone card to open curated diagrams, verified archival photos, and primary references."
              : "বাংলাদেশের টেলিকম পথচলার বাঁকে বাঁকে ছড়িয়ে থাকা মাইলফলকগুলো দেখুন। সংরক্ষিত চিত্র, যাচাইকৃত ছবি ও তথ্যসূত্র খুলতে যেকোনো বছরের বৃত্ত বা কার্ডে ক্লিক করুন।"}
          </p>
        </header>

        {/* Serpentine Winding Timeline Container (Generous Safe Margins — Zero Clipping) */}
        <div ref={containerRef} className="relative py-4">
          {/* DESKTOP WINDING SERPENTINE SVG ROUTE (md and larger) */}
          <div className="hidden md:block relative w-full h-[1920px]">
            <svg
              viewBox={`0 0 900 ${DESKTOP_SVG_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <path
                d={DESKTOP_PATH_D}
                fill="none"
                stroke="#D6D3D1"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d={DESKTOP_PATH_D}
                fill="none"
                stroke="#FAF8F5"
                strokeWidth="3"
                strokeDasharray="10 12"
                strokeLinecap="round"
              />
              <path
                ref={progressPathRef}
                d={DESKTOP_PATH_D}
                fill="none"
                stroke="#E11D48"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </svg>

            {/* Circular Year Nodes Positioned Precisely on Serpentine Anchor Points */}
            {ROBI_TIMELINE.map((ms, idx) => {
              const pt = CURVE_POINTS[idx];
              const leftPct = (pt.x / 900) * 100;
              const topPct = (pt.y / DESKTOP_SVG_H) * 100;
              const onLeft = idx % 2 === 0;
              const isSelected = selectedIdx === idx;

              return (
                <div
                  key={ms.id}
                  className="timeline-node-marker absolute -translate-y-1/2 flex items-center"
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                  }}
                >
                  {/* Circular Year Node centered on curve vertex */}
                  <button
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    aria-label={`${ms.year}: ${ms.title[lang]}`}
                    className={`relative -translate-x-1/2 w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/40 z-20 ${
                      isSelected
                        ? "bg-rose-600 border-amber-300 text-white scale-110 shadow-xl"
                        : "bg-white border-rose-600 text-stone-900 hover:bg-rose-600 hover:text-white hover:scale-105 shadow-md"
                    }`}
                  >
                    <span className="font-mono-num text-sm font-extrabold leading-none">
                      {ms.year}
                    </span>
                  </button>

                  {/* Connector Line + Safe-Bounded Milestone Card */}
                  <div
                    onClick={() => setSelectedIdx(idx)}
                    className={`absolute top-1/2 -translate-y-1/2 w-[13.5rem] lg:w-[18rem] cursor-pointer rounded-2xl bg-white/95 hover:bg-white border border-stone-200 hover:border-rose-400 p-4 shadow-sm hover:shadow-lg transition-all z-10 ${
                      onLeft ? "left-11 text-left" : "right-11 text-right"
                    }`}
                  >
                    <div className="text-[11px] font-mono text-rose-700 font-semibold">
                      {ms.exactDate[lang]}
                    </div>
                    <h2 className="text-sm font-bold text-stone-900 mt-0.5 leading-snug">
                      {ms.title[lang]}
                    </h2>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {ms.shortDetail[lang]}
                    </p>
                    <div
                      className={`mt-2 text-[11px] font-semibold text-rose-600 inline-flex items-center gap-1 ${
                        !onLeft ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span>{lang === "en" ? "Open milestone story" : "বিস্তারিত দেখুন"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MOBILE & SMALL TABLET: measured wave path through each year node (< md) */}
          <MobileWaveTimeline lang={lang} onSelect={setSelectedIdx} />
        </div>
      </div>

      {/* ISOLATED CLICK-TO-OPEN MILESTONE DETAIL MODAL */}
      {activeMilestone && selectedIdx !== null && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/80 flex items-center justify-center p-0 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeline-modal-title"
          onClick={() => setSelectedIdx(null)}
        >
          <div
            className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Modal Header */}
            <div className="px-5 py-4 bg-stone-950 text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-xs font-mono text-amber-300">
                  {activeMilestone.year} · {activeMilestone.exactDate[lang]}
                </div>
                <h2 id="timeline-modal-title" className="text-lg sm:text-xl font-bold leading-snug">
                  {activeMilestone.title[lang]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Close milestone detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Internally Scrollable Event Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Verified Open-License Archival Photo Slideshow (when verified photos exist) */}
              {activeMilestone.media.photos && activeMilestone.media.photos.length > 0 && (
                <ArchivalPhotoGallery
                  photos={activeMilestone.media.photos}
                  lang={lang}
                  milestoneId={activeMilestone.id}
                />
              )}

              {/* Educational Architectural Vector Diagram + Disclosure */}
              <div className="space-y-2">
                <EraDiagramArt media={activeMilestone.media} />
                <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-[11px] text-stone-600 space-y-0.5">
                  <div className="font-semibold text-stone-800">
                    {activeMilestone.media.disclosureLabel[lang]}
                  </div>
                  <p>{activeMilestone.media.caption[lang]}</p>
                  <p className="text-stone-500">
                    {activeMilestone.media.attribution} · {activeMilestone.media.licenseStatus}
                  </p>
                </div>
              </div>

              {/* Historical Narrative */}
              <div className="space-y-3">
                <p className="text-sm sm:text-base text-stone-800 leading-relaxed">
                  {activeMilestone.fullDescription[lang]}
                </p>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-900 mb-0.5">
                      {lang === "en" ? "Historical Significance" : "ঐতিহাসিক তাৎপর্য"}
                    </strong>
                    <span>{activeMilestone.keyFact[lang]}</span>
                  </div>
                </div>
              </div>

              {/* Optional Related Video Link */}
              {activeMilestone.relatedVideoId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIdx(null);
                    navigate("/videos");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      {lang === "en"
                        ? "Watch related explainer & bdapps developer story in Videos"
                        : "ভিডিও পাতায় সংশ্লিষ্ট ব্যাখ্যা ও বিডিঅ্যাপস গল্প দেখুন"}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Verification Status & References */}
              <div className="pt-3 border-t border-stone-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === "en"
                      ? "Verification Status: Verified Public Records"
                      : "যাচাইকৃত ঐতিহাসিক তথ্যসূত্র"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeMilestone.references.map((ref) => (
                    <a
                      key={ref.label}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-medium text-stone-800 transition-colors"
                    >
                      <span>
                        {ref.label} ({ref.publisher})
                      </span>
                      <ExternalLink className="w-3 h-3 text-stone-500" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Modal Footer: Prev / Next Event Navigation */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                disabled={selectedIdx === 0}
                onClick={() => setSelectedIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-xs font-semibold text-stone-800 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{lang === "en" ? "Previous Year" : "পূর্ববর্তী"}</span>
              </button>

              <span className="font-mono-num text-xs text-stone-500 font-semibold">
                {selectedIdx + 1} / {ROBI_TIMELINE.length}
              </span>

              <button
                type="button"
                disabled={selectedIdx === ROBI_TIMELINE.length - 1}
                onClick={() =>
                  setSelectedIdx((i) => (i !== null && i < ROBI_TIMELINE.length - 1 ? i + 1 : i))
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{lang === "en" ? "Next Year" : "পরবর্তী"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
