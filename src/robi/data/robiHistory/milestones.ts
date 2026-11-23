import type { LocalizedText } from "../translations/dictionary";
export { ROBI_TIMELINE, type RobiTimelineMilestone } from "../robiTimeline";

// Backward-compatible adapter export so legacy imports keep working cleanly
import { ROBI_TIMELINE } from "../robiTimeline";

export interface RobiMilestone {
  id: string;
  year: string;
  exactDate: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  details: LocalizedText;
  verificationStatus: "Verified" | "Concept Prototype";
  sourceCitation: string;
  mediaNote: LocalizedText;
}

export const ROBI_MILESTONES: RobiMilestone[] = ROBI_TIMELINE.map((item) => ({
  id: item.id,
  year: item.year,
  exactDate: item.exactDate,
  title: item.title,
  summary: item.summary,
  details: item.fullDescription,
  verificationStatus: "Verified",
  sourceCitation: item.references.map((r) => `${r.publisher} (${r.url})`).join(" · "),
  mediaNote: item.media.caption,
}));

export interface MuseumExhibit {
  id: string;
  era: string;
  title: LocalizedText;
  summary: LocalizedText;
  visualType: "network-evolution" | "tower-evolution" | "speed-scale";
}

export const MUSEUM_EXHIBITS: MuseumExhibit[] = [
  {
    id: "ex-1",
    era: "1997 -> 2018 -> 2026",
    title: { en: "Voice-Only GSM to Nationwide 4G & 5G", bn: "ভয়েস-ভিত্তিক জিএসএম থেকে ৪জি ও ৫জি" },
    summary: {
      en: "Bangladesh shifted from scarce voice-only 900 MHz GSM calls in 1997 to 122.71M 4G users and pioneer 5G corridors.",
      bn: "১৯৯৭ সালের সীমিত ভয়েস কল থেকে বাংলাদেশ আজ ১২.২৭ কোটি ৪জি ব্যবহারকারী ও বাণিজ্যিক ৫জি যুগে প্রবেশ করেছে।",
    },
    visualType: "network-evolution",
  },
  {
    id: "ex-2",
    era: "BTS Evolution",
    title: {
      en: "From Diesel Towers to Solar-Assisted Fiber Nodes",
      bn: "ডিজেল টাওয়ার থেকে সৌর ও ফাইবার নোড",
    },
    summary: {
      en: "Modern sites deploy fiber optic backhaul, multi-band sector panels, and battery/solar rectifiers for resilience.",
      bn: "আধুনিক টাওয়ারে অপটিক্যাল ফাইবার, মাল্টি-ব্যান্ড অ্যান্টেনা এবং সৌর ও ব্যাটারি ব্যাকআপ ব্যবহৃত হয়।",
    },
    visualType: "tower-evolution",
  },
  {
    id: "ex-3",
    era: "Scale Benchmark",
    title: {
      en: "Kbps Texting to Gigabit Fiber & Mobile",
      bn: "কিলোবিট টেক্সট থেকে গিগাবিট ইন্টারনেট",
    },
    summary: {
      en: "Data capacity grew over 10,000x from 2G GPRS (kbps) to multi-band 4G LTE and 5G trial peaks.",
      bn: "২জি জিপিআরএস (kbps) থেকে আজকের ৪জি এলটিই ও ৫জিতে তথ্য পরিবহন ক্ষমতা ১০,০০০ গুণেরও বেশি বেড়েছে।",
    },
    visualType: "speed-scale",
  },
];
