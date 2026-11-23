import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import {
  VIDEO_CATEGORIES,
  VIDEO_LIBRARY,
  type AnimatedExplainerFrame,
  type VideoCategory,
  type VideoLibraryItem,
} from "../../data/videos/videos";
import {
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Captions,
  CheckCircle2,
  Volume2,
  VolumeX,
  FileText,
  Download,
  Gauge,
  Info,
} from "lucide-react";

function buildVttText(frames: AnimatedExplainerFrame[], lang: "en" | "bn"): string {
  const fmt = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.000`;
  };
  return [
    "WEBVTT",
    "",
    ...frames.map(
      (f, i) =>
        `${i + 1}\n00:${fmt(f.timeSec)} --> 00:${fmt(f.endSec)}\n${f.headline[lang]}\n${f.caption[lang]}\n`,
    ),
  ].join("\n");
}

const DocumentarySvgStage: React.FC<{
  frame: AnimatedExplainerFrame;
  timeSec: number;
  lang: "en" | "bn";
}> = ({ frame, timeSec, lang }) => {
  const localT = Math.max(
    0,
    Math.min(1, (timeSec - frame.timeSec) / Math.max(1, frame.endSec - frame.timeSec)),
  );
  const mode = frame.diagramMode;
  const step = frame.stageStep;

  // Smooth hardware-accelerated SVG camera pan/zoom using fixed viewBox
  const cameraTransform = useMemo(() => {
    if (frame.cameraFocus === "left") return "translate(68px, -4px) scale(1.16)";
    if (frame.cameraFocus === "center") return "scale(1.14)";
    if (frame.cameraFocus === "right") return "translate(-68px, -4px) scale(1.16)";
    return "translate(0px, 0px) scale(1)";
  }, [frame.cameraFocus]);

  return (
    <svg
      viewBox="0 0 800 340"
      className="w-full h-64 sm:h-80 bg-slate-950 block overflow-hidden"
      role="img"
      aria-label={frame.headline[lang]}
    >
      <g
        style={{
          transform: cameraTransform,
          transformOrigin: "400px 170px",
          transition: "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <defs>
          <linearGradient id="stageSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="fiberBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="800" height="340" fill="url(#stageSky)" />
        {/* Ground line */}
        <rect x="0" y="274" width="800" height="66" fill="#0b1120" />
        <line x1="0" y1="274" x2="800" y2="274" stroke="#334155" strokeWidth="2" />

        {(mode === "network-arch" || mode === "packet-hops") && (
          <g>
            {/* Cell coverage halos */}
            <ellipse
              cx="240"
              cy="274"
              rx="140"
              ry="26"
              fill="#e11d48"
              fillOpacity={step >= 0 ? 0.14 : 0.05}
              stroke="#fb7185"
              strokeDasharray="6 4"
              strokeOpacity="0.4"
            />
            <ellipse
              cx="580"
              cy="274"
              rx="140"
              ry="26"
              fill="#10b981"
              fillOpacity={step >= 2 ? 0.14 : 0.05}
              stroke="#34d399"
              strokeDasharray="6 4"
              strokeOpacity="0.4"
            />

            {/* Left Phone */}
            <g transform="translate(80, 186)">
              <rect
                x="0"
                y="0"
                width="44"
                height="78"
                rx="8"
                fill="#1e293b"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              <rect x="6" y="10" width="32" height="50" rx="4" fill="#0f172a" />
              <text x="22" y="96" textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="700">
                {lang === "en" ? "Phone" : "ফোন"}
              </text>
            </g>

            {/* Left Tower */}
            <g transform="translate(222, 92)">
              <path
                d="M18 182 L32 22 L46 182 M24 130 L40 130 M27 88 L37 88"
                stroke="#e2e8f0"
                strokeWidth="3"
                fill="none"
              />
              <rect x="14" y="14" width="36" height="10" rx="3" fill="#e11d48" />
              <circle cx="32" cy="12" r="5" fill="#fbbf24" />
              <text
                x="32"
                y="202"
                textAnchor="middle"
                fill="#fecdd3"
                fontSize="12"
                fontWeight="700"
              >
                {lang === "en" ? "Tower A" : "টাওয়ার এ"}
              </text>
            </g>

            {/* Core Switching Hub */}
            <g transform="translate(382, 174)">
              <rect
                x="0"
                y="0"
                width="66"
                height="74"
                rx="10"
                fill={step >= 2 ? "#0f766e" : "#1e293b"}
                stroke="#34d399"
                strokeWidth="2.5"
              />
              <line
                x1="12"
                y1="22"
                x2="54"
                y2="22"
                stroke="#6ee7b7"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="40"
                x2="54"
                y2="40"
                stroke="#6ee7b7"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="50" cy="56" r="4" fill="#fbbf24" />
              <text x="33" y="96" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="700">
                {lang === "en" ? "Core Switch" : "কোর সুইচ"}
              </text>
            </g>

            {/* Right Tower */}
            <g transform="translate(546, 92)">
              <path
                d="M18 182 L32 22 L46 182 M24 130 L40 130 M27 88 L37 88"
                stroke="#e2e8f0"
                strokeWidth="3"
                fill="none"
              />
              <rect x="14" y="14" width="36" height="10" rx="3" fill="#10b981" />
              <text
                x="32"
                y="202"
                textAnchor="middle"
                fill="#a7f3d0"
                fontSize="12"
                fontWeight="700"
              >
                {lang === "en" ? "Tower B" : "টাওয়ার বি"}
              </text>
            </g>

            {/* Receiver Phone */}
            <g transform="translate(684, 186)">
              <rect
                x="0"
                y="0"
                width="44"
                height="78"
                rx="8"
                fill="#1e293b"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              <rect x="6" y="10" width="32" height="50" rx="4" fill="#0f172a" />
              <text x="22" y="96" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="700">
                {lang === "en" ? "Receiver" : "গ্রাহক"}
              </text>
            </g>

            {/* Fiber underground link + Radio paths */}
            <path
              d="M254 282 L415 282 L578 282"
              stroke="url(#fiberBeam)"
              strokeWidth="4"
              strokeDasharray="8 6"
            />
            <line
              x1="124"
              y1="205"
              x2="246"
              y2="115"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />
            <line
              x1="584"
              y1="115"
              x2="684"
              y2="205"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />

            {/* Moving animated packet */}
            {(() => {
              const pxs = [124, 254, 415, 578, 690];
              const pys = [205, 115, 210, 115, 205];
              const idx = Math.min(3, step);
              const px = pxs[idx] + (pxs[idx + 1] - pxs[idx]) * localT;
              const py = pys[idx] + (pys[idx + 1] - pys[idx]) * localT;
              return (
                <g transform={`translate(${px}, ${py})`}>
                  <circle r="13" fill="#fbbf24" fillOpacity="0.28" />
                  <circle r="7" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })()}
          </g>
        )}

        {mode === "data-bucket" && (
          <g>
            {/* App Usage Comparison Bars & Megabyte Tank */}
            {[
              { label: "Chat Text", mb: 0.4, color: "#10b981", y: 74, w: 42 },
              { label: "Study PDF", mb: 8, color: "#38bdf8", y: 122, w: 120 },
              { label: "360p Video (15m)", mb: 75, color: "#f59e0b", y: 170, w: 230 },
              { label: "1080p HD (15m)", mb: 340, color: "#e11d48", y: 218, w: 390 },
            ].map((bar, i) => (
              <g key={bar.label}>
                <text x="64" y={bar.y + 18} fill="#e2e8f0" fontSize="13" fontWeight="600">
                  {bar.label}
                </text>
                <rect
                  x="210"
                  y={bar.y}
                  width="400"
                  height="24"
                  rx="6"
                  fill="#1e293b"
                  stroke="#334155"
                />
                <rect
                  x="210"
                  y={bar.y}
                  width={bar.w * (i <= step ? 1 : 0.25 + localT * 0.75)}
                  height="24"
                  rx="6"
                  fill={bar.color}
                />
                <text
                  x="625"
                  y={bar.y + 17}
                  fill="#fde68a"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {bar.mb} MB
                </text>
              </g>
            ))}
          </g>
        )}

        {mode === "signal-barrier" && (
          <g>
            {/* Tower */}
            <path
              d="M90 274 L112 72 L134 274 M98 205 L126 205 M103 145 L121 145"
              stroke="#e2e8f0"
              strokeWidth="3.5"
              fill="none"
            />
            <circle cx="112" cy="68" r="7" fill="#e11d48" />

            {/* Animated Wave Arcs */}
            {[0, 1, 2].map((rIdx) => {
              const prog = (localT + rIdx * 0.33) % 1;
              const rad = 28 + prog * 280;
              return (
                <path
                  key={rIdx}
                  d={`M ${112 + rad * 0.7} ${68 - rad * 0.3} A ${rad} ${rad} 0 0 1 ${112 + rad * 0.7} ${68 + rad * 0.55}`}
                  fill="none"
                  stroke={step === 1 ? "#f59e0b" : "#10b981"}
                  strokeWidth="3"
                  strokeOpacity={1 - prog}
                />
              );
            })}

            {/* Concrete Wall & Hill Barrier */}
            <rect
              x="355"
              y="128"
              width="48"
              height="146"
              rx="4"
              fill={step === 1 ? "#64748b" : "#334155"}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <text x="379" y="114" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="600">
              {lang === "en" ? "Concrete Wall" : "কংক্রিট দেয়াল"}
            </text>

            {/* Moving Citizen Phone */}
            {(() => {
              const phoneX = step === 0 ? 480 : step === 1 ? 455 : step === 2 ? 250 : 610;
              const barColor = step === 1 ? "#ef4444" : step === 2 ? "#10b981" : "#f59e0b";
              const dbmTxt = step === 1 ? "-106 dBm" : step === 2 ? "-67 dBm" : "-82 dBm";
              return (
                <g transform={`translate(${phoneX}, 178)`}>
                  <rect
                    x="0"
                    y="0"
                    width="48"
                    height="84"
                    rx="9"
                    fill="#0f172a"
                    stroke={barColor}
                    strokeWidth="3"
                  />
                  <text
                    x="24"
                    y="45"
                    textAnchor="middle"
                    fill={barColor}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {dbmTxt}
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {mode === "tower-anatomy" && (
          <g>
            {/* Tower Silhouette */}
            <path
              d="M270 274 L305 46 L340 274 M280 210 L330 210 M287 150 L323 150 M295 96 L315 96"
              stroke="#cbd5e1"
              strokeWidth="3.5"
              fill="none"
            />
            {/* 1. Sector Antennas */}
            <rect
              x="282"
              y="54"
              width="46"
              height="22"
              rx="4"
              fill={step === 0 ? "#e11d48" : "#475569"}
              stroke="#fda4af"
              strokeWidth="2"
            />
            {/* 2. RRU Radio Box */}
            <rect
              x="292"
              y="96"
              width="26"
              height="28"
              rx="3"
              fill={step === 1 ? "#38bdf8" : "#334155"}
              stroke="#7dd3fc"
              strokeWidth="2"
            />
            {/* 3. Microwave Dish */}
            <circle
              cx="344"
              cy="126"
              r="16"
              fill={step === 2 ? "#fbbf24" : "#475569"}
              stroke="#fef08a"
              strokeWidth="2"
            />
            {/* 4. Base Cabinet + Solar */}
            <rect
              x="420"
              y="210"
              width="90"
              height="64"
              rx="6"
              fill={step === 3 ? "#10b981" : "#1e293b"}
              stroke="#6ee7b7"
              strokeWidth="2"
            />
            <line x1="335" y1="262" x2="420" y2="262" stroke="#f59e0b" strokeWidth="4" />

            {/* Callout Labels */}
            <g fill="#f8fafc" fontSize="13" fontWeight="700">
              <text x="360" y="68" fill={step === 0 ? "#fda4af" : "#94a3b8"}>
                1. Sector Antennas (120° × 3)
              </text>
              <text x="360" y="106" fill={step === 1 ? "#7dd3fc" : "#94a3b8"}>
                2. Radio Equipment (RRU)
              </text>
              <text x="380" y="142" fill={step === 2 ? "#fde047" : "#94a3b8"}>
                3. Microwave & Fiber Backhaul
              </text>
              <text x="530" y="246" fill={step === 3 ? "#6ee7b7" : "#94a3b8"}>
                4. Power, Solar & Battery
              </text>
            </g>
          </g>
        )}

        {mode === "speed-vs-data" && (
          <g>
            {/* Phone A 10 Mbps vs Phone B 40 Mbps */}
            <text x="72" y="66" fill="#38bdf8" fontSize="15" fontWeight="bold">
              Phone A · 10 Mbps (160 MB File)
            </text>
            <rect x="72" y="80" width="520" height="32" rx="8" fill="#1e293b" stroke="#334155" />
            <rect
              x="72"
              y="80"
              width={520 * Math.min(1, step * 0.25 + localT * 0.25)}
              height="32"
              rx="8"
              fill="#0ea5e9"
            />
            <text x="612" y="102" fill="#e0f2fe" fontSize="13" fontFamily="monospace">
              {Math.round(160 * Math.min(1, step * 0.25 + localT * 0.25))} / 160 MB
            </text>

            <text x="72" y="168" fill="#34d399" fontSize="15" fontWeight="bold">
              Phone B · 40 Mbps (160 MB File — 4× Faster!)
            </text>
            <rect x="72" y="182" width="520" height="32" rx="8" fill="#1e293b" stroke="#334155" />
            <rect
              x="72"
              y="182"
              width={520 * Math.min(1, step >= 1 ? 1 : localT)}
              height="32"
              rx="8"
              fill="#10b981"
            />
            <text x="612" y="204" fill="#a7f3d0" fontSize="13" fontFamily="monospace">
              {step >= 1 ? "160 / 160 MB (Done!)" : `${Math.round(160 * localT)} / 160 MB`}
            </text>

            <rect
              x="72"
              y="236"
              width="656"
              height="34"
              rx="8"
              fill="#0f172a"
              stroke="#fbbf24"
              strokeOpacity="0.4"
            />
            <text
              x="400"
              y="258"
              textAnchor="middle"
              fill="#fde68a"
              fontSize="13"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Time (s) = (160 MB × 8) ÷ Speed Mbps · Final MB Equal = 160 MB
            </text>
          </g>
        )}

        {(mode === "device-duplex" || mode === "bd-services") && (
          <g>
            {[
              {
                title:
                  mode === "device-duplex"
                    ? "1. SMS (140 Bytes · No Internet Needed)"
                    : "1. Rural Agri & Weather SMS",
                color: "#f59e0b",
                y: 66,
              },
              {
                title:
                  mode === "device-duplex"
                    ? "2. USSD Menu (*000# Demo · Offline)"
                    : "2. Regional e-Learning via 4G",
                color: "#38bdf8",
                y: 122,
              },
              {
                title:
                  mode === "device-duplex"
                    ? "3. Voice Call (Priority Low Latency)"
                    : "3. Youth Apps via bdapps OTP API",
                color: "#10b981",
                y: 178,
              },
              {
                title:
                  mode === "device-duplex"
                    ? "4. 4G/5G Data (Streaming & Classes)"
                    : "4. Informed Digital Citizens",
                color: "#e11d48",
                y: 234,
              },
            ].map((lane, idx) => (
              <g key={lane.title}>
                <rect
                  x="72"
                  y={lane.y}
                  width="656"
                  height="38"
                  rx="10"
                  fill={idx === step ? "#1e293b" : "#0f172a"}
                  stroke={idx === step ? lane.color : "#334155"}
                  strokeWidth={idx === step ? 2.5 : 1}
                />
                <circle
                  cx={idx === step ? 110 + localT * 580 : 110}
                  cy={lane.y + 19}
                  r="8"
                  fill={lane.color}
                />
                <text
                  x="135"
                  y={lane.y + 24}
                  fill={idx === step ? "#ffffff" : "#94a3b8"}
                  fontSize="13"
                  fontWeight="700"
                >
                  {lane.title}
                </text>
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
};

const AnimatedExplainerPlayer: React.FC<{
  item: VideoLibraryItem;
  onWatched: (id: string) => void;
}> = ({ item, onWatched }) => {
  const { lang } = useRobiTrail();
  const [playing, setPlaying] = useState(false); // Never autoplays audio before user click
  const [timeSec, setTimeSec] = useState(0);
  const [speed, setSpeed] = useState<0.75 | 1 | 1.25 | 1.5>(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [ttsInfo, setTtsInfo] = useState<string | null>(null);

  const duration = item.durationSec || 24;
  const frames = item.frames || [];
  const lastSpokenStepRef = useRef<number>(-1);

  const activeFrameIdx = useMemo(() => {
    let found = 0;
    frames.forEach((f, idx) => {
      if (timeSec >= f.timeSec) found = idx;
    });
    return found;
  }, [frames, timeSec]);

  const activeFrame = frames[activeFrameIdx] || frames[0];

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakCue = (frame: AnimatedExplainerFrame | undefined, rate: number) => {
    if (!frame || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsInfo(
        lang === "en"
          ? "Browser voice synthesis unavailable — reading synchronized subtitles."
          : "এই ব্রাউজারে ভয়েস সিন্থেসিস পাওয়া যায়নি — নিচের সাবটাইটেল দেখুন।",
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const text = frame.voiceLine[lang];
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = lang === "bn" ? "bn" : "en";
      const match =
        voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix)) ||
        voices.find((v) => v.lang.toLowerCase().includes("en"));

      if (match) {
        utter.voice = match;
        utter.lang = match.lang;
        if (lang === "bn" && !match.lang.toLowerCase().startsWith("bn")) {
          setTtsInfo(
            "Bangla OS voice not installed on this device — showing Bangla captions with fallback voice engine.",
          );
        } else {
          setTtsInfo(null);
        }
      } else {
        utter.lang = lang === "bn" ? "bn-BD" : "en-US";
      }

      window.speechSynthesis.speak(utter);
    } catch {
      setTtsInfo(
        lang === "en"
          ? "Voice narration paused by browser — captions remain synced."
          : "ব্রাউজার থেকে ভয়েস আটকে দেওয়া হয়েছে — সাবটাইটেল চালু রয়েছে।",
      );
    }
  };

  // Reset when changing lesson
  useEffect(() => {
    stopSpeech();
    lastSpokenStepRef.current = -1;
    setTimeSec(0);
    setPlaying(false);
    setTtsInfo(null);
    return () => stopSpeech();
  }, [item.id, lang]);

  // Playback loop honoring speed multiplier (pure state update only)
  useEffect(() => {
    if (!playing) {
      stopSpeech();
      lastSpokenStepRef.current = -1;
      return;
    }
    const id = window.setInterval(() => {
      setTimeSec((prev) => Math.min(duration, prev + 0.1 * speed));
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, speed, duration]);

  // Mark lesson watched and reset cleanly once playback reaches the end
  useEffect(() => {
    if (!playing || timeSec < duration) return;
    onWatched(item.id);
    setPlaying(false);
    stopSpeech();
    lastSpokenStepRef.current = -1;
    setTimeSec(0);
  }, [playing, timeSec, duration, item.id, onWatched]);

  // Trigger voice narration exactly once per cue transition while playing
  useEffect(() => {
    if (!playing || !voiceEnabled || !activeFrame) return;
    if (lastSpokenStepRef.current !== activeFrameIdx) {
      lastSpokenStepRef.current = activeFrameIdx;
      speakCue(activeFrame, speed);
    }
  }, [playing, voiceEnabled, activeFrameIdx, activeFrame, speed]);

  const handleTogglePlay = () => {
    const next = !playing;
    setPlaying(next);
    if (!next) {
      stopSpeech();
      lastSpokenStepRef.current = -1;
    } else if (voiceEnabled && activeFrame) {
      lastSpokenStepRef.current = activeFrameIdx;
      speakCue(activeFrame, speed);
    }
  };

  const handleDownloadVtt = () => {
    const vtt = buildVttText(frames, lang);
    const blob = new Blob([vtt], { type: "text/vtt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.id}-${lang}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJumpChapter = (frameStartSec: number, idx: number) => {
    const nextTime = frameStartSec + 0.05;
    setTimeSec(nextTime);
    lastSpokenStepRef.current = -1;
    if (playing && voiceEnabled && frames[idx]) {
      lastSpokenStepRef.current = idx;
      speakCue(frames[idx], speed);
    }
  };

  return (
    <div className="space-y-3">
      {/* Chapter Selector Outside the Video Player Frame */}
      {frames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Lesson chapters">
          {frames.map((fr, idx) => (
            <button
              key={fr.timeSec}
              type="button"
              onClick={() => handleJumpChapter(fr.timeSec, idx)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                idx === activeFrameIdx
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
              }`}
            >
              {idx + 1}. {fr.headline[lang]}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-slate-950 text-white overflow-hidden border border-slate-800 shadow-lg">
        {/* Documentary Motion SVG Canvas */}
        <div className="relative">
          {activeFrame && <DocumentarySvgStage frame={activeFrame} timeSec={timeSec} lang={lang} />}

          {/* Synchronized Subtitle Bar */}
          {showCaptions && activeFrame && (
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 text-center space-y-1">
              <div className="text-[11px] font-mono text-amber-300 font-semibold">
                {activeFrame.headline[lang]}
              </div>
              <p className="text-xs sm:text-sm text-white font-medium leading-relaxed max-w-2xl mx-auto">
                {activeFrame.caption[lang]}
              </p>
            </div>
          )}
        </div>

        {/* Controls: Play/Pause, Replay, Scrubber, Speed, Voice, CC, Transcript */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>
              {playing
                ? lang === "en"
                  ? "Pause"
                  : "বিরতি"
                : lang === "en"
                  ? "Play Lesson"
                  : "চালু করুন"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              lastSpokenStepRef.current = -1;
              setTimeSec(0);
              setPlaying(true);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            aria-label="Replay lesson"
            title={lang === "en" ? "Replay" : "পুনরায় শুরু"}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={timeSec}
            onChange={(e) => {
              lastSpokenStepRef.current = -1;
              setTimeSec(Number(e.target.value));
            }}
            className="flex-1 min-w-[110px] accent-rose-500 cursor-pointer"
            aria-label="Lesson timeline scrubber"
          />

          <span className="text-xs font-mono-num text-slate-300 w-16 text-right">
            {Math.floor(timeSec)}s/{duration}s
          </span>

          {/* Playback Speed */}
          <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value) as 0.75 | 1 | 1.25 | 1.5)}
              aria-label="Playback speed"
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value={0.75} className="bg-slate-900">
                0.75x
              </option>
              <option value={1} className="bg-slate-900">
                1x
              </option>
              <option value={1.25} className="bg-slate-900">
                1.25x
              </option>
              <option value={1.5} className="bg-slate-900">
                1.5x
              </option>
            </select>
          </div>

          {/* Voice On / Off */}
          <button
            type="button"
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (!next) stopSpeech();
              else if (playing && activeFrame) {
                lastSpokenStepRef.current = activeFrameIdx;
                speakCue(activeFrame, speed);
              }
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border font-semibold cursor-pointer ${
              voiceEnabled
                ? "bg-emerald-600/25 border-emerald-400 text-emerald-200"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{lang === "en" ? "Voice" : "ভয়েস"}</span>
          </button>

          {/* Subtitles On / Off */}
          <button
            type="button"
            onClick={() => setShowCaptions((c) => !c)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border font-semibold cursor-pointer ${
              showCaptions
                ? "bg-white/15 border-white/30 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Captions className="w-3.5 h-3.5" />
            <span>CC</span>
          </button>

          {/* Transcript / VTT Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border font-semibold cursor-pointer ${
              showTranscript
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === "en" ? "Script" : "পাণ্ডুলিপি"}</span>
          </button>
        </div>

        {/* SpeechSynthesis Disclosure & Optional Full Transcript / VTT Export */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              {ttsInfo ||
                (lang === "en"
                  ? "Voice narration uses your browser SpeechSynthesis engine (quality varies by device; studio audio tracks are planned assets)."
                  : "ভয়েস বর্ণনা ব্রাউজারের SpeechSynthesis ইঞ্জিন ব্যবহার করে (ডিভাইসভেদে মান ভিন্ন হতে পারে; স্টুডিও অডিও রেকর্ডিং পরিকল্পিত)।")}
            </span>
          </span>
          <button
            type="button"
            onClick={handleDownloadVtt}
            className="inline-flex items-center gap-1 text-sky-300 hover:underline font-mono shrink-0 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>.VTT</span>
          </button>
        </div>

        {showTranscript && (
          <div className="px-5 py-4 bg-slate-900/90 border-t border-slate-800 space-y-2 max-h-48 overflow-y-auto">
            {frames.map((f, i) => (
              <div
                key={f.timeSec}
                className={`text-xs ${i === activeFrameIdx ? "text-white" : "text-slate-400"}`}
              >
                <span className="font-mono text-amber-300 mr-2">
                  [{f.timeSec}s–{f.endSec}s]
                </span>
                <strong className="mr-1.5">{f.headline[lang]}:</strong>
                <span>{f.voiceLine[lang]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EmbeddedYouTubePlayer: React.FC<{
  item: VideoLibraryItem;
  onWatched: (id: string) => void;
}> = ({ item, onWatched }) => {
  const { lang } = useRobiTrail();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [item.id]);

  const watchUrl = item.externalUrl || `https://www.youtube.com/watch?v=${item.youtubeId}`;
  const embedSrc = `https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1&autoplay=0`;

  return (
    <div className="rounded-2xl bg-slate-950 text-white overflow-hidden border border-slate-800 shadow-lg">
      {!online ? (
        <div className="aspect-video flex flex-col items-center justify-center p-6 text-center bg-slate-900 space-y-3">
          <p className="text-sm font-semibold text-amber-300">
            {lang === "en"
              ? "Offline Mode Detected — YouTube stream paused until internet reconnects."
              : "অফলাইন অবস্থা — ইন্টারনেট সংযোগ ফিরলে ইউটিউব ভিডিও লোড হবে।"}
          </p>
          <p className="text-xs text-slate-300 max-w-md">
            {lang === "en"
              ? "Switch to any Animated Lesson in the playlist to study with voice & subtitles offline."
              : "ইন্টারনেট ছাড়াই দেখতে প্লেলিস্ট থেকে অ্যানিমেটেড পাঠ নির্বাচন করুন।"}
          </p>
        </div>
      ) : (
        <div className="relative aspect-video bg-slate-900">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">
              {lang === "en" ? "Loading YouTube Player..." : "ইউটিউব প্লেয়ার লোড হচ্ছে..."}
            </div>
          )}
          <iframe
            key={item.youtubeId}
            src={embedSrc}
            title={item.title[lang]}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              setLoaded(true);
              onWatched(item.id);
            }}
            className="relative z-10 w-full h-full border-0"
          />
        </div>
      )}

      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-300 font-mono truncate">{item.sourceName}</span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          <span>{lang === "en" ? "Open on YouTube" : "ইউটিউবে খুলুন"}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export const VideosTutorialsSection: React.FC = () => {
  const { lang } = useRobiTrail();
  const [category, setCategory] = useState<VideoCategory>("All");
  const [selectedId, setSelectedId] = useState<string>(VIDEO_LIBRARY[0].id);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  const filtered =
    category === "All"
      ? VIDEO_LIBRARY
      : category === "Animated Lessons"
        ? VIDEO_LIBRARY.filter((v) => v.type === "animated-explainer")
        : VIDEO_LIBRARY.filter((v) => v.category === category);

  const featured =
    filtered.find((v) => v.id === selectedId) ||
    filtered[0] ||
    VIDEO_LIBRARY.find((v) => v.id === selectedId) ||
    VIDEO_LIBRARY[0];

  const handleCategoryChange = (nextCat: VideoCategory) => {
    setCategory(nextCat);
    const nextList =
      nextCat === "All"
        ? VIDEO_LIBRARY
        : nextCat === "Animated Lessons"
          ? VIDEO_LIBRARY.filter((v) => v.type === "animated-explainer")
          : VIDEO_LIBRARY.filter((v) => v.category === nextCat);
    if (nextList.length > 0 && !nextList.some((v) => v.id === selectedId)) {
      setSelectedId(nextList[0].id);
    }
  };

  const markWatched = useCallback((id: string) => {
    setWatchedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return (
    <section
      id="videos-tutorials"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="max-w-2xl">
          <div className="text-xs font-mono text-rose-600 uppercase tracking-wider mb-1">
            {lang === "en"
              ? "Animated Lessons (Voice + Subtitles) & Official bdapps Videos"
              : "ভয়েস ও সাবটাইটেলসহ অ্যানিমেটেড পাঠ ও বিডিঅ্যাপস ভিডিও"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
            {lang === "en" ? "Videos & Tutorials" : "ভিডিও ও টিউটোরিয়াল"}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            {lang === "en"
              ? "Study 7 documentary-style animated telecom lessons with synchronized captions and voice narration, plus embedded official bdapps YouTube tutorials."
              : "সাবটাইটেল ও ভয়েস বর্ণনাসহ ৭টি অ্যানিমেটেড টেলিকম পাঠ এবং অফিশিয়াল বিডিঅ্যাপস ইউটিউব টিউটোরিয়াল দেখুন।"}
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-full"
          role="tablist"
          aria-label="Filter videos by topic"
        >
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                category === cat.id
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white/80 hover:text-slate-950"
              }`}
            >
              {cat.label[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active In-App Player */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Concise Single Metadata Header (No duplicate metadata below player) */}
          <div className="px-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-rose-700 font-semibold">
              <span>
                {featured.category} · {featured.durationLabel}
              </span>
              <span className="text-slate-500 font-normal">{featured.sourceName}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 font-display">
              {featured.title[lang]}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {featured.summary[lang]}
            </p>
          </div>

          {featured.type === "youtube" && featured.youtubeId ? (
            <EmbeddedYouTubePlayer item={featured} onWatched={markWatched} />
          ) : featured.type === "animated-explainer" ? (
            <AnimatedExplainerPlayer item={featured} onWatched={markWatched} />
          ) : (
            <div className="rounded-2xl bg-slate-950 text-white p-8 border border-slate-800 space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed">{featured.summary[lang]}</p>
              <a
                href={featured.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
              >
                <span>
                  {lang === "en" ? "Open Official Training Portal" : "অফিশিয়াল পোর্টাল খুলুন"}
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Interactive Playlist */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const active = item.id === featured.id;
            const watched = watchedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  active
                    ? "bg-rose-50 border-rose-400 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        item.type === "youtube"
                          ? "bg-rose-600"
                          : item.type === "animated-explainer"
                            ? "bg-emerald-600"
                            : "bg-amber-600"
                      }`}
                    />
                    <span>
                      {item.category} · {item.durationLabel}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-950 mt-0.5 leading-snug">
                    {item.title[lang]}
                  </div>
                </div>
                {watched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
