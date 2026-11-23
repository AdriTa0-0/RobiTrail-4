import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../../context/RobiTrailContext";
import { CheckCircle2, Play, RotateCcw, Smartphone, Wifi } from "lucide-react";

interface DhakaSpeedDataLabProps {
  paused?: boolean;
  hintLevel?: number;
  onProgress: (pct: number) => void;
  onComplete: () => void;
  onMistake?: (actionKey: string) => void;
}

export const DhakaSpeedDataLab: React.FC<DhakaSpeedDataLabProps> = ({
  paused = false,
  hintLevel = 0,
  onProgress,
  onComplete,
  onMistake,
}) => {
  const { lang } = useRobiTrail();
  const [fileSizeMb, setFileSizeMb] = useState(160);
  const [speedA, setSpeedA] = useState(10);
  const [speedB, setSpeedB] = useState(40);
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [ranDifferentSpeeds, setRanDifferentSpeeds] = useState(false);
  const [verdictChoice, setVerdictChoice] = useState<string>("");
  const [solved, setSolved] = useState(false);

  // Idealized theoretical time in seconds = (MB * 8) / Mbps
  const idealTimeA = (fileSizeMb * 8) / speedA;
  const idealTimeB = (fileSizeMb * 8) / speedB;
  const maxDuration = Math.max(idealTimeA, idealTimeB);

  useEffect(() => {
    if (!running || paused) return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.6; // Accelerated visualization rate (~12x real time so 128s finishes in ~10s)
        if (next >= maxDuration) {
          setRunning(false);
          if (speedA !== speedB) {
            setRanDifferentSpeeds(true);
            onProgress(70);
          } else {
            onProgress(35);
          }
          return maxDuration;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [running, paused, maxDuration, speedA, speedB, onProgress]);

  const progressA = Math.min(1, elapsedSec / idealTimeA);
  const progressB = Math.min(1, elapsedSec / idealTimeB);
  const downloadedA = Math.round(fileSizeMb * progressA);
  const downloadedB = Math.round(fileSizeMb * progressB);
  const bothFinished = progressA >= 0.999 && progressB >= 0.999;

  const startRace = () => {
    setElapsedSec(0);
    setRunning(true);
    setVerdictChoice("");
    onProgress(30);
  };

  const resetRace = () => {
    setRunning(false);
    setElapsedSec(0);
    setVerdictChoice("");
    setRanDifferentSpeeds(false);
    setSolved(false);
    onProgress(0);
  };

  const submitVerdict = (
    choice: "faster-more-data" | "same-data-less-time" | "slower-less-data",
  ) => {
    setVerdictChoice(choice);
    if (choice === "same-data-less-time" && ranDifferentSpeeds) {
      setSolved(true);
      onProgress(100);
      onComplete();
    } else if (ranDifferentSpeeds && choice !== "same-data-less-time") {
      onMistake?.(`dhk3:${choice}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Parameters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl bg-slate-950 text-white p-5 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono-num">
            <span className="text-slate-300">
              {lang === "en" ? "Shared File Size" : "ফাইলের আকার"}
            </span>
            <span className="font-bold text-amber-300">{fileSizeMb} MB</span>
          </div>
          <input
            type="range"
            min={80}
            max={320}
            step={40}
            value={fileSizeMb}
            onChange={(e) => {
              setFileSizeMb(Number(e.target.value));
              setElapsedSec(0);
              setRunning(false);
            }}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="text-[11px] text-slate-400">
            {lang === "en"
              ? "Same science study archive on both phones"
              : "উভয় ফোনেই একই পড়াশোনার ফাইল"}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono-num">
            <span className="text-sky-300 font-semibold">
              {lang === "en" ? "Phone A Link Speed" : "ফোন এ-র গতি"}
            </span>
            <span className="font-bold text-sky-300">{speedA} Mbps</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={speedA}
            onChange={(e) => {
              setSpeedA(Number(e.target.value));
              setElapsedSec(0);
              setRunning(false);
            }}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <div className="text-[11px] font-mono-num text-slate-400">
            {lang === "en" ? "Expected Time:" : "সম্ভাব্য সময়:"} {idealTimeA.toFixed(1)}s
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono-num">
            <span className="text-emerald-300 font-semibold">
              {lang === "en" ? "Phone B Link Speed" : "ফোন বি-র গতি"}
            </span>
            <span className="font-bold text-emerald-300">{speedB} Mbps</span>
          </div>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={speedB}
            onChange={(e) => {
              setSpeedB(Number(e.target.value));
              setElapsedSec(0);
              setRunning(false);
            }}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="text-[11px] font-mono-num text-slate-400">
            {lang === "en" ? "Expected Time:" : "সম্ভাব্য সময়:"} {idealTimeB.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Dual Smartphone Visual Race Track */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          {
            title: { en: "Phone A", bn: "ফোন এ" },
            speed: speedA,
            pct: progressA * 100,
            downloaded: downloadedA,
            idealSec: idealTimeA,
            done: progressA >= 0.999,
            accentBg: "bg-sky-500",
            borderColor: "border-sky-400",
            badgeColor: "text-sky-400",
          },
          {
            title: { en: "Phone B", bn: "ফোন বি" },
            speed: speedB,
            pct: progressB * 100,
            downloaded: downloadedB,
            idealSec: idealTimeB,
            done: progressB >= 0.999,
            accentBg: "bg-emerald-500",
            borderColor: "border-emerald-400",
            badgeColor: "text-emerald-400",
          },
        ].map((phone) => (
          <div
            key={phone.title.en}
            className={`rounded-2xl bg-slate-950 text-white p-5 border-2 transition-colors ${
              phone.done ? phone.borderColor : "border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/10">
                  <Smartphone className={`w-5 h-5 ${phone.badgeColor}`} />
                </div>
                <div>
                  <div className="text-sm font-bold">{phone.title[lang]}</div>
                  <div className={`text-xs font-mono-num ${phone.badgeColor}`}>
                    {phone.speed} Mbps
                  </div>
                </div>
              </div>
              <div className="text-right font-mono-num">
                <div className="text-[11px] text-slate-400">
                  {lang === "en" ? "Signal" : "সংযোগ"}
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>4G LTE</span>
                </div>
              </div>
            </div>

            {/* Animated Packet Stream Pipe */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-mono-num text-slate-300">
                <span>{lang === "en" ? "Download Progress" : "ডাউনলোড অগ্রগতি"}</span>
                <span>{Math.round(phone.pct)}%</span>
              </div>
              <div className="relative h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div
                  className={`h-full ${phone.accentBg} transition-all duration-100`}
                  style={{ width: `${phone.pct}%` }}
                />
              </div>
            </div>

            {/* Live Counters */}
            <div className="grid grid-cols-2 gap-3 font-mono-num">
              <div
                className={`p-3 rounded-xl bg-slate-900 border ${hintLevel >= 2 ? "border-amber-400" : "border-slate-800"}`}
              >
                <div className="text-[11px] text-slate-400">
                  {lang === "en" ? "Total Data Used" : "মোট ব্যবহৃত ডেটা"}
                </div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {phone.downloaded} / {fileSizeMb} MB
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400">
                  {lang === "en" ? "Transfer Time" : "মোট সময়"}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${phone.done ? "text-emerald-400" : "text-amber-300"}`}
                >
                  {Math.min(elapsedSec, phone.idealSec).toFixed(1)}s
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Formula + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 border border-slate-200 p-4">
        <div className="space-y-0.5">
          <div className="text-xs font-mono font-bold text-slate-800">
            Time (s) = (File Size {fileSizeMb} MB × 8 bits) ÷ Speed Mbps
          </div>
          <div className="text-[11px] text-slate-600">
            {lang === "en"
              ? "Theoretical formula shown; real mobile networks add minor TCP/IP protocol overhead."
              : "এখানে তাত্ত্বিক হিসাব দেখানো হয়েছে; বাস্তব নেটওয়ার্কে প্রোটোকল ওভারহেডের কারণে সামান্য সময় বেশি লাগে।"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startRace}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {bothFinished
                ? lang === "en"
                  ? "Repeat Race"
                  : "আবার রেস চালান"
                : lang === "en"
                  ? "Start Dual Download"
                  : "ডাউনলোড রেস শুরু করুন"}
            </span>
          </button>
          <button
            type="button"
            onClick={resetRace}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Reset" : "রিসেট"}</span>
          </button>
        </div>
      </div>

      {speedA === speedB && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
          {lang === "en"
            ? "Set Phone A and Phone B to two different Mbps speeds before running the experiment so you can observe the contrast."
            : "তুলনা বোঝার জন্য ফোন এ এবং ফোন বি-র গতি আলাদা সেট করে পরীক্ষাটি চালান।"}
        </div>
      )}

      {/* Post-Experiment Verification Question */}
      {ranDifferentSpeeds && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {lang === "en"
                ? "EXPERIMENT OBSERVED · LOCK IN WHAT YOU PROVED"
                : "পরীক্ষা সম্পন্ন · আপনি যা প্রমাণ করলেন তা নির্বাচন করুন"}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900">
            {lang === "en"
              ? `Both phones downloaded the ${fileSizeMb} MB study pack at different speeds. What changed?`
              : `ভিন্ন গতিতে একই ${fileSizeMb} MB ফাইল ডাউনলোডে কোনটি বদলেছে এবং কোনটি একই ছিল?`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "faster-more-data" as const,
                label: {
                  en: "Higher Mbps consumes double the MB data",
                  bn: "বেশি গতি মানেই দ্বিগুণ ডেটা খরচ",
                },
              },
              {
                id: "same-data-less-time" as const,
                label: {
                  en: "Higher Mbps finishes faster; total MB stays equal",
                  bn: "বেশি গতিতে সময় কম লাগে; মোট MB সমান থাকে",
                },
              },
              {
                id: "slower-less-data" as const,
                label: {
                  en: "Slower connections reduce the file size automatically",
                  bn: "ধীর গতিতে ফাইলের আকার ছোট হয়ে যায়",
                },
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => submitVerdict(opt.id)}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                  verdictChoice === opt.id
                    ? opt.id === "same-data-less-time"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-rose-600 border-rose-600 text-white"
                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-400"
                }`}
              >
                {opt.label[lang]}
              </button>
            ))}
          </div>
          {verdictChoice && verdictChoice !== "same-data-less-time" && !solved && (
            <div className="text-xs font-semibold text-rose-700">
              {lang === "en"
                ? `Look at Phone A & B above: both boxes show "${fileSizeMb} / ${fileSizeMb} MB" — only Transfer Time (s) differed!`
                : `ওপরের দুটি ফোনের বক্স দেখুন—উভয়েই "${fileSizeMb} / ${fileSizeMb} MB" দেখাচ্ছে, কেবল সময় ভিন্ন!`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
