import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { HANDBOOK_TOPICS, type HandbookTopic } from "../../data/handbook/topics";
import { Tower3DInspector, type TowerPartId } from "./Tower3DInspector";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";

const InteractiveHandbookLab: React.FC<{ topic: HandbookTopic }> = ({ topic }) => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();

  // Shared exhibit controls
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState(topic.hotspots[0]?.id || "");

  // Topic 1: network-flow state
  const [flowHop, setFlowHop] = useState(0);

  // Topic 2: data-phone state
  const [phoneUsedMb, setPhoneUsedMb] = useState(42);
  const [autoPlayOn, setAutoPlayOn] = useState(false);
  const [lastAppAction, setLastAppAction] = useState<string>("");

  // Topic 3: signal-obstacles state
  const [simDistance, setSimDistance] = useState(30);
  const [hasWall, setHasWall] = useState(false);
  const [hasHill, setHasHill] = useState(false);
  const [hasRain, setHasRain] = useState(false);

  // Topic 4: speed-vs-data state
  const [fileSizeMb, setFileSizeMb] = useState(120);
  const [speedA, setSpeedA] = useState(10);
  const [speedB, setSpeedB] = useState(40);
  const [raceRunning, setRaceRunning] = useState(false);
  const [raceTime, setRaceTime] = useState(0);

  // Topic 6: sms-voice-data state
  const [signalEnv, setSignalEnv] = useState<"4g" | "ferry2g" | "dataOff">("4g");
  const [channelLog, setChannelLog] = useState<string>("");

  // Topic 7: congestion-sector state
  const [load4kStreams, setLoad4kStreams] = useState(true);
  const [loadBackups, setLoadBackups] = useState(true);
  const [loadExamClass, setLoadExamClass] = useState(true);
  const [loadChats, setLoadChats] = useState(true);

  // Topic 8: robi-bdapps state
  const [bdappsApi, setBdappsApi] = useState<"sms" | "otp" | "sub">("sms");
  const [apiStep, setApiStep] = useState(0);

  // Topic 9: bd-connectivity state
  const [focusDivision, setFocusDivision] = useState<"dhaka" | "chattogram" | "sylhet">("dhaka");

  // Reset topic-specific defaults cleanly when switching topics
  useEffect(() => {
    setSelectedHotspotId(topic.hotspots[0]?.id || "");
    setPaused(false);
    setShowHelp(false);
    setFlowHop(0);
    setRaceRunning(false);
    setRaceTime(0);
    setApiStep(0);
  }, [topic.id]);

  // Animated pipeline loop for Topic 1 (network-flow)
  useEffect(() => {
    if (topic.interactiveMode !== "network-flow" || paused) return;
    const timer = setInterval(() => {
      setFlowHop((h) => (h + 1) % 4);
    }, 1150);
    return () => clearInterval(timer);
  }, [topic.interactiveMode, paused]);

  // Dual download timer for Topic 4 (speed-vs-data)
  const durationA = (fileSizeMb * 8) / speedA;
  const durationB = (fileSizeMb * 8) / speedB;
  const maxDuration = Math.max(durationA, durationB);

  useEffect(() => {
    if (topic.interactiveMode !== "speed-vs-data" || !raceRunning || paused) return;
    const timer = setInterval(() => {
      setRaceTime((prev) => {
        const next = prev + 0.25;
        if (next >= maxDuration) {
          setRaceRunning(false);
          return maxDuration;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [topic.interactiveMode, raceRunning, paused, maxDuration]);

  // Auto-play meter tick for Topic 2
  useEffect(() => {
    if (topic.interactiveMode !== "data-phone" || !autoPlayOn || paused) return;
    const timer = setInterval(() => {
      setPhoneUsedMb((m) => Math.min(2000, m + 12));
    }, 750);
    return () => clearInterval(timer);
  }, [topic.interactiveMode, autoPlayOn, paused]);

  const handleReset = () => {
    setPaused(false);
    setFlowHop(0);
    setPhoneUsedMb(42);
    setAutoPlayOn(false);
    setLastAppAction("");
    setSimDistance(30);
    setHasWall(false);
    setHasHill(false);
    setHasRain(false);
    setFileSizeMb(120);
    setSpeedA(10);
    setSpeedB(40);
    setRaceRunning(false);
    setRaceTime(0);
    setSignalEnv("4g");
    setChannelLog("");
    setLoad4kStreams(true);
    setLoadBackups(true);
    setLoadExamClass(true);
    setLoadChats(true);
    setBdappsApi("sms");
    setApiStep(0);
  };

  const handleReplay = () => {
    setPaused(false);
    if (topic.interactiveMode === "network-flow") setFlowHop(0);
    if (topic.interactiveMode === "speed-vs-data") {
      setRaceTime(0);
      setRaceRunning(true);
    }
    if (topic.interactiveMode === "robi-bdapps") {
      setApiStep(1);
    }
  };

  const activeHotspot = topic.hotspots.find((h) => h.id === selectedHotspotId) || topic.hotspots[0];

  // Derived values for labs
  const calcDbm = Math.round(
    -52 - simDistance * 0.42 - (hasWall ? 18 : 0) - (hasHill ? 16 : 0) - (hasRain ? 7 : 0),
  );
  const bars =
    calcDbm >= -75 ? 5 : calcDbm >= -85 ? 4 : calcDbm >= -95 ? 3 : calcDbm >= -104 ? 2 : 1;

  const totalLoadMbps =
    (load4kStreams ? 54 : 0) +
    (loadBackups ? 34 : 0) +
    (loadExamClass ? 16 : 0) +
    (loadChats ? 5 : 0);
  const utilizationPct = Math.round((totalLoadMbps / 100) * 100);
  const estLatencyMs = utilizationPct > 95 ? 290 : utilizationPct > 75 ? 115 : 28;

  const pctA = Math.min(100, (raceTime / durationA) * 100);
  const pctB = Math.min(100, (raceTime / durationB) * 100);

  return (
    <div className="space-y-6">
      {/* Step 1: 1. EXPLORE */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 space-y-1.5">
        <div className="text-[11px] font-mono font-bold text-sky-700 uppercase tracking-wider">
          {lang === "en" ? "1. EXPLORE" : "১. পর্যবেক্ষণ (EXPLORE)"}
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">{topic.seeIt[lang]}</p>
      </div>

      {/* Step 2: 2. INTERACT */}
      <div className="rounded-2xl bg-slate-950 text-white border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-white/10 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">
              {lang === "en" ? "2. INTERACT" : "২. হাতেকলমে পরীক্ষা (INTERACT)"}
            </div>
            <div className="text-xs font-mono text-amber-300 font-semibold">
              {lang === "en"
                ? `EXHIBIT 0${topic.order} · ${topic.title.en.toUpperCase()}`
                : `প্রদর্শনী ০${topic.order} · ${topic.title.bn}`}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              {paused ? (
                <Play className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>
                {paused ? (lang === "en" ? "Play" : "চালু") : lang === "en" ? "Pause" : "বিরতি"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Replay" : "পুনরায় দেখুন"}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Reset" : "রিসেট"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelp((h) => !h)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                showHelp ? "bg-rose-600 text-white" : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Guide" : "নির্দেশনা"}</span>
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="px-4 py-2.5 bg-amber-950/70 border-b border-amber-500/30 text-xs text-amber-100 leading-relaxed">
            {topic.tryIt[lang]}
          </div>
        )}

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* EXHIBIT 1: NETWORK FLOW */}
            {topic.interactiveMode === "network-flow" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <svg
                  viewBox="0 0 420 110"
                  className="w-full h-28 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <path
                    d="M 45 78 Q 85 20 135 42 L 220 78 L 295 42 Q 345 20 375 78"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                  {/* Nodes */}
                  {[
                    { x: 45, y: 78, lbl: "Phone A" },
                    { x: 135, y: 42, lbl: "Tower A" },
                    { x: 220, y: 78, lbl: "Core" },
                    { x: 375, y: 78, lbl: "Phone B" },
                  ].map((pt, idx) => (
                    <g key={pt.lbl}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={flowHop === idx ? 12 : 8}
                        fill={flowHop === idx ? "#e11d48" : "#0284c7"}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={pt.x}
                        y={pt.y + 21}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {pt.lbl}
                      </text>
                    </g>
                  ))}
                  {/* Traveling Packet Dot */}
                  <circle
                    cx={[45, 135, 220, 375][flowHop]}
                    cy={[78, 42, 78, 78][flowHop]}
                    r="5"
                    fill="#34d399"
                  />
                </svg>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {topic.hotspots.map((hop, idx) => {
                    const isActive = flowHop === idx;
                    return (
                      <button
                        key={hop.id}
                        type="button"
                        onClick={() => {
                          setFlowHop(idx);
                          setSelectedHotspotId(hop.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? "bg-rose-600/25 border-rose-400 text-white shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <div className="text-[10px] font-mono text-amber-300">0{idx + 1}</div>
                        <div className="text-xs font-bold mt-1">{hop.label[lang]}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {idx === 0 || idx === 3
                            ? "RF Air"
                            : idx === 1
                              ? "Fiber Uplink"
                              : "IP Core"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 via-rose-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${((flowHop + 1) / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* EXHIBIT 2: SIMULATED SMARTPHONE DATA METER */}
            {topic.interactiveMode === "data-phone" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-6 mx-auto w-full max-w-[240px] rounded-2xl border-2 border-slate-700 bg-slate-950 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1.5">
                    <span className="inline-flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-rose-400" />
                      <span>RobiTrail OS</span>
                    </span>
                    <span className="text-emerald-400">4G LTE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: "chat",
                        label: { en: "Chat Msg", bn: "চ্যাট বার্তা" },
                        mb: 1,
                        color: "bg-emerald-600/20 border-emerald-500/40",
                      },
                      {
                        id: "pdf",
                        label: { en: "Study PDF", bn: "স্টাডি পিডিএফ" },
                        mb: 8,
                        color: "bg-sky-600/20 border-sky-500/40",
                      },
                      {
                        id: "sd",
                        label: { en: "360p Class", bn: "৩৬০পি ক্লাস" },
                        mb: 55,
                        color: "bg-amber-600/20 border-amber-500/40",
                      },
                      {
                        id: "hd",
                        label: { en: "1080p HD", bn: "১০৮০পি ভিডিও" },
                        mb: 240,
                        color: "bg-rose-600/20 border-rose-500/40",
                      },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => {
                          setPhoneUsedMb((m) => Math.min(2000, m + app.mb));
                          setLastAppAction(`${app.label[lang]} (+${app.mb} MB)`);
                        }}
                        className={`p-2 rounded-xl border text-left hover:brightness-125 transition-all ${app.color}`}
                      >
                        <div className="text-[11px] font-bold text-white">{app.label[lang]}</div>
                        <div className="text-[10px] font-mono-num text-slate-300">+{app.mb} MB</div>
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlayOn}
                      onChange={() => setAutoPlayOn((v) => !v)}
                      className="accent-rose-500"
                    />
                    <span>
                      {lang === "en"
                        ? "Background Autoplay (+12 MB/tick)"
                        : "ব্যাকগ্রাউন্ড অটোপ্লে চালু"}
                    </span>
                  </label>
                </div>

                <div className="sm:col-span-6 space-y-3">
                  <div>
                    <div className="text-xs text-slate-400">
                      {lang === "en"
                        ? "Simulated Data Tank (2,000 MB Pack)"
                        : "সিমুলেটেড ডেটা ট্যাংক (২,০০০ MB)"}
                    </div>
                    <div className="text-2xl font-mono-num font-bold text-amber-300 mt-0.5">
                      {phoneUsedMb} / 2,000 MB
                    </div>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        phoneUsedMb > 1400
                          ? "bg-rose-500"
                          : phoneUsedMb > 800
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (phoneUsedMb / 2000) * 100)}%` }}
                    />
                  </div>
                  {lastAppAction && (
                    <div className="text-xs font-mono text-sky-300">
                      {lang === "en" ? "Last launch:" : "সর্বশেষ চালানো:"} {lastAppAction}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXHIBIT 3: SIGNAL STRENGTH & MOVABLE OBSTACLES */}
            {topic.interactiveMode === "signal-obstacles" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <svg
                  viewBox="0 0 360 120"
                  className="w-full h-28 rounded-lg bg-sky-950/60 border border-slate-800"
                >
                  <rect x="0" y="96" width="360" height="24" fill="#1e293b" />
                  {/* Tower on left */}
                  <path d="M28 96 L40 28 L52 96" stroke="#cbd5e1" strokeWidth="3" fill="none" />
                  <circle cx="40" cy="26" r="5" fill="#e11d48" />
                  {/* Animated arcs */}
                  {[1, 2, 3].map((r) => (
                    <path
                      key={r}
                      d={`M ${48 + r * 14} ${20 - r * 3} A ${r * 16} ${r * 16} 0 0 1 ${48 + r * 14} ${44 + r * 3}`}
                      fill="none"
                      stroke={calcDbm >= -85 ? "#34d399" : "#fbbf24"}
                      strokeWidth="2"
                      opacity={0.75 - r * 0.15}
                    />
                  ))}
                  {/* Obstacles */}
                  {hasWall && (
                    <rect x="135" y="42" width="16" height="54" fill="#64748b" stroke="#94a3b8" />
                  )}
                  {hasHill && (
                    <path d="M165 96 L195 45 L228 96 Z" fill="#15803d" stroke="#22c55e" />
                  )}
                  {hasRain && (
                    <g stroke="#38bdf8" strokeWidth="1.5" opacity="0.8">
                      <line x1="150" y1="15" x2="145" y2="42" />
                      <line x1="175" y1="12" x2="170" y2="45" />
                      <line x1="205" y1="16" x2="200" y2="44" />
                    </g>
                  )}
                  {/* Sliding Phone */}
                  <rect
                    x={80 + (simDistance / 100) * 230}
                    y="66"
                    width="14"
                    height="26"
                    rx="3"
                    fill="#f8fafc"
                    stroke="#0284c7"
                    strokeWidth="2"
                  />
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">
                      {lang === "en" ? "Estimated Received Power" : "অনুমানিত সিগন্যাল শক্তি"}
                    </div>
                    <div
                      className={`text-2xl font-mono-num font-bold ${calcDbm >= -85 ? "text-emerald-400" : calcDbm >= -98 ? "text-amber-300" : "text-rose-400"}`}
                    >
                      {calcDbm} dBm
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-8 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                    {[1, 2, 3, 4, 5].map((b) => (
                      <div
                        key={b}
                        className={`w-2 rounded-sm ${b <= bars ? (bars >= 3 ? "bg-emerald-400" : "bg-rose-400") : "bg-slate-700"}`}
                        style={{ height: `${b * 4 + 4}px` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono-num text-slate-300">
                    <span>
                      {lang === "en" ? "Move Phone Distance from Tower" : "টাওয়ার থেকে ফোনের দূরত্ব"}
                    </span>
                    <span>{simDistance * 10} m</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={simDistance}
                    onChange={(e) => setSimDistance(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    {
                      active: hasWall,
                      toggle: () => setHasWall((v) => !v),
                      label: { en: "Concrete Wall (-18 dB)", bn: "কংক্রিট দেয়াল (-১৮ dB)" },
                    },
                    {
                      active: hasHill,
                      toggle: () => setHasHill((v) => !v),
                      label: { en: "Hill Shadow (-16 dB)", bn: "টিলার আড়াল (-১৬ dB)" },
                    },
                    {
                      active: hasRain,
                      toggle: () => setHasRain((v) => !v),
                      label: { en: "Monsoon Rain (-7 dB)", bn: "ভারী বৃষ্টি (-৭ dB)" },
                    },
                  ].map((obs) => (
                    <button
                      key={obs.label.en}
                      type="button"
                      onClick={obs.toggle}
                      className={`px-3 py-2 rounded-lg border font-semibold transition-colors ${
                        obs.active
                          ? "bg-rose-600/30 border-rose-400 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {obs.label[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EXHIBIT 4: SPEED VS DATA PIPE RACE */}
            {topic.interactiveMode === "speed-vs-data" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 font-mono-num mb-1">
                      <span>{lang === "en" ? "File Size" : "ফাইল সাইজ"}</span>
                      <span>{fileSizeMb} MB</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={300}
                      step={20}
                      value={fileSizeMb}
                      onChange={(e) => {
                        setFileSizeMb(Number(e.target.value));
                        setRaceTime(0);
                        setRaceRunning(false);
                      }}
                      className="w-full accent-rose-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 font-mono-num mb-1">
                      <span>Pipe A</span>
                      <span>{speedA} Mbps</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={speedA}
                      onChange={(e) => {
                        setSpeedA(Number(e.target.value));
                        setRaceTime(0);
                        setRaceRunning(false);
                      }}
                      className="w-full accent-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300 font-mono-num mb-1">
                      <span>Pipe B</span>
                      <span>{speedB} Mbps</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={5}
                      value={speedB}
                      onChange={(e) => {
                        setSpeedB(Number(e.target.value));
                        setRaceTime(0);
                        setRaceRunning(false);
                      }}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono-num mb-1">
                      <span className="text-sky-300">Pipe A ({speedA} Mbps)</span>
                      <span>
                        {((fileSizeMb * pctA) / 100).toFixed(0)} / {fileSizeMb} MB ·{" "}
                        {durationA.toFixed(1)}s
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all duration-100"
                        style={{ width: `${pctA}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono-num mb-1">
                      <span className="text-emerald-300">Pipe B ({speedB} Mbps)</span>
                      <span>
                        {((fileSizeMb * pctB) / 100).toFixed(0)} / {fileSizeMb} MB ·{" "}
                        {durationB.toFixed(1)}s
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-100"
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRaceTime(0);
                      setRaceRunning(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                  >
                    {lang === "en" ? "Run Side-by-Side Download" : "পাশাপাশি ডাউনলোড পরীক্ষা চালান"}
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    {lang === "en"
                      ? "Theoretical (MB×8)/Mbps; real links add ~5% overhead"
                      : "তাত্ত্বিক হিসাব (MB×৮)÷Mbps; বাস্তবে সামান্য ওভারহেড থাকে"}
                  </span>
                </div>
              </div>
            )}

            {/* EXHIBIT 5: 3D INSPECTABLE CELLULAR TOWER (THREE.JS) */}
            {topic.interactiveMode === "tower-3d" && (
              <Tower3DInspector
                selectedPart={(selectedHotspotId as TowerPartId) || "antenna"}
                onSelectPart={(p) => setSelectedHotspotId(p)}
                paused={paused}
              />
            )}

            {/* EXHIBIT 6: SMS, VOICE & INTERNET SIDE-BY-SIDE */}
            {topic.interactiveMode === "sms-voice-data" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      id: "4g" as const,
                      label: { en: "Strong 4G Street", bn: "শক্তিশালী ৪জি সড়ক" },
                    },
                    {
                      id: "ferry2g" as const,
                      label: { en: "Weak 2G River Ferry", bn: "দুর্বল ২জি ফেরি পারাপার" },
                    },
                    {
                      id: "dataOff" as const,
                      label: { en: "Mobile Data Off", bn: "মোবাইল ডেটা বন্ধ" },
                    },
                  ].map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => setSignalEnv(env.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        signalEnv === env.id
                          ? "bg-rose-600 border-rose-500 text-white"
                          : "bg-slate-950 border-slate-700 text-slate-300"
                      }`}
                    >
                      {env.label[lang]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    {
                      id: "sms",
                      label: { en: "Send SMS", bn: "এসএমএস পাঠান" },
                      works: true,
                      note: { en: "Always delivers (~140 B)", bn: "সব অবস্থায় কাজ করে" },
                    },
                    {
                      id: "ussd",
                      label: { en: "Demo *000# USSD", bn: "ডেমো *000# USSD" },
                      works: true,
                      note: { en: "Illustrative USSD prompt", bn: "নমুনা USSD মেনু" },
                    },
                    {
                      id: "voice",
                      label: { en: "Voice Call", bn: "ভয়েস কল" },
                      works: true,
                      note: { en: "Live 2-way speech", bn: "সরাসরি কথোপকথন" },
                    },
                    {
                      id: "video",
                      label: { en: "4G Live Video", bn: "৪জি লাইভ ভিডিও" },
                      works: signalEnv === "4g",
                      note:
                        signalEnv === "4g"
                          ? { en: "Smooth 480p stream", bn: "মসৃণ স্ট্রিমিং" }
                          : { en: "Blocked without 4G data", bn: "৪জি ডেটা ছাড়া ব্যর্থ" },
                    },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannelLog(`${ch.label[lang]} → ${ch.note[lang]}`)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        ch.works
                          ? "bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 text-white"
                          : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                      }`}
                    >
                      <div className="font-bold">{ch.label[lang]}</div>
                      <div className="text-[11px] opacity-80 mt-1">{ch.note[lang]}</div>
                    </button>
                  ))}
                </div>
                {channelLog && (
                  <div className="text-xs font-mono text-sky-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    {channelLog}
                  </div>
                )}
              </div>
            )}

            {/* EXHIBIT 7: NETWORK CONGESTION GAUGE */}
            {topic.interactiveMode === "congestion-sector" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">
                      {lang === "en"
                        ? "Shared 100 Mbps Sector Load"
                        : "শেয়ার্ড ১০০ Mbps সেক্টরের চাপ"}
                    </div>
                    <div
                      className={`text-2xl font-mono-num font-bold ${utilizationPct > 85 ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {utilizationPct}% ({totalLoadMbps} / 100 Mbps)
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-num">
                    {lang === "en" ? "Queue Latency:" : "ল্যাটেন্সি:"}{" "}
                    <span className={estLatencyMs > 100 ? "text-rose-400" : "text-emerald-400"}>
                      {estLatencyMs} ms
                    </span>
                  </div>
                </div>

                <div className="h-3.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      utilizationPct > 90
                        ? "bg-rose-500"
                        : utilizationPct > 75
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, utilizationPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      active: load4kStreams,
                      toggle: () => setLoad4kStreams((v) => !v),
                      label: {
                        en: "6× Evening 4K TV Streams (54 Mbps)",
                        bn: "৬টি ৪কে টিভি স্ট্রিম (৫৪ Mbps)",
                      },
                    },
                    {
                      active: loadBackups,
                      toggle: () => setLoadBackups((v) => !v),
                      label: {
                        en: "Auto Cloud Photo Backups (34 Mbps)",
                        bn: "অটো ক্লাউড ব্যাকআপ (৩৪ Mbps)",
                      },
                    },
                    {
                      active: loadExamClass,
                      toggle: () => setLoadExamClass((v) => !v),
                      label: {
                        en: "Student Study Classes (16 Mbps)",
                        bn: "শিক্ষার্থীর অনলাইন ক্লাস (১৬ Mbps)",
                      },
                    },
                    {
                      active: loadChats,
                      toggle: () => setLoadChats((v) => !v),
                      label: {
                        en: "Text & Voice Messaging (5 Mbps)",
                        bn: "টেক্সট ও ভয়েস বার্তা (৫ Mbps)",
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label.en}
                      type="button"
                      onClick={item.toggle}
                      className={`p-2.5 rounded-lg border text-left font-semibold transition-colors ${
                        item.active
                          ? "bg-rose-600/20 border-rose-500/60 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      {item.label[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EXHIBIT 8: ROBI AND BDAPPS PIPELINE */}
            {topic.interactiveMode === "robi-bdapps" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      id: "sms" as const,
                      label: { en: "Exam Alert SMS API", bn: "পরীক্ষা সতর্কবার্তা SMS এপিআই" },
                    },
                    {
                      id: "otp" as const,
                      label: { en: "Login OTP Verification", bn: "লগইন ওটিপি যাচাই" },
                    },
                    {
                      id: "sub" as const,
                      label: { en: "Consent Subscription API", bn: "সম্মতি-ভিত্তিক সাবস্ক্রিপশন" },
                    },
                  ].map((api) => (
                    <button
                      key={api.id}
                      type="button"
                      onClick={() => {
                        setBdappsApi(api.id);
                        setApiStep(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        bdappsApi === api.id
                          ? "bg-rose-600 border-rose-500 text-white"
                          : "bg-slate-950 border-slate-700 text-slate-300"
                      }`}
                    >
                      {api.label[lang]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  {[
                    { en: "Student App", bn: "শিক্ষার্থী অ্যাপ" },
                    { en: "bdapps Gateway", bn: "bdapps গেটওয়ে" },
                    { en: "Robi Core", bn: "রবি কোর" },
                    { en: "User Handset", bn: "গ্রাহকের ফোন" },
                  ].map((node, idx) => (
                    <div
                      key={node.en}
                      className={`p-2.5 rounded-xl border transition-all ${
                        apiStep >= idx + 1
                          ? "bg-emerald-950/60 border-emerald-400 text-emerald-200"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <Wifi className="w-3.5 h-3.5 mx-auto mb-1 text-rose-400" />
                      <div className="font-bold">{node[lang]}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setApiStep((s) => (s >= 4 ? 1 : s + 1))}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                  >
                    {apiStep === 0
                      ? lang === "en"
                        ? "Send Sandbox Request"
                        : "স্যান্ডবক্স অনুরোধ পাঠান"
                      : apiStep < 4
                        ? lang === "en"
                          ? `Advance Step (${apiStep}/4)`
                          : `পরবর্তী ধাপ (${apiStep}/৪)`
                        : lang === "en"
                          ? "Run Again (Confirmed 200 OK)"
                          : "আবার চালান (সফল ২০০ OK)"}
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    {bdappsApi === "sub"
                      ? "requires_otp_consent: true"
                      : `endpoint: /caas/${bdappsApi}/send`}
                  </span>
                </div>
              </div>
            )}

            {/* EXHIBIT 9: BANGLADESH DIGITAL CONNECTIVITY */}
            {topic.interactiveMode === "bd-connectivity" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5">
                  <svg viewBox="0 0 220 240" className="w-full h-52">
                    <path
                      d="M72 20 L118 22 L156 54 L196 62 L188 94 L164 106 L176 146 L202 206 L176 226 L154 182 L134 158 L108 188 L76 184 L52 152 L42 106 L58 64 Z"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="2.5"
                    />
                    <line
                      x1="106"
                      y1="110"
                      x2="156"
                      y2="74"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="106"
                      y1="110"
                      x2="162"
                      y2="174"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {[
                      {
                        id: "dhaka" as const,
                        cx: 106,
                        cy: 110,
                        label: { en: "Dhaka", bn: "ঢাকা" },
                      },
                      {
                        id: "sylhet" as const,
                        cx: 156,
                        cy: 74,
                        label: { en: "Sylhet", bn: "সিলেট" },
                      },
                      {
                        id: "chattogram" as const,
                        cx: 162,
                        cy: 174,
                        label: { en: "Chattogram", bn: "চট্টগ্রাম" },
                      },
                    ].map((node) => {
                      const active = focusDivision === node.id;
                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onClick={() => setFocusDivision(node.id)}
                        >
                          <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={active ? 11 : 8}
                            fill={active ? "#e11d48" : "#38bdf8"}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x={node.cx}
                            y={node.cy + 20}
                            textAnchor="middle"
                            fill="#e2e8f0"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {node.label[lang]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div className="text-xs font-mono text-amber-300">
                    {focusDivision === "dhaka"
                      ? lang === "en"
                        ? "DHAKA · HIGH-DENSITY URBAN CORRIDOR"
                        : "ঢাকা · ঘনবসতিপূর্ণ নগর করিডোর"
                      : focusDivision === "chattogram"
                        ? lang === "en"
                          ? "CHATTOGRAM · PORT, COAST & HILLS"
                          : "চট্টগ্রাম · বন্দর, উপকূল ও পাহাড়"
                        : lang === "en"
                          ? "SYLHET · RIVERS, HAORS & TEA VALLEYS"
                          : "সিলেট · নদী, হাওর ও চা বাগান উপত্যকা"}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {focusDivision === "dhaka"
                      ? lang === "en"
                        ? "High-rise concrete density and peak evening traffic require multi-band small cells and heavy fiber aggregation."
                        : "বহুতল ভবন ও সন্ধ্যার অতিরিক্ত ব্যবহার সামলাতে মাল্টি-ব্যান্ড সেল ও শক্তিশালী ফাইবার সংযোগ প্রয়োজন হয়।"
                      : focusDivision === "chattogram"
                        ? lang === "en"
                          ? "Submarine cable gateways, shipping terminals, and hill ridges call for elevated line-of-sight sector placement."
                          : "সাবমেরিন ক্যাবল গেটওয়ে, বন্দর এলাকা এবং পাহাড়ি টিলায় উঁচু টাওয়ার স্থাপন অত্যন্ত গুরুত্বপূর্ণ।"
                        : lang === "en"
                          ? "Floodplain crossings, monsoon rain, and valley shadows showcase why microwave relays, SMS backup, and fiber splicing matter."
                          : "নদী-হাওর, ভারী বর্ষা ও টিলার ছায়ার মধ্যে মাইক্রোওয়েভ রিলে, এসএমএস ব্যাকআপ ও ফাইবার মেরামত অপরিহার্য।"}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/research/bangladesh")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    <span>
                      {lang === "en"
                        ? "Open Full Bangladesh Research Page"
                        : "পূর্ণ বাংলাদেশ গবেষণা পাতা দেখুন"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clickable Hotspots & Curated Breakdown */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              {lang === "en" ? "Inspect Components & Hotspots" : "যন্ত্রাংশ ও মূল ধারণা পরীক্ষা করুন"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topic.hotspots.map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => setSelectedHotspotId(hs.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    hs.id === activeHotspot?.id
                      ? "bg-rose-600 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {hs.label[lang]}
                </button>
              ))}
            </div>
            {activeHotspot && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                <div className="text-xs font-bold text-amber-300">{activeHotspot.label[lang]}</div>
                <p className="text-sm text-slate-100 leading-relaxed">
                  {activeHotspot.explanation[lang]}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">{topic.tryIt[lang]}</p>
          </div>
        </div>
      </div>

      {/* Step 3: 3. UNDERSTAND (Clear, Concise Textual Explanation) */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4 sm:p-5 space-y-2.5">
        <div className="text-[11px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
          {lang === "en" ? "3. UNDERSTAND THE KEY CONCEPT" : "৩. মূল ধারণা ও সহজ ব্যাখ্যা"}
        </div>
        <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
          {topic.understandIt[lang]}
        </p>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{topic.seeIt[lang]}</p>
      </div>

      {/* Step 4: 4. EXPLORE DEEPER */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 space-y-3">
        <div className="text-[11px] font-mono font-bold text-amber-800 uppercase tracking-wider">
          {lang === "en" ? "4. EXPLORE DEEPER" : "৪. আরও গভীরে জানুন (EXPLORE DEEPER)"}
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">{topic.exploreMore[lang]}</p>

        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <span>
              {lang === "en"
                ? "Technical Engineering Reference (Optional)"
                : "কারিগরি বিস্তারিত নোট (ঐচ্ছিক)"}
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAdvanced && (
            <div className="px-4 pb-3 text-xs text-slate-700 leading-relaxed border-t border-slate-100 pt-2.5">
              {topic.advancedNote[lang]}
            </div>
          )}
        </div>
      </div>

      {/* Step 5: 5. SOURCES */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span className="font-mono font-bold text-slate-500 uppercase mr-2">
            {lang === "en" ? "5. SOURCES:" : "৫. তথ্যসূত্র:"}
          </span>
          <span className="text-slate-700 font-medium">{topic.sourceAttribution}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/research/bangladesh")}
          className="text-rose-600 hover:text-rose-500 font-semibold inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{lang === "en" ? "Full Citations & Data" : "সকল গবেষণা তথ্যসূত্র"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const InteractiveHandbookSection: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [activeTopicId, setActiveTopicId] = useState(HANDBOOK_TOPICS[0].id);
  const currentTopic = HANDBOOK_TOPICS.find((t) => t.id === activeTopicId) || HANDBOOK_TOPICS[0];

  return (
    <section
      id="handbook"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-slate-200 space-y-10"
    >
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-mono text-rose-600 uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" />
          <span>
            {lang === "en"
              ? "Interactive Technology Exhibits · 9 Hands-On Labs"
              : "ইন্টারেক্টিভ প্রযুক্তি প্রদর্শনী · ৯টি হাতে-কলমে ল্যাব"}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display">
          {lang === "en" ? "Explore the Technology" : "প্রযুক্তি হাতে-কলমে জানুন"}
        </h2>
        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
          {currentTopic.summary[lang]}
        </p>
      </div>

      {/* 9-Exhibit Selector */}
      <div className="flex flex-wrap gap-2">
        {HANDBOOK_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setActiveTopicId(topic.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              topic.id === currentTopic.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
            }`}
          >
            {topic.order}. {topic.title[lang]}
          </button>
        ))}
      </div>

      <InteractiveHandbookLab topic={currentTopic} />

      {/* Clean Editorial Bridge Card to /research/bangladesh */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-300 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>
              {lang === "en"
                ? "NATIONAL TELECOM REPORT & ARCHIVES"
                : "জাতীয় টেলিকম গবেষণা ও আর্কাইভ"}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {lang === "en"
              ? "Looking for BTRC & BBS Bangladesh Connectivity Statistics?"
              : "বাংলাদেশের বিটিআরসি ও বিবিএস ডিজিটাল সংযোগ পরিসংখ্যান দেখতে চান?"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === "en"
              ? "Verified subscriber breakdowns, household vs individual digital access benchmarks, regional topology across Chattogram, Dhaka & Sylhet, and official citations live in our dedicated Research page."
              : "জাতীয় মোবাইল ও ইন্টারনেট গ্রাহক সংখ্যা, পরিবার বনাম ব্যক্তিগত ব্যবহার এবং আঞ্চলিক নেটওয়ার্ক তথ্য দেখতে আমাদের গবেষণা পাতায় যান।"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/research/bangladesh")}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors shrink-0 cursor-pointer"
        >
          <span>{lang === "en" ? "Explore Bangladesh Research" : "বাংলাদেশ গবেষণা পাতা দেখুন"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export const HandbookQuickDrawer: React.FC = () => {
  const { lang, activeHandbookTopicId, openHandbookTopic } = useRobiTrail();
  if (!activeHandbookTopicId) return null;
  const topic = HANDBOOK_TOPICS.find((t) => t.id === activeHandbookTopicId) || HANDBOOK_TOPICS[0];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 flex justify-end">
      <div className="w-full max-w-3xl bg-white h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-mono text-rose-600">
              {lang === "en" ? "EXPLORE THE TECHNOLOGY" : "প্রযুক্তি হাতে-কলমে জানুন"}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{topic.title[lang]}</h3>
          </div>
          <button
            type="button"
            onClick={() => openHandbookTopic(null)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Close handbook"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-700">{topic.summary[lang]}</p>
        <InteractiveHandbookLab topic={topic} />
      </div>
    </div>
  );
};
