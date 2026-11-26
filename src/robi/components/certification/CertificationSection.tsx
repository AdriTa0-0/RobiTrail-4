import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { CITIES } from "../../data/cities/cities";
import { TRAILS } from "../../data/trails/trails";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { getSubscriberToken } from "../../services/auth/sessionMemory";
import { Award, CheckCircle2, Download, AlertCircle, FileCheck2 } from "lucide-react";

interface CertificateRecord {
  certificateId: string;
  learnerName: string;
  completedTrailIds: string[];
  scorePercent: number;
  issuedAt: string;
  prototypeLabel: string;
}

const QUESTIONS = [
  {
    id: "q1",
    correctValue: "tower_core_tower",
    question: {
      en: "1. How does an SMS travel between two mobile phones across Chattogram?",
      bn: "১. চট্টগ্রামের দুটি ফোনের মধ্যে এসএমএস কীভাবে পৌঁছায়?",
    },
    options: [
      {
        value: "direct_phone",
        label: {
          en: "Directly from phone to phone without towers",
          bn: "টাওয়ার ছাড়াই সরাসরি ফোন থেকে ফোনে",
        },
      },
      {
        value: "tower_core_tower",
        label: {
          en: "Phone → Local Tower → Core Switching Hub → Receiver Tower → Phone",
          bn: "ফোন → স্থানীয় টাওয়ার → কোর সুইচিং → গ্রাহক টাওয়ার → ফোন",
        },
      },
      {
        value: "bluetooth_mesh",
        label: { en: "Via Bluetooth relays on streetlights", bn: "স্ট্রিটলাইটের ব্লুটুথের মাধ্যমে" },
      },
    ],
  },
  {
    id: "q2",
    correctValue: "same_volume_faster_time",
    question: {
      en: "2. If you upgrade from 10 Mbps to 50 Mbps while downloading a 200 MB file, what happens?",
      bn: "২. ২০০ মেগাবাইট ফাইল ডাউনলোডে গতি ১০ Mbps থেকে ৫০ Mbps হলে কী ঘটে?",
    },
    options: [
      {
        value: "more_data_used",
        label: { en: "It uses 5× more mobile data", bn: "এটি ৫ গুণ বেশি মোবাইল ডেটা খরচ করে" },
      },
      {
        value: "same_volume_faster_time",
        label: {
          en: "It finishes much faster while using the same 200 MB",
          bn: "একই ২০০ MB ডেটা ব্যবহার করে অনেক দ্রুত ডাউনলোড হয়",
        },
      },
    ],
  },
  {
    id: "q3",
    correctValue: "buildings_and_distance",
    question: {
      en: "3. Which two factors commonly weaken indoor 4G radio signal strength?",
      bn: "৩. নিচের কোন দুটি কারণে ঘরের ভেতর ৪জি সিগন্যাল দুর্বল হতে পারে?",
    },
    options: [
      {
        value: "buildings_and_distance",
        label: {
          en: "Distance from tower and concrete walls / hills",
          bn: "টাওয়ার থেকে দূরত্ব এবং কংক্রিট দেয়াল বা পাহাড়",
        },
      },
      {
        value: "screen_brightness",
        label: {
          en: "Phone screen brightness and wallpaper",
          bn: "ফোনের স্ক্রিন ব্রাইটনেস ও ওয়ালপেপার",
        },
      },
    ],
  },
  {
    id: "q4",
    correctValue: "sms_or_voice",
    question: {
      en: "4. On a Padma ferry crossing with weak 2G-only signal, which service is most dependable?",
      bn: "৪. দুর্বল ২জি নেটওয়ার্কে নদী পারাপারে কোন সেবা সবচেয়ে নির্ভরযোগ্য?",
    },
    options: [
      { value: "sms_or_voice", label: { en: "SMS text or Voice Call", bn: "এসএমএস অথবা ভয়েস কল" } },
      {
        value: "4k_video",
        label: { en: "1080p live video streaming", bn: "১০৮০পি লাইভ ভিডিও স্ট্রিমিং" },
      },
    ],
  },
  {
    id: "q5",
    correctValue: "mnp_cannot_verify_by_prefix",
    question: {
      en: "5. Why can’t a platform prove a phone number uses a Robi SIM solely from its 018 prefix?",
      bn: "৫. শুধুমাত্র ০১৮ প্রিফিক্স দেখে কেন নিশ্চিতভাবে রবি সিম প্রমাণ করা যায় না?",
    },
    options: [
      {
        value: "mnp_cannot_verify_by_prefix",
        label: {
          en: "Mobile Number Portability (MNP) lets users switch operators while keeping numbers",
          bn: "এমএনপি (MNP) সুবিধায় একই নম্বর রেখে অপারেটর পরিবর্তন করা যায়",
        },
      },
      {
        value: "numbers_change_daily",
        label: {
          en: "Phone numbers rotate randomly every midnight",
          bn: "প্রতিদিন রাতে নম্বর স্বয়ংক্রিয়ভাবে বদলে যায়",
        },
      },
    ],
  },
  {
    id: "q6",
    correctValue: "sector_bandwidth_sharing",
    question: {
      en: "6. Why can internet slow down at 9 PM even when your phone shows full signal bars?",
      bn: "৬. ফোনে পূর্ণ সিগন্যাল বার থাকার পরও রাত ৯টায় গতি কমতে পারে কেন?",
    },
    options: [
      {
        value: "sector_bandwidth_sharing",
        label: {
          en: "Many nearby devices share one tower sector’s capacity",
          bn: "আশপাশের অনেক ডিভাইস একই টাওয়ার সেক্টরের সক্ষমতা ভাগ করে নেয়",
        },
      },
      {
        value: "night_gravity",
        label: {
          en: "Radio waves become heavier after sunset",
          bn: "সূর্যাস্তের পর রেডিও তরঙ্গ ভারী হয়ে যায়",
        },
      },
    ],
  },
];

export const CertificationSection: React.FC = () => {
  const {
    lang,
    completedTrailIds,
    getCityProgress,
    accountProfile,
    signedIn,
    registerIssuedCertificate,
    refreshAccountFromServer,
  } = useRobiTrail();
  const [learnerName, setLearnerName] = useState(accountProfile?.displayName || "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    if (!learnerName && accountProfile?.displayName) {
      setLearnerName(accountProfile.displayName);
    }
  }, [accountProfile?.displayName, learnerName]);

  const eligibleForAssessment = completedTrailIds.length >= 3;

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultMsg(null);
    setSubmitting(true);
    try {
      const token = getSubscriberToken();
      const res = await fetch("/api/certification/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          learnerName,
          completedTrailIds,
          answers,
        }),
      });
      const data = (await res.json()) as {
        passed?: boolean;
        scorePercent?: number;
        message?: string;
        error?: string;
        certificate?: CertificateRecord;
      };
      if (!res.ok) {
        setResultMsg(data.error || "Assessment failed.");
      } else if (data.passed && data.certificate) {
        setCertificate(data.certificate);
        registerIssuedCertificate(data.certificate.certificateId);
        if (signedIn) {
          void refreshAccountFromServer();
        }
        setResultMsg(
          lang === "en"
            ? `Assessment Passed (${data.scorePercent}%). Your RobiTrail certificate is issued and saved.`
            : `মূল্যায়ন উত্তীর্ণ (${data.scorePercent}%)! নিচে আপনার শিক্ষামূলক সনদপত্র তৈরি ও সংরক্ষিত হয়েছে।`,
        );
      } else {
        setResultMsg(data.message || `Score: ${data.scorePercent}%. Please review and retry.`);
      }
    } catch {
      setResultMsg(
        lang === "en" ? "Network error verifying assessment." : "সার্ভারে যাচাই করতে সমস্যা হয়েছে।",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (!certificate) return;
    const safeName = certificate.learnerName.replace(/[<>&"]/g, "");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
  <rect width="900" height="620" fill="#FAF8F5"/>
  <rect x="24" y="24" width="852" height="572" fill="none" stroke="#9F1239" stroke-width="4"/>
  <rect x="36" y="36" width="828" height="548" fill="none" stroke="#D6CEBE" stroke-width="1.5"/>
  <text x="450" y="96" text-anchor="middle" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#9F1239">ROBITRAIL · BDAPPS TECH QUEST</text>
  <text x="450" y="152" text-anchor="middle" font-family="serif" font-size="38" font-weight="bold" fill="#111827">Certificate of Completion</text>
  <text x="450" y="210" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#4B5563">Awarded to</text>
  <text x="450" y="268" text-anchor="middle" font-family="serif" font-size="34" font-weight="bold" fill="#111827">${safeName}</text>
  <line x1="220" y1="286" x2="680" y2="286" stroke="#D1D5DB" stroke-width="2"/>
  <text x="450" y="336" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#374151">For completing ${certificate.completedTrailIds.length} interactive trails and scoring ${certificate.scorePercent}% on the Telecom Literacy Assessment.</text>
  <text x="450" y="406" text-anchor="middle" font-family="monospace" font-size="13" fill="#6B7280">ID: ${certificate.certificateId} | Date: ${certificate.issuedAt.slice(0, 10)}</text>
  <text x="450" y="534" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9F1239">Educational app created for BDapps Tech Quest — Learning demonstration credential.</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RobiTrail-Certificate-${certificate.certificateId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="certification" className="bg-[#FAF8F5] border-t border-stone-200 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        <div className="max-w-2xl">
          <div className="text-xs font-mono text-rose-700 uppercase tracking-widest mb-1">
            {t(UI_DICT.certification.badge, lang)}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display">
            {t(UI_DICT.certification.title, lang)}
          </h1>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
            {t(UI_DICT.certification.subtitle, lang)}
          </p>
        </div>

        {/* Progress Overview vs Assessment Eligibility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CITIES.map((city) => {
            const p = getCityProgress(city.id);
            return (
              <div key={city.id} className="p-4 rounded-xl bg-white border border-stone-200">
                <div className="text-xs font-mono text-stone-500">{t(city.name, lang)}</div>
                <div className="text-2xl font-mono-num font-bold text-stone-900 mt-1">
                  {p.completed}/{p.total}
                </div>
                <div className="text-xs text-stone-600 mt-1">{t(city.achievement.title, lang)}</div>
              </div>
            );
          })}
          <div className="p-4 rounded-xl bg-stone-900 text-white border border-stone-800">
            <div className="text-xs font-mono text-amber-300">
              {lang === "en" ? "Certificate Eligibility" : "সনদপত্রের যোগ্যতা"}
            </div>
            <div className="text-2xl font-mono-num font-bold mt-1">
              {completedTrailIds.length}/{TRAILS.length}
            </div>
            <div className="text-xs text-stone-300 mt-1">
              {eligibleForAssessment
                ? lang === "en"
                  ? "Eligible for Assessment"
                  : "মূল্যায়নের জন্য যোগ্য"
                : lang === "en"
                  ? "Complete 3+ trails to unlock"
                  : "কমপক্ষে ৩টি ট্রেইল সম্পন্ন করুন"}
            </div>
          </div>
        </div>

        {/* Formal Assessment Form */}
        <form
          onSubmit={handleSubmitAssessment}
          className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {lang === "en"
                  ? "Telecom Literacy Assessment (6 Questions)"
                  : "টেলিকম দক্ষতা মূল্যায়ন পরীক্ষা (৬টি প্রশ্ন)"}
              </h2>
              <p className="text-xs text-stone-500">
                {lang === "en"
                  ? "Server-verified assessment. Minimum 67% (4/6) required."
                  : "সার্ভার-যাচাইকৃত পরীক্ষা। উত্তীর্ণ হতে কমপক্ষে ৬৭% (৬টির মধ্যে ৪টি) সঠিক উত্তর প্রয়োজন।"}
              </p>
            </div>
            <input
              type="text"
              required
              minLength={2}
              value={learnerName}
              onChange={(e) => setLearnerName(e.target.value)}
              placeholder={
                lang === "en" ? "Your full name on certificate" : "সনদপত্রে আপনার পূর্ণ নাম"
              }
              className="px-3.5 py-2 rounded-lg border border-stone-300 text-sm w-full sm:w-64"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTIONS.map((q) => {
              const selectedValue = answers[q.id];
              const isWrongSelected = Boolean(selectedValue) && selectedValue !== q.correctValue;

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-stone-900">{q.question[lang]}</div>
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isChecked = selectedValue === opt.value;
                      const isCorrectOption = isChecked && opt.value === q.correctValue;
                      const isWrongOption = isChecked && opt.value !== q.correctValue;

                      return (
                        <label
                          key={opt.value}
                          className="group flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.value}
                            checked={isChecked}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                            className="sr-only peer"
                          />
                          <span
                            aria-hidden="true"
                            data-testid={`radio-bullet-${q.id}-${opt.value}`}
                            data-state={
                              isCorrectOption ? "correct" : isWrongOption ? "wrong" : "unselected"
                            }
                            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 ${
                              isCorrectOption
                                ? "border-emerald-600 peer-focus-visible:ring-emerald-600"
                                : isWrongOption
                                  ? "border-rose-600 peer-focus-visible:ring-rose-600"
                                  : "border-stone-400 group-hover:border-stone-600 peer-focus-visible:ring-stone-500"
                            }`}
                          >
                            {isChecked && (
                              <span
                                className={`w-2 h-2 rounded-full transition-colors duration-150 ${
                                  isCorrectOption ? "bg-emerald-600" : "bg-rose-600"
                                }`}
                              />
                            )}
                          </span>
                          <span
                            className={
                              isCorrectOption
                                ? "text-emerald-800 font-medium"
                                : isWrongOption
                                  ? "text-rose-800 font-medium"
                                  : "text-stone-700"
                            }
                          >
                            {opt.label[lang]}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {isWrongSelected && (
                    <div
                      role="alert"
                      data-testid={`wrong-popup-${q.id}`}
                      className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-800 shadow-xs transition-opacity duration-150"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        {lang === "en"
                          ? "Wrong answer — please choose another option."
                          : "ভুল উত্তর — অনুগ্রহ করে অন্য একটি বিকল্প নির্বাচন করুন।"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {resultMsg && (
            <div className="p-3 rounded-lg bg-stone-100 text-xs font-medium text-stone-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{resultMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={!eligibleForAssessment || submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 disabled:bg-stone-300 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>
                {submitting
                  ? lang === "en"
                    ? "Verifying..."
                    : "যাচাই হচ্ছে..."
                  : lang === "en"
                    ? "Submit & Verify Assessment"
                    : "মূল্যায়ন জমা দিন ও যাচাই করুন"}
              </span>
            </button>

            {certificate && (
              <button
                type="button"
                onClick={handleDownloadCertificate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t(UI_DICT.certification.downloadSvg, lang)}</span>
              </button>
            )}
          </div>

          {certificate && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    {certificate.learnerName}
                  </div>
                  <div className="text-xs text-emerald-800 font-mono-num">
                    {certificate.certificateId} · {certificate.scorePercent}% ·{" "}
                    {certificate.prototypeLabel}
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
};
