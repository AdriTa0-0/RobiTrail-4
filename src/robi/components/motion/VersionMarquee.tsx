import React from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";

const BANGLA_TICKER_LINES = [
  "বাংলাদেশ ঘুরে দেখুন রবির চোখে",
  "শহর, সংযোগ, খেলা — ইন্টারঅ্যাকটিভ শেখার নতুন অভিজ্ঞতা",
  "চট্টগ্রাম, ঢাকা, সিলেট — প্রতিটি শহরে নতুন ডিজিটাল অভিযান",
  "খেলতে খেলতে জানুন নেটওয়ার্ক, ডাটা, সংযোগ আর উদ্ভাবনের গল্প",
];

const ENGLISH_TICKER_LINES = [
  "Explore Bangladesh through Robi’s lens",
  "Cities, connections, and play — a new interactive learning journey",
  "Chattogram, Dhaka, Sylhet — a new digital mission in every city",
  "Discover networks, data, signal science, and innovation through play",
];

export const VersionMarquee: React.FC = () => {
  const { lang } = useRobiTrail();
  const lines = lang === "bn" ? BANGLA_TICKER_LINES : ENGLISH_TICKER_LINES;

  return (
    <div
      className="w-full overflow-hidden bg-slate-950 text-slate-200 border-b border-slate-800/80 py-1.5 text-xs tracking-wide select-none"
      aria-label="RobiTrail highlights"
    >
      <div className="animate-marquee flex items-center">
        {[0, 1].map((pass) => (
          <div key={pass} className="flex items-center shrink-0">
            {lines.map((line, idx) => (
              <span
                key={`${pass}-${idx}`}
                className="whitespace-nowrap px-7 text-slate-100 font-medium"
              >
                {line}
                <span className="ml-7 text-rose-400 font-bold" aria-hidden="true">
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
