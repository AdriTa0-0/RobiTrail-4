import React, { useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import {
  BBS_SURVEY_INDICATORS,
  BTRC_BREAKDOWN_DATA,
  RESEARCH_SOURCES,
  VERIFIED_RESEARCH_METRICS,
} from "../../data/educationalSources/research";
import { CITIES } from "../../data/cities/cities";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  ExternalLink,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export const BangladeshResearchPage: React.FC = () => {
  const { lang } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [selectedCorridor, setSelectedCorridor] = useState<"dhaka" | "chattogram" | "sylhet">(
    "dhaka",
  );

  const corridorCity = CITIES.find((c) => c.id === selectedCorridor) || CITIES[0];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      {/* Header */}
      <div className="space-y-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/handbook")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Back to Explore the Technology" : "প্রযুক্তি পাতায় ফিরুন"}</span>
          </button>

          <span className="text-[11px] font-mono text-rose-600 font-semibold uppercase tracking-wider">
            {lang === "en" ? "PUBLIC DATA & TELECOM RESEARCH BRIEF" : "সরকারি তথ্য ও টেলিকম গবেষণা"}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 font-display">
          {lang === "en"
            ? "Bangladesh Digital Connectivity Research"
            : "বাংলাদেশের ডিজিটাল সংযোগ ও গবেষণা"}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          {lang === "en"
            ? "Verified national telecommunications indicators published by the Bangladesh Telecommunication Regulatory Commission (BTRC) and the Bangladesh Bureau of Statistics (BBS), paired with the geographic realities of Chattogram, Dhaka, and Sylhet."
            : "বাংলাদেশ টেলিযোগাযোগ নিয়ন্ত্রণ কমিশন (BTRC) এবং বাংলাদেশ পরিসংখ্যান ব্যুরো (BBS) কর্তৃক প্রকাশিত যাচাইকৃত জাতীয় তথ্য ও আঞ্চলিক নেটওয়ার্ক চিত্র।"}
        </p>
      </div>

      {/* Headline Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {VERIFIED_RESEARCH_METRICS.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-semibold text-slate-500">{m.label[lang]}</div>
              <div className="text-2xl sm:text-3xl font-mono-num font-extrabold text-rose-600 mt-1.5">
                {m.value}
              </div>
              <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">{m.context[lang]}</p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              {m.source} · {m.publishedDate}
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side Verified Charts: BTRC August 2026 & BBS ICT Survey */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: BTRC August 2026 Bar Chart */}
        <div className="lg:col-span-6 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 font-semibold">
                <BarChart3 className="w-4 h-4" />
                <span>BTRC · AUGUST 2026 RELEASE</span>
              </div>
              <h2 className="text-xl font-bold text-slate-950 mt-1">
                {lang === "en"
                  ? "National Subscriptions Breakdown (Millions)"
                  : "জাতীয় গ্রাহক সংখ্যা বিভাজন (মিলিয়নে)"}
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {BTRC_BREAKDOWN_DATA.map((item) => {
              const pct = Math.min(100, (item.valueMillions / item.maxScaleMillions) * 100);
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{item.label[lang]}</span>
                    <span className="font-mono-num text-slate-950">
                      {item.valueMillions.toFixed(2)}M
                    </span>
                  </div>
                  <div className="h-3 rounded-lg bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">{item.note[lang]}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-950">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              {lang === "en"
                ? "Methodology note: BTRC counts active SIMs/subscriptions across operators. Because many citizens own two SIMs, 191.09M SIMs represents subscriptions rather than unique citizens."
                : "গবেষণা নোট: বিটিআরসি সক্রিয় সিমভিত্তিক হিসাব প্রকাশ করে। অনেকেই একাধিক সিম ব্যবহার করায় মোট সিম সংখ্যা মোট নাগরিক সংখ্যার চেয়ে বেশি।"}
            </span>
          </div>
        </div>

        {/* Right: BBS Individual & Household Access Comparison */}
        <div className="lg:col-span-6 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-sky-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>BBS ICT USE & ACCESS SURVEY</span>
            </div>
            <h2 className="text-xl font-bold text-slate-950 mt-1">
              {lang === "en"
                ? "Household vs Individual Digital Access (%)"
                : "পরিবার ও ব্যক্তিগত ডিজিটাল ব্যবহারের হার (%)"}
            </h2>
          </div>

          <div className="space-y-4">
            {BBS_SURVEY_INDICATORS.map((ind) => (
              <div key={ind.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="text-slate-800">{ind.label[lang]}</span>
                  <span className="font-mono-num text-sky-700">{ind.percent.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-lg bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-lg bg-sky-600 transition-all duration-500"
                    style={{ width: `${ind.percent}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-500">{ind.scope[lang]}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 leading-relaxed">
            {lang === "en"
              ? "Notice the learning gap: while 99.0% of households have mobile access, household internet stands at 58.2%—showing why offline-ready education and data literacy are vital across Bangladesh."
              : "উল্লেখযোগ্য তথ্য: ৯৯.০% পরিবারে মোবাইল ফোন থাকলেও ৫৮.২% পরিবারে ঘরোয়া ইন্টারনেট রয়েছে—তাই ডেটা সাশ্রয় ও ডিজিটাল সাক্ষরতা শেখা অত্যন্ত গুরুত্বপূর্ণ।"}
          </div>
        </div>
      </div>

      {/* Regional Geography & Engineering Map (Dhaka, Chattogram, Sylhet) */}
      <div className="rounded-2xl bg-slate-950 text-white border border-slate-800 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5">
          <div className="text-xs font-mono text-amber-300 uppercase tracking-wider mb-3">
            {lang === "en" ? "INTERACTIVE REGIONAL TOPOLOGY" : "আঞ্চলিক ভৌগোলিক মানচিত্র"}
          </div>
          <svg viewBox="0 0 240 260" className="w-full max-w-[260px] mx-auto h-64">
            <path
              d="M78 22 L126 24 L166 58 L208 66 L200 100 L174 114 L188 158 L216 222 L188 242 L164 196 L142 170 L114 202 L82 198 L56 164 L44 114 L62 68 Z"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="2.5"
            />
            <line
              x1="114"
              y1="118"
              x2="168"
              y2="80"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <line
              x1="114"
              y1="118"
              x2="174"
              y2="188"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            {[
              { id: "dhaka" as const, cx: 114, cy: 118, label: { en: "Dhaka", bn: "ঢাকা" } },
              { id: "sylhet" as const, cx: 168, cy: 80, label: { en: "Sylhet", bn: "সিলেট" } },
              {
                id: "chattogram" as const,
                cx: 174,
                cy: 188,
                label: { en: "Chattogram", bn: "চট্টগ্রাম" },
              },
            ].map((node) => {
              const active = selectedCorridor === node.id;
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCorridor(node.id)}
                >
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={active ? 13 : 9}
                    fill={active ? "#e11d48" : "#0ea5e9"}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <text
                    x={node.cx}
                    y={node.cy + 24}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {node.label[lang]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCorridor(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  selectedCorridor === c.id
                    ? "bg-rose-600 border-rose-500 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {c.name[lang]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-300">
              <MapPin className="w-3.5 h-3.5" />
              <span>{corridorCity.regionLabel[lang]}</span>
            </div>
            <h3 className="text-2xl font-bold text-white">{corridorCity.name[lang]}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {corridorCity.description[lang]}
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs text-slate-200 leading-relaxed">
            {selectedCorridor === "dhaka"
              ? lang === "en"
                ? "Dhaka’s extreme building height and evening peak demand make multi-band carrier aggregation, metro-corridor small cells, and heavy fiber hubs essential to prevent sector congestion."
                : "ঢাকার বহুতল ভবন ও সন্ধ্যার অতিরিক্ত ট্রাফিক সামলাতে মাল্টি-ব্যান্ড সেল, মেট্রো-করিডোর অ্যান্টেনা এবং শক্তিশালী ফাইবার ব্যাকহল অপরিহার্য।"
              : selectedCorridor === "chattogram"
                ? lang === "en"
                  ? "Chattogram combines international submarine landing infrastructure, busy Bay of Bengal shipping terminals, and hill slopes—requiring elevated tower placement and clean line-of-sight RF geometry."
                  : "চট্টগ্রামে আন্তর্জাতিক সাবমেরিন ক্যাবল ল্যান্ডিং স্টেশন, বন্দর এলাকা এবং পাহাড়ি টিলার কারণে উঁচু স্থানে টাওয়ার স্থাপন অত্যন্ত কার্যকর।"
                : lang === "en"
                  ? "Sylhet’s monsoon rains, river-floodplain haors, and rolling tea valleys demonstrate how rain fade affects higher frequencies and why microwave relays and optical fiber resilience keep communities online."
                  : "সিলেটের নদী-হাওর, ভারী বর্ষা ও চা-বাগানের টিলার মাঝে মাইক্রোওয়েভ রিলে এবং অপটিক্যাল ফাইবার রক্ষণাবেক্ষণ সংযোগ সচল রাখে।"}
          </div>

          <div className="pt-1 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/cities/${corridorCity.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <span>
                {lang === "en"
                  ? `Explore ${corridorCity.name.en} Missions`
                  : `${corridorCity.name.bn} মিশন দেখুন`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/handbook")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Open Technology Labs" : "প্রযুক্তি ল্যাব দেখুন"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Source Directory */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-950">
          {lang === "en" ? "Verified Primary Sources & Archives" : "যাচাইকৃত তথ্যসূত্র ও আর্কাইভ"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESEARCH_SOURCES.map((src) => (
            <a
              key={src.name}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-400 flex items-start justify-between gap-3 transition-colors shadow-sm"
            >
              <div>
                <div className="text-sm font-bold text-slate-900">{src.name}</div>
                <div className="text-xs text-slate-600 mt-1 leading-relaxed">{src.role[lang]}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
