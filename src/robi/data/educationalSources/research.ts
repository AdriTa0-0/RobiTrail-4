import type { LocalizedText } from "../translations/dictionary";

export interface ResearchMetric {
  id: string;
  label: LocalizedText;
  value: string;
  context: LocalizedText;
  source: string;
  publishedDate: string;
}

export interface BtrcBreakdownItem {
  id: string;
  label: LocalizedText;
  valueMillions: number;
  maxScaleMillions: number;
  color: string;
  note: LocalizedText;
}

export interface BbsSurveyIndicator {
  id: string;
  label: LocalizedText;
  percent: number;
  scope: LocalizedText;
}

export const VERIFIED_RESEARCH_METRICS: ResearchMetric[] = [
  {
    id: "btrc-subscribers",
    label: { en: "Total Mobile Subscribers (Aug 2026)", bn: "মোট মোবাইল গ্রাহক (আগস্ট ২০২৬)" },
    value: "191.09M",
    context: {
      en: "Active 90-day mobile SIM subscriptions across all operators in Bangladesh reported by BTRC. Note: multi-SIM ownership means SIM count exceeds unique individuals.",
      bn: "বিটিআরসি-এর আগস্ট ২০২৬ প্রকাশিত পরিসংখ্যান অনুযায়ী দেশের সকল অপারেটরের সক্রিয় সিম। (দ্রষ্টব্য: একাধিক সিম ব্যবহারের কারণে সিম সংখ্যা ব্যক্তির সংখ্যার চেয়ে বেশি।)",
    },
    source: "Bangladesh Telecommunication Regulatory Commission (BTRC)",
    publishedDate: "August 2026",
  },
  {
    id: "btrc-internet",
    label: { en: "Total Internet Subscribers (Aug 2026)", bn: "মোট ইন্টারনেট গ্রাহক (আগস্ট ২০২৬)" },
    value: "137.66M",
    context: {
      en: "Includes 122.26M mobile internet and 15.40M fixed ISP/PSTN broadband subscribers (~77.89% national subscription ratio); 122.71M users on 4G networks.",
      bn: "এর মধ্যে ১২ কোটি ২২.৬ লাখ মোবাইল ইন্টারনেট ও ১ কোটি ৫৪ লাখ ব্রডব্যান্ড গ্রাহক (~৭৭.৮৯% বিস্তৃতি); ৪জি ব্যবহারকারী ১২ কোটি ২৭.১ লাখ।",
    },
    source: "BTRC Internet Subscriber Summary",
    publishedDate: "August 2026",
  },
  {
    id: "bbs-household",
    label: { en: "Household Mobile & Internet Access", bn: "পরিবারে মোবাইল ও ইন্টারনেট ব্যবহার" },
    value: "99.0% / 58.2%",
    context: {
      en: "BBS ICT Use & Access Survey reports 99.0% household mobile access, 89.6% individual mobile use, 65.6% personal phone ownership, and 59.2% individual internet use (age 5+).",
      bn: "বিবিএস আইসিটি জরিপ অনুযায়ী ৯৯.০% পরিবারে মোবাইল সুবিধা, ৮৯.৬% ব্যক্তিগত ব্যবহার, ৬৫.৬% নিজস্ব ফোন এবং ৫৯.২% (৫+ বছর) ইন্টারনেট ব্যবহারকারী রয়েছে।",
    },
    source: "Bangladesh Bureau of Statistics (BBS) ICT Survey",
    publishedDate: "BBS Official ICT Survey Release",
  },
  {
    id: "robi-history",
    label: { en: "Robi Commercial Heritage (1997–2026)", bn: "রবির যাত্রা (১৯৯৭–২০২৬)" },
    value: "1997 → 2026",
    context: {
      en: "Aktel GSM (1997) → Robi (28 Mar 2010) → Airtel Merger (16 Nov 2016) → DSE/CSE IPO (24 Dec 2020) → Robi Axiata PLC (2024) → 5G Commercial & Cirkle (2025–2026).",
      bn: "একটেল (১৯৯৭) → রবি (২০১০) → এয়ারটেল মার্জার (২০১৬) → শেয়ারবাজার (২০২০) → রবি আজিয়াটা পিএলসি (২০২৪) → বাণিজ্যিক ৫জি ও সার্কেল (২০২৫–২০২৬)।",
    },
    source: "Robi Axiata PLC Investor Relations & Newsroom",
    publishedDate: "Updated 2026",
  },
];

export const BTRC_BREAKDOWN_DATA: BtrcBreakdownItem[] = [
  {
    id: "mobile-sim",
    label: { en: "Active Mobile SIMs", bn: "সক্রিয় মোবাইল সিম" },
    valueMillions: 191.09,
    maxScaleMillions: 200,
    color: "#e11d48",
    note: {
      en: "Total active subscriptions across Bangladesh operators",
      bn: "সকল অপারেটর মিলিয়ে মোট সক্রিয় সিম",
    },
  },
  {
    id: "total-net",
    label: { en: "Total Internet Subscribers", bn: "মোট ইন্টারনেট গ্রাহক" },
    valueMillions: 137.66,
    maxScaleMillions: 200,
    color: "#0284c7",
    note: {
      en: "Combined mobile internet + fixed ISP/PSTN broadband",
      bn: "মোবাইল ইন্টারনেট + ব্রডব্যান্ড মিলিয়ে",
    },
  },
  {
    id: "4g-users",
    label: { en: "4G LTE Subscribers", bn: "৪জি এলটিই ব্যবহারকারী" },
    valueMillions: 122.71,
    maxScaleMillions: 200,
    color: "#059669",
    note: {
      en: "Majority of cellular internet growth driven by 4G access",
      bn: "উচ্চগতির ৪জি সংযোগের বিস্তৃতি",
    },
  },
  {
    id: "mobile-net",
    label: { en: "Mobile Internet Users", bn: "মোবাইল ইন্টারনেট গ্রাহক" },
    valueMillions: 122.26,
    maxScaleMillions: 200,
    color: "#f59e0b",
    note: {
      en: "88.8% of internet subscriptions run over cellular mobile networks",
      bn: "মোট ইন্টারনেট গ্রাহকের ৮৮.৮% মোবাইল নেটওয়ার্কে",
    },
  },
  {
    id: "isp-pstn",
    label: { en: "Fixed Broadband (ISP + PSTN)", bn: "স্থায়ী ব্রডব্যান্ড (ISP + PSTN)" },
    valueMillions: 15.4,
    maxScaleMillions: 200,
    color: "#6366f1",
    note: {
      en: "Home, campus, and office fiber lines complementing wireless 4G",
      bn: "বাসাবাড়ি, শিক্ষাপ্রতিষ্ঠান ও অফিসের ফাইবার সংযোগ",
    },
  },
];

export const BBS_SURVEY_INDICATORS: BbsSurveyIndicator[] = [
  {
    id: "hh-mobile",
    label: { en: "Households with Mobile Phone Access", bn: "মোবাইল ফোন সুবিধাযুক্ত পরিবার" },
    percent: 99.0,
    scope: { en: "Household level", bn: "পরিবার পর্যায়" },
  },
  {
    id: "ind-mobile",
    label: {
      en: "Individuals Using a Mobile Phone (Age 5+)",
      bn: "মোবাইল ব্যবহারকারী ব্যক্তি (৫+ বছর)",
    },
    percent: 89.6,
    scope: { en: "Population age 5+", bn: "৫+ বছর জনগোষ্ঠী" },
  },
  {
    id: "hh-smartphone",
    label: { en: "Households with Smartphone Access", bn: "স্মার্টফোন সুবিধাযুক্ত পরিবার" },
    percent: 75.1,
    scope: { en: "Household access benchmark", bn: "পরিবারভিত্তিক স্মার্টফোন" },
  },
  {
    id: "own-mobile",
    label: {
      en: "Personal Mobile Phone Ownership (Age 5+)",
      bn: "ব্যক্তিগত মোবাইল মালিকানা (৫+ বছর)",
    },
    percent: 65.6,
    scope: { en: "Individual ownership", bn: "নিজস্ব মালিকানা" },
  },
  {
    id: "ind-internet",
    label: {
      en: "Individuals Using the Internet (Age 5+)",
      bn: "ইন্টারনেট ব্যবহারকারী ব্যক্তি (৫+ বছর)",
    },
    percent: 59.2,
    scope: { en: "Unique individual rate", bn: "ব্যক্তিগত ব্যবহার হার" },
  },
  {
    id: "hh-internet",
    label: { en: "Households with Home Internet Access", bn: "ঘরে ইন্টারনেট সংযোগযুক্ত পরিবার" },
    percent: 58.2,
    scope: { en: "Household level", bn: "পরিবার পর্যায়" },
  },
];

export const RESEARCH_SOURCES = [
  {
    name: "Bangladesh Telecommunication Regulatory Commission (BTRC)",
    role: {
      en: "National mobile SIM (191.09M), 4G (122.71M), and internet (137.66M) statistics (Aug 2026)",
      bn: "জাতীয় মোবাইল সিম (১৯.১১ কোটি), ৪জি ও ইন্টারনেট পরিসংখ্যান (আগস্ট ২০২৬)",
    },
    url: "https://www.btrc.gov.bd",
  },
  {
    name: "Bangladesh Bureau of Statistics (BBS)",
    role: {
      en: "ICT Use and Access by Individuals and Households Survey",
      bn: "বিবিএস আইসিটি হাউজহোল্ড জরিপ (মোবাইল, স্মার্টফোন ও ইন্টারনেট)",
    },
    url: "https://bbs.gov.bd",
  },
  {
    name: "Robi Axiata PLC Investor Relations & Newsroom",
    role: {
      en: "Verified corporate milestones (1997 Aktel, 2010 Robi, 2016 Merger, 2020 IPO, 2025 5G)",
      bn: "রবির যাচাইকৃত ইতিহাস ও নেটওয়ার্ক মাইলফলক",
    },
    url: "https://www.robi.com.bd/en/investor-relations",
  },
  {
    name: "bdapps Official Developer Documentation",
    role: {
      en: "SMS, OTP, Subscription & USSD telco API training & consent flows",
      bn: "এসএমএস, ওটিপি ও সাবস্ক্রিপশন এপিআই প্রশিক্ষণ নথিপত্র",
    },
    url: "https://dev.bdapps.com/essential_training.php",
  },
  {
    name: "ITU & GSMA Mobile Connectivity Index",
    role: {
      en: "RF propagation fundamentals & South Asia digital inclusion benchmarks",
      bn: "বৈশ্বিক মোবাইল সংযোগ সূচক ও কারিগরি মানদণ্ড",
    },
    url: "https://www.itu.int",
  },
];
