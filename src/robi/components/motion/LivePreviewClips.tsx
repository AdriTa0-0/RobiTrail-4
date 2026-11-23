import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface ClipSpec {
  id: string;
  mode: "city-traffic" | "signal-waves" | "packet-route" | "aktel-exhibit";
  targetRoute: string;
  title: { en: string; bn: string };
  caption: { en: string; bn: string };
}

const PREVIEW_CLIPS: ClipSpec[] = [
  {
    id: "clip-city",
    mode: "city-traffic",
    targetRoute: "/cities",
    title: { en: "Living City", bn: "জীবন্ত শহর" },
    caption: { en: "CNGs, rickshaws & river corridors", bn: "সিএনজি, রিকশা ও নদীর করিডোর" },
  },
  {
    id: "clip-signal",
    mode: "signal-waves",
    targetRoute: "/discover/signal-waves",
    title: { en: "Signal Wave Expansion", bn: "সিগন্যাল তরঙ্গ বিস্তার" },
    caption: { en: "Distance & obstacle physics lab", bn: "দূরত্ব ও প্রতিবন্ধকতা পরীক্ষাগার" },
  },
  {
    id: "clip-packet",
    mode: "packet-route",
    targetRoute: "/games/chattogram/ctg-4",
    title: { en: "Live Packet Routing", bn: "লাইভ প্যাকেট রাউটিং" },
    caption: { en: "Tower-to-core 3D message mission", bn: "টাওয়ার থেকে কোর নেটওয়ার্ক মিশন" },
  },
  {
    id: "clip-history",
    mode: "aktel-exhibit",
    targetRoute: "/robi-journey",
    title: { en: "Robi History", bn: "রবির ইতিহাস যাত্রা" },
    caption: { en: "Aktel 1997 to Robi & 4G era", bn: "১৯৯৭ একটেল থেকে রবি ও ৪জি যুগ" },
  },
];

const CanvasLoopPreview: React.FC<{
  mode: ClipSpec["mode"];
  reduced: boolean;
  hovered: boolean;
}> = ({ mode, reduced, hovered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      if (visible) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background gradient with subtle focus boost on hover
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, hoveredRef.current ? "#172554" : "#0F172A");
        grad.addColorStop(1, hoveredRef.current ? "#31102F" : "#1E293B");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        if (mode === "city-traffic") {
          ctx.fillStyle = "#334155";
          [16, 56, 110, 170, 224].forEach((bx, idx) => {
            const bh = 38 + (idx % 3) * 20;
            ctx.fillRect(bx, h - 34 - bh, 34, bh);
          });
          ctx.fillStyle = "#1E2430";
          ctx.fillRect(0, h - 34, w, 34);
          const x1 = ((phase * 70) % (w + 40)) - 20;
          const x2 = w - ((phase * 44) % (w + 40)) + 10;
          ctx.fillStyle = "#16A34A";
          ctx.fillRect(x1, h - 28, 28, 14);
          ctx.fillStyle = "#FACC15";
          ctx.fillRect(x1 + 4, h - 32, 18, 5);
          ctx.fillStyle = "#E11D48";
          ctx.fillRect(x2, h - 22, 22, 12);
        } else if (mode === "signal-waves") {
          ctx.strokeStyle = "#E2E8F0";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(w / 2 - 14, h - 18);
          ctx.lineTo(w / 2, 28);
          ctx.lineTo(w / 2 + 14, h - 18);
          ctx.stroke();

          for (let r = 0; r < 3; r++) {
            const prog = (phase * 0.65 + r * 0.33) % 1;
            ctx.strokeStyle = `rgba(225, 29, 72, ${1 - prog})`;
            ctx.lineWidth = hoveredRef.current ? 2.8 : 2;
            ctx.beginPath();
            ctx.arc(w / 2, 32, 10 + prog * 68, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (mode === "packet-route") {
          const pts = [
            [36, h / 2 + 16],
            [102, 34],
            [178, h / 2 - 12],
            [244, h / 2 + 18],
          ];
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2;
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
          ctx.stroke();

          pts.forEach(([px, py]) => {
            ctx.fillStyle = "#F8FAFC";
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
          });

          const tNorm = (phase * 0.55) % 1;
          const seg = Math.min(2, Math.floor(tNorm * 3));
          const local = tNorm * 3 - seg;
          const mx = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * local;
          const my = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * local;
          ctx.fillStyle = "#F59E0B";
          ctx.beginPath();
          ctx.arc(mx, my, hoveredRef.current ? 7 : 5.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = "#E11D48";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(24, h / 2 + 10);
          ctx.lineTo(w - 24, h / 2 + 10);
          ctx.stroke();

          const years = ["1997", "2010", "2016", "2024"];
          years.forEach((yr, idx) => {
            const x = 42 + idx * 66;
            const activeIdx = Math.floor(phase * 0.9) % years.length;
            ctx.fillStyle = idx === activeIdx ? "#E11D48" : "#64748B";
            ctx.beginPath();
            ctx.arc(x, h / 2 + 10, idx === activeIdx ? 7 : 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = idx === activeIdx ? "#FFFFFF" : "#94A3B8";
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = "center";
            ctx.fillText(yr, x, h / 2 - 8);
          });
        }

        if (!reduced) {
          phase += hoveredRef.current ? 0.045 : 0.025;
        }
      }
      if (!reduced) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [mode, reduced]);

  return (
    <div className="overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        width={280}
        height={132}
        className={`w-full h-32 object-cover block transition-transform duration-300 ${
          hovered ? "scale-105" : "scale-100"
        }`}
      />
    </div>
  );
};

export const LivePreviewClips: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const cinematicCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".preview-clip-card",
        { y: 14, opacity: 1 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: "power2.out",
          clearProps: "transform,opacity",
        },
      );
      if (bannerRef.current) {
        gsap.fromTo(
          bannerRef.current.querySelectorAll(".banner-word"),
          { y: 12, opacity: 1 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
        );
        gsap.fromTo(
          bannerRef.current.querySelector(".banner-support"),
          { y: 8, opacity: 1 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            delay: 0.2,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, [lang]);

  // Optimized Cinematic City Loop Canvas (auto-pauses off-screen)
  useEffect(() => {
    const canvas = cinematicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    let rafId = 0;
    let tick = 0;

    const renderSkyline = () => {
      if (visible) {
        const w = canvas.width;
        const h = canvas.height;
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#0F172A");
        sky.addColorStop(0.65, "#31102F");
        sky.addColorStop(1, "#9F1239");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#0B1120";
        for (let i = 0; i < 18; i++) {
          const bx = i * 48;
          const bh = 46 + ((i * 29) % 72);
          ctx.fillRect(bx, h - 56 - bh, 42, bh);
          for (let wy = h - 50 - bh; wy < h - 64; wy += 14) {
            if ((i + wy) % 3 !== 0) {
              const twinkle = 0.55 + 0.4 * Math.sin(tick * 1.8 + i + wy * 0.2);
              ctx.fillStyle = `rgba(253, 230, 138, ${twinkle.toFixed(2)})`;
              ctx.fillRect(bx + 8, wy, 7, 7);
              ctx.fillRect(bx + 24, wy, 7, 7);
            }
          }
          ctx.fillStyle = "#0B1120";
        }

        ctx.fillStyle = "#090D16";
        ctx.fillRect(0, h - 56, w, 56);
        for (let k = 0; k < 8; k++) {
          const lx = ((tick * (35 + k * 6) + k * 110) % (w + 60)) - 30;
          ctx.fillStyle = k % 2 === 0 ? "rgba(251, 191, 36, 0.78)" : "rgba(244, 63, 94, 0.72)";
          ctx.fillRect(lx, h - 42 + (k % 3) * 10, 18, 3);
        }

        tick += 0.02;
      }
      rafId = requestAnimationFrame(renderSkyline);
    };

    renderSkyline();
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, []);

  const handleOpenBlock = (clip: ClipSpec) => {
    setSelectedId(clip.id);
    window.setTimeout(() => {
      navigate(clip.targetRoute);
    }, 120);
  };

  const bannerEyebrow =
    lang === "en"
      ? "ROBITRAIL · BANGLADESH'S DIGITAL JOURNEY"
      : "ROBITRAIL · বাংলাদেশের ডিজিটাল অভিযাত্রা";
  const bannerHeadingWords = (
    lang === "en" ? "From One Connection to Millions of Stories" : "একটি সংযোগ থেকে কোটি মানুষের গল্প"
  ).split(" ");
  const bannerSupporting =
    lang === "en"
      ? "Explore Chattogram, Dhaka and Sylhet while discovering communication technology, Robi's evolution, and Bangladesh's digital transformation."
      : "চট্টগ্রাম, ঢাকা ও সিলেট ঘুরে আবিষ্কার করুন যোগাযোগের প্রযুক্তি, রবির বিবর্তন এবং বাংলাদেশের ডিজিটাল অগ্রযাত্রা।";

  return (
    <section ref={sectionRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* 4 Functional Interactive Navigation Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PREVIEW_CLIPS.map((clip) => {
          const isHovered = hoveredId === clip.id;
          const isSelected = selectedId === clip.id;
          return (
            <button
              key={clip.id}
              type="button"
              onClick={() => handleOpenBlock(clip)}
              onMouseEnter={() => setHoveredId(clip.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(clip.id)}
              onBlur={() => setHoveredId(null)}
              className={`preview-clip-card group cursor-pointer text-left rounded-2xl bg-white border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                isSelected
                  ? "border-rose-600 ring-2 ring-rose-500/30 scale-[0.99] shadow-lg"
                  : "border-slate-200 hover:border-rose-400 hover:-translate-y-1 shadow-sm hover:shadow-md"
              }`}
            >
              <CanvasLoopPreview mode={clip.mode} reduced={false} hovered={isHovered} />
              <div className="pt-3 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-950 group-hover:text-rose-700 transition-colors">
                    {clip.title[lang]}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 shrink-0">
                    <span>{lang === "en" ? "Explore" : "দেখুন"}</span>
                    <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{clip.caption[lang]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cinematic Dusk City Loop Showcase — Bangladesh's Digital Journey */}
      <div
        ref={bannerRef}
        className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 text-white shadow-lg"
      >
        <canvas
          ref={cinematicCanvasRef}
          width={860}
          height={260}
          className="w-full h-56 sm:h-60 object-cover block"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35 flex items-center px-6 sm:px-10 py-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-[11px] font-mono font-semibold text-amber-300 tracking-wider uppercase">
              {bannerEyebrow}
            </div>
            <h2
              className={`text-xl sm:text-3xl font-bold text-white text-balance ${
                lang === "bn" ? "leading-[1.32]" : "leading-[1.18]"
              }`}
            >
              {bannerHeadingWords.map((word, idx) => (
                <span key={idx} className="banner-word inline-block mr-[0.28em]">
                  {word}
                </span>
              ))}
            </h2>
            <p className="banner-support text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl">
              {bannerSupporting}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
