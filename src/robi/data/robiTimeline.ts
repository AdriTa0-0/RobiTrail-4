import type { LocalizedText } from "./translations/dictionary";

export interface TimelineReference {
  label: string;
  publisher: string;
  url: string;
}

export interface VerifiedArchivePhoto {
  url: string;
  sourcePage: string;
  year: string;
  title: LocalizedText;
  description: LocalizedText;
  attribution: string;
  license: string;
}

export interface TimelineMediaRecord {
  visualKind: "era-illustration";
  eraCode:
    | "1997-aktel"
    | "2008-axiata"
    | "2010-robi"
    | "2016-merger"
    | "2018-5g-trial"
    | "2020-ipo"
    | "2024-plc"
    | "2026-5g-era";
  title: LocalizedText;
  caption: LocalizedText;
  disclosureLabel: LocalizedText;
  attribution: string;
  licenseStatus: string;
  photos?: VerifiedArchivePhoto[];
}

export interface RobiTimelineMilestone {
  id: string;
  year: string;
  exactDate: LocalizedText;
  title: LocalizedText;
  shortDetail: LocalizedText;
  summary: LocalizedText;
  fullDescription: LocalizedText;
  keyFact: LocalizedText;
  verificationStatus: "Verified";
  media: TimelineMediaRecord;
  references: TimelineReference[];
  relatedVideoId?: string;
}

export const ROBI_TIMELINE: RobiTimelineMilestone[] = [
  {
    id: "ms-1997-aktel",
    year: "1997",
    exactDate: { en: "November 15, 1997", bn: "১৫ নভেম্বর, ১৯৯৭" },
    title: { en: "Launch as AKTEL", bn: "একটেল (AKTEL) হিসেবে যাত্রা শুরু" },
    shortDetail: {
      en: "Commercial GSM mobile launch by TM International (Bangladesh)",
      bn: "বাংলাদেশে একটেল ব্র্যান্ডে বাণিজ্যিক মোবাইল সেবা চালু",
    },
    summary: {
      en: "Commercial operations began under the AKTEL brand via Telekom Malaysia and A.K. Khan & Company.",
      bn: "টেলিকম মালয়েশিয়া ও একে খান অ্যান্ড কোম্পানির যৌথ উদ্যোগে একটেল নামে বাণিজ্যিক কার্যক্রম শুরু হয়।",
    },
    fullDescription: {
      en: "Robi Axiata traces its Bangladeshi operational roots to November 15, 1997, when TM International (Bangladesh) Limited launched commercial GSM mobile services under the AKTEL brand through a partnership between Telekom Malaysia and Chattogram-based A.K. Khan & Company—laying early voice infrastructure across Dhaka and Chattogram.",
      bn: '১৯৯৭ সালের ১৫ নভেম্বর টেলিকম মালয়েশিয়া এবং চট্টগ্রামভিত্তিক একে খান অ্যান্ড কোম্পানির যৌথ উদ্যোগে টিএম ইন্টারন্যাশনাল (বাংলাদেশ) লিমিটেড "একটেল" ব্র্যান্ডের অধীনে বাণিজ্যিক জিএসএম মোবাইল সেবা চালু করে। ঢাকা ও চট্টগ্রামের প্রাথমিক ভয়েস নেটওয়ার্ক দিয়ে এই অভিযাত্রা শুরু হয়।',
    },
    keyFact: {
      en: "Originated in Chattogram & Dhaka under a Malaysia–Bangladesh industrial joint venture.",
      bn: "চট্টগ্রাম ও ঢাকা কেন্দ্রিক মালয়েশিয়া–বাংলাদেশ যৌথ উদ্যোগে ভিত্তি স্থাপিত হয়।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "1997-aktel",
      title: { en: "1997 Pioneer GSM Relay Era", bn: "১৯৯৭ প্রাথমিক জিএসএম যুগ" },
      caption: {
        en: "Original educational diagram illustrating early 1997 GSM mast and 2G voice-era handset architecture.",
        bn: "১৯৯৭ সালের প্রাথমিক জিএসএম টাওয়ার ও ভয়েস যুগের হ্যান্ডসেটের শিক্ষামূলক নকশা।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution:
        "Verified historical context documented via Robi Axiata corporate history & Axiata Annual Report 2010.",
      licenseStatus:
        "Original vector artwork created for RobiTrail educational museum; historical photography not redistributed without publisher license.",
    },
    references: [
      {
        label: "Robi Official Corporate History",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
      {
        label: "Axiata Group Annual Report 2010",
        publisher: "Axiata Group Berhad",
        url: "https://axiata.listedcompany.com/misc/ar2010.pdf",
      },
    ],
  },
  {
    id: "ms-2008-axiata",
    year: "2008",
    exactDate: { en: "2008 Ownership Milestone", bn: "২০০৮ মালিকানা রূপান্তর" },
    title: {
      en: "NTT DoCoMo Stake & Axiata Group Era",
      bn: "এনটিটি ডোকোমো অংশীদারিত্ব ও আজিয়াটা যুগ",
    },
    shortDetail: {
      en: "Company renamed Axiata (Bangladesh) Limited following global restructuring",
      bn: "আজিয়াটা গ্রুপ গঠনের পর আজিয়াটা (বাংলাদেশ) লিমিটেড নামকরণ",
    },
    summary: {
      en: "Telekom Malaysia demerged its international arm into Axiata while NTT DoCoMo acquired A.K. Khan’s 30% stake.",
      bn: "টেলিকম মালয়েশিয়ার আন্তর্জাতিক শাখা আজিয়াটা গঠিত হয় এবং জাপানের এনটিটি ডোকোমো ৩০% শেয়ার অধিগ্রহণ করে।",
    },
    fullDescription: {
      en: "In 2008, Telekom Malaysia spun off its regional mobile investments as Axiata Group Berhad, while Japan’s NTT DoCoMo acquired A.K. Khan & Company’s 30% shareholding. The local operator formally became Axiata (Bangladesh) Limited ahead of its nationwide consumer identity transformation.",
      bn: "২০০৮ সালে টেলিকম মালয়েশিয়ার আন্তর্জাতিক মোবাইল ব্যবসা আজিয়াটা গ্রুপ নামে পৃথক হয় এবং জাপানি টেলিকম প্রতিষ্ঠান এনটিটি ডোকোমো একে খান গ্রুপের ৩০ শতাংশ শেয়ার গ্রহণ করে। এর ফলে প্রতিষ্ঠানটি আজিয়াটা (বাংলাদেশ) লিমিটেডে রূপান্তরিত হয়।",
    },
    keyFact: {
      en: "Anchored international R&D capital and multi-country Asia-Pacific network expertise.",
      bn: "আন্তর্জাতিক প্রযুক্তি ও আঞ্চলিক নেটওয়ার্ক অভিজ্ঞতার সংযোগ ঘটে।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2008-axiata",
      title: { en: "2008 Regional Telecom Alliance", bn: "২০০৮ আঞ্চলিক টেলিকম জোট" },
      caption: {
        en: "Conceptual diagram showing regional Asian fiber & GSM modernization partnership in 2008.",
        bn: "২০০৮ সালের আঞ্চলিক টেলিকম অংশীদারিত্ব ও অবকাঠামো উন্নয়নের শিক্ষামূলক চিত্র।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution:
        "Verified against Axiata Group Berhad 2010 Annual Report & The Daily Star (March 2010).",
      licenseStatus: "Original vector artwork created for RobiTrail educational museum.",
    },
    references: [
      {
        label: "Axiata Group Annual Report 2010",
        publisher: "Axiata Group Berhad",
        url: "https://axiata.listedcompany.com/misc/ar2010.pdf",
      },
      {
        label: "The Daily Star Archive (2010)",
        publisher: "The Daily Star",
        url: "https://www.thedailystar.net/news-detail-132017",
      },
    ],
  },
  {
    id: "ms-2010-robi",
    year: "2010",
    exactDate: { en: "March 28, 2010", bn: "২৮ মার্চ, ২০১০" },
    title: { en: "AKTEL Rebrands to Robi", bn: 'একটেল থেকে "রবি" নামে নতুন যাত্রা' },
    shortDetail: {
      en: 'Bengali-rooted "Robi" identity launched with rural & youth expansion focus',
      bn: 'দেশব্যাপী ও গ্রামীণ বাজারে বিস্তার ঘটাতে "রবি" ব্র্যান্ডের আত্মপ্রকাশ',
    },
    summary: {
      en: 'On March 28, 2010, AKTEL adopted the Bengali name "Robi" (meaning sun) to deepen cultural & rural reach.',
      bn: '২৮ মার্চ ২০১০ তারিখে সূর্য ও শক্তির প্রতীক হিসেবে বাংলা নাম "রবি" গ্রহণ করে দেশব্যাপী সেবা বিস্তৃত করা হয়।',
    },
    fullDescription: {
      en: 'On March 28, 2010, Axiata (Bangladesh) officially retired AKTEL and unveiled "Robi"—a name meaning sun in Bengali—paired with a red-and-amber identity designed to connect emotionally with rural, semi-urban, and youth communities across all 64 districts.',
      bn: '২০১০ সালের ২৮ মার্চ আজিয়াটা বাংলাদেশ আনুষ্ঠানিকভাবে "একটেল" নাম পরিবর্তন করে "রবি" ব্র্যান্ড উন্মোচন করে। সূর্য ও প্রাণের উচ্ছ্বাসের প্রতীক এই বাংলা নাম গ্রহণের মাধ্যমে দেশের শহর থেকে গ্রামাঞ্চলে নেটওয়ার্ক বিস্তারের বড় পদক্ষেপ নেওয়া হয়।',
    },
    keyFact: {
      en: "Pivoted mobile access beyond metros toward rural upazilas and everyday Bangla voice/SMS services.",
      bn: "শুধু বড় শহর নয়, গ্রামীণ জনপদেও মোবাইল সংযোগ ছড়িয়ে দেওয়ার কৌশলগত বাঁক নেয়।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2010-robi",
      title: { en: "2010 Sunrise Identity Transformation", bn: "২০১০ রবি ব্র্যান্ড রূপান্তর" },
      caption: {
        en: "Stylized geometric sunrise emblem representing the 2010 shift to a Bengali cultural identity.",
        bn: "২০১০ সালের সূর্য-অনুপ্রাণিত বাংলা ব্র্যান্ড পরিচয়ের শিক্ষামূলক প্রতীক।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Trademark Logos Not Redistributed)",
        bn: "মৌলিক শিক্ষামূলক প্রতীক (অফিসিয়াল ট্রেডমার্ক লোগো পুনর্মুদ্রিত নয়)",
      },
      attribution:
        "Historical facts sourced from The Daily Star (March 29, 2010) & Axiata Annual Report 2010.",
      licenseStatus:
        "Corporate trademark logos belong to Robi Axiata PLC; original educational geometric art shown.",
    },
    references: [
      {
        label: "Aktel Rebrands as Robi",
        publisher: "The Daily Star",
        url: "https://www.thedailystar.net/news-detail-132017",
      },
      {
        label: "Axiata Annual Report 2010",
        publisher: "Axiata Group Berhad",
        url: "https://axiata.listedcompany.com/misc/ar2010.pdf",
      },
    ],
  },
  {
    id: "ms-2016-merger",
    year: "2016",
    exactDate: { en: "November 16, 2016", bn: "১৬ নভেম্বর, ২০১৬" },
    title: {
      en: "Historic Robi–Airtel Merger & bdapps Ecosystem",
      bn: "ঐতিহাসিক রবি-এয়ারটেল একীভূতকরণ ও বিডিঅ্যাপস প্রসার",
    },
    shortDetail: {
      en: "Bangladesh’s first major telecom merger united Robi & Airtel networks",
      bn: "বাংলাদেশের প্রথম বড় টেলিকম একীভূতকরণে রবি ও এয়ারটেল নেটওয়ার্কের সমন্বয়",
    },
    summary: {
      en: "Robi Axiata Limited completed its merger with Airtel Bangladesh on Nov 16, 2016, scaling unified coverage.",
      bn: "১৬ নভেম্বর ২০১৬ রবি ও এয়ারটেল বাংলাদেশ একীভূত হয়ে দেশের অন্যতম বৃহৎ সমন্বিত নেটওয়ার্ক গড়ে তোলে।",
    },
    fullDescription: {
      en: "Following the launch of the bdapps national developer platform in 2014, Robi Axiata Limited and Airtel Bangladesh officially completed their landmark commercial merger on November 16, 2016—combining spectrum holdings and thousands of tower sites to form Bangladesh’s second-largest operator while continuing to support local app creators.",
      bn: "২০১৪ সালে bdapps ডেভেলপার প্ল্যাটফর্ম চালুর ধারাবাহিকতায়, ২০১৬ সালের ১৬ নভেম্বর রবি আজিয়াটা ও এয়ারটেল বাংলাদেশ ঐতিহাসিক একীভূতকরণ সম্পন্ন করে। এর ফলে স্পেকট্রাম ও হাজারো টাওয়ার যুক্ত হয়ে দেশব্যাপী নেটওয়ার্ক সক্ষমতা বহুগুণ বৃদ্ধি পায়।",
    },
    keyFact: {
      en: "Combined dual spectrum blocks and tower grids shortly before nationwide 4G licensing.",
      bn: "দেশব্যাপী ৪জি যুগের ঠিক আগে যৌথ স্পেকট্রাম ও টাওয়ার সক্ষমতা তৈরি করে।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2016-merger",
      title: { en: "2016 Unified Spectrum & Tower Grid", bn: "২০১৬ সমন্বিত নেটওয়ার্ক গ্রিড" },
      caption: {
        en: "Diagram illustrating merged dual-carrier radio corridors & developer gateway connections.",
        bn: "একীভূত নেটওয়ার্ক করিডোর ও ডেভেলপার এপিআই সংযোগের শিক্ষামূলক ডায়াগ্রাম।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution: "Verified via Robi Axiata corporate milestones & BTRC merger approval records.",
      licenseStatus:
        "Original educational diagram created for RobiTrail alongside CC BY-SA archival photography.",
      photos: [
        {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Robi_corporate_office.jpg?width=1200",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Robi_corporate_office.jpg",
          year: "2014–2016 Era",
          title: { en: "Robi Corporate Office (Gulshan)", bn: "রবি কর্পোরেট অফিস (গুলশান)" },
          description: {
            en: "Exterior architecture of Robi corporate headquarters in Gulshan, Dhaka during the unified expansion era.",
            bn: "গুলশান, ঢাকায় রবির কর্পোরেট সদর দপ্তরের ভবন।",
          },
          attribution: "Photo by Mahmuduz via Wikimedia Commons",
          license: "CC BY-SA 3.0",
        },
        {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Robi%27s_Corporate_Office.jpg?width=1200",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Robi%27s_Corporate_Office.jpg",
          year: "Post-2016 Unified Era",
          title: { en: "Robi Headquarters Facade", bn: "রবি সদর দপ্তরের সম্মুখভাগ" },
          description: {
            en: "Robi Axiata Limited corporate headquarters serving national subscriber operations after merger expansion.",
            bn: "দেশব্যাপী গ্রাহক সেবা পরিচালনাকারী রবি আজিয়াটার কর্পোরেট ভবন।",
          },
          attribution: "Photo by Contentguide via Wikimedia Commons",
          license: "CC BY-SA 4.0",
        },
      ],
    },
    references: [
      {
        label: "Robi Corporate Timeline",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
      { label: "bdapps Developer Portal", publisher: "bdapps", url: "https://dev.bdapps.com/" },
    ],
    relatedVideoId: "yt-bdapps-intro",
  },
  {
    id: "ms-2018-4g-5g",
    year: "2018",
    exactDate: { en: "February & July 25, 2018", bn: "ফেব্রুয়ারি ও ২৫ জুলাই, ২০১৮" },
    title: {
      en: "Nationwide 4G Rollout & First 5G Trial",
      bn: "দেশব্যাপী ৪জি এবং বাংলাদেশের প্রথম ৫জি পরীক্ষা",
    },
    shortDetail: {
      en: "High-speed 4G launch plus Bangladesh’s pioneering >1 Gbps 5G demo",
      bn: "দেশজুড়ে ৪জি চালুর পাশাপাশি দেশে প্রথম ১ জিবিপিএস-এর বেশি ৫জি প্রদর্শনী",
    },
    summary: {
      en: "In 2018, Robi rolled out commercial 4G across 64 districts and demonstrated Bangladesh’s first 5G trial.",
      bn: "২০১৮ সালে ৬৪ জেলায় ৪জি চালুর পাশাপাশি ২৫ জুলাই ঢাকায় দেশের প্রথম ৫জি ট্রায়াল প্রদর্শিত হয়।",
    },
    fullDescription: {
      en: "2018 transformed mobile internet in Bangladesh. Robi launched commercial 4G across every district headquarters in February 2018, and on July 25, 2018 partnered with BTRC, government telecom authorities, and Huawei in Dhaka to demonstrate Bangladesh’s very first 5G test exceeding 1 Gbps throughput.",
      bn: "২০১৮ সাল বাংলাদেশের মোবাইল ইন্টারনেটের মোড় ঘুরিয়ে দেয়। ফেব্রুয়ারিতে ৬৪ জেলায় বাণিজ্যিক ৪জি চালুর পর, ২৫ জুলাই ২০১৮ ঢাকায় বিটিআরসি ও প্রযুক্তিসহযোগীদের সাথে রবি দেশের প্রথম ৫জি ট্রায়াল সফলভাবে পরিচালনা করে।",
    },
    keyFact: {
      en: "Brought mobile broadband from urban centers into regional campuses, ferries, and district towns.",
      bn: "দ্রুতগতির মোবাইল ইন্টারনেটকে জেলা শহর ও আঞ্চলিক শিক্ষাপ্রতিষ্ঠানে পৌঁছে দেয়।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2018-5g-trial",
      title: { en: "2018 High-Speed 4G & 5G Trial Wave", bn: "২০১৮ ৪জি ও ৫জি ট্রায়াল তরঙ্গ" },
      caption: {
        en: "Educational visualization contrasting 4G LTE sector packets with >1 Gbps 5G test beams.",
        bn: "৪জি এলটিই এবং উচ্চ-সক্ষমতার ৫জি পরীক্ষামূলক তরঙ্গের তুলনামূলক চিত্র।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution: "Verified via Robi Axiata newsroom & The Daily Star (July 2018).",
      licenseStatus: "Original educational diagram created for RobiTrail.",
    },
    references: [
      {
        label: "Robi First 5G Trial in Bangladesh",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
    ],
  },
  {
    id: "ms-2020-ipo",
    year: "2020",
    exactDate: { en: "December 24, 2020", bn: "২৪ ডিসেম্বর, ২০২০" },
    title: {
      en: "Historic Capital Market Debut (DSE & CSE)",
      bn: "শেয়ারবাজারে ঐতিহাসিক অভিষেক (ডিএসই ও সিএসই)",
    },
    shortDetail: {
      en: "Largest IPO in Bangladesh history at the time (Tk 523 crore)",
      bn: "তৎকালীন দেশের বৃহত্তম আইপিও (৫২৩ কোটি টাকা) নিয়ে পুঁজিবাজারে তালিকাভুক্তি",
    },
    summary: {
      en: "Robi debuted on Dhaka and Chittagong Stock Exchanges on Dec 24, 2020 via a record Tk 523 crore IPO.",
      bn: "২০২০ সালের ২৪ ডিসেম্বর রেকর্ড ৫২৩ কোটি টাকার আইপিও নিয়ে ঢাকা ও চট্টগ্রাম স্টক এক্সচেঞ্জে লেনদেন শুরু হয়।",
    },
    fullDescription: {
      en: "On December 24, 2020, Robi made headlines in Bangladesh’s financial sector by completing the largest Initial Public Offering (IPO) in the country’s capital market history at that time—raising Tk 523 crore and enabling general citizens and institutions across Bangladesh to become public shareholders on DSE and CSE.",
      bn: "২০২০ সালের ২৪ ডিসেম্বর রবি আজিয়াটা তৎকালীন সময়ে বাংলাদেশের পুঁজিবাজারের ইতিহাসে বৃহত্তম আইপিওর (৫২৩ কোটি টাকা) মাধ্যমে ডিএসই এবং সিএসই-তে তালিকাভুক্ত হয়, যা সাধারণ নাগরিকদেরও কোম্পানির অংশীদার হওয়ার সুযোগ করে দেয়।",
    },
    keyFact: {
      en: "Widened public transparency and funded continued 4G tower and fiber modernization.",
      bn: "জনসাধারণের বিনিয়োগের মাধ্যমে ৪জি টাওয়ার ও ফাইবার আধুনিকায়ন ত্বরান্বিত করে।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2020-ipo",
      title: { en: "2020 DSE & CSE Public Listing", bn: "২০২০ শেয়ারবাজার তালিকাভুক্তি" },
      caption: {
        en: "Editorial graphic representing Bangladesh’s 2020 capital market telecom listing milestone.",
        bn: "২০২০ সালের পুঁজিবাজারে তালিকাভুক্তি মাইলফলকের শিক্ষামূলক ভিজ্যুয়াল।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution: "Verified via Dhaka Stock Exchange & Robi Annual Reports.",
      licenseStatus:
        "Original educational graphic created for RobiTrail alongside CC BY-SA exchange photography.",
      photos: [
        {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Dhaka_stock_exchange_building.jpg?width=1200",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Dhaka_stock_exchange_building.jpg",
          year: "2020 IPO Context",
          title: { en: "Dhaka Stock Exchange Building", bn: "ঢাকা স্টক এক্সচেঞ্জ ভবন" },
          description: {
            en: "Dhaka Stock Exchange (DSE) in Bangladesh, where Robi debuted in December 2020 with a Tk 523 crore IPO.",
            bn: "ঢাকা স্টক এক্সচেঞ্জ (ডিএসই), যেখানে ২০২০ সালের ডিসেম্বরে রবি তালিকাভুক্ত হয়।",
          },
          attribution: "Wikimedia Commons Contributor",
          license: "CC BY-SA 4.0",
        },
      ],
    },
    references: [
      {
        label: "Robi Investor Relations",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
    ],
  },
  {
    id: "ms-2024-plc",
    year: "2024",
    exactDate: { en: "2024 Corporate Milestone", bn: "২০২৪ কর্পোরেট মাইলফলক" },
    title: {
      en: "Robi Axiata PLC & Green 4G Modernization",
      bn: "রবি আজিয়াটা পিএলসি এবং আধুনিক ৪জি সম্প্রসারণ",
    },
    shortDetail: {
      en: "Transitioned to Robi Axiata PLC while scaling energy-efficient 4G sites",
      bn: "রবি আজিয়াটা পিএলসি নামকরণ ও পরিবেশবান্ধব ৪জি সাইট বিস্তার",
    },
    summary: {
      en: 'Adopting "Robi Axiata PLC", the operator expanded L2600 spectrum 4G capacity and energy-efficient sites.',
      bn: "রবি আজিয়াটা পিএলসি নামে পরিচিতি লাভের পাশাপাশি L2600 স্পেকট্রাম ও গ্রিন ৪জি সাইটের বিস্তার ঘটে।",
    },
    fullDescription: {
      en: "Aligned with updated Companies Act governance in 2024, the company formally adopted the name Robi Axiata PLC while expanding solar-assisted base stations, fiber-connected 4G capacity (including L2600 spectrum deployment), and digital service platforms supporting millions of smartphone learners.",
      bn: '২০২৪ সালে প্রতিষ্ঠানটি আনুষ্ঠানিকভাবে "রবি আজিয়াটা পিএলসি" নাম গ্রহণ করে। পাশাপাশি সৌর-সহায়ক বেস স্টেশন, ফাইবার-সংযুক্ত ৪জি সক্ষমতা এবং ডিজিটাল সেবা প্ল্যাটফর্ম আরও বিস্তৃত হয়।',
    },
    keyFact: {
      en: "Focused on data efficiency per watt and resilient power backup across regional districts.",
      bn: "সাশ্রয়ী শক্তি ব্যবহার ও অঞ্চলভেদে নিরবচ্ছিন্ন ব্যাকআপ পাওয়ারে গুরুত্ব দেওয়া হয়।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2024-plc",
      title: { en: "2024 Solar & Fiber-Fed 4G Base Station", bn: "২০২৪ সৌর ও ফাইবারযুক্ত ৪জি সাইট" },
      caption: {
        en: "Architectural schematic showing modern solar-assisted multi-band cellular tower infrastructure.",
        bn: "আধুনিক সৌর-সহায়ক মাল্টি-ব্যান্ড সেলুলার টাওয়ার অবকাঠামোর নকশা।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution: "Verified via Robi Axiata PLC Annual Reporting & TBS News.",
      licenseStatus:
        "Original educational diagram created for RobiTrail alongside CC/CC0 corporate office photographs.",
      photos: [
        {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Head_office_of_Robi,_Gulshan_3.jpg?width=1200",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Head_office_of_Robi,_Gulshan_3.jpg",
          year: "2024 PLC Era",
          title: { en: "Robi Axiata Head Office, Gulshan", bn: "রবি আজিয়াটা প্রধান কার্যালয়, গুলশান" },
          description: {
            en: "Robi Axiata PLC corporate head office complex in Gulshan, Dhaka.",
            bn: "ঢাকার গুলশানে অবস্থিত রবি আজিয়াটা পিএলসি প্রধান কার্যালয়।",
          },
          attribution: "Photo by Wasiul Bahar via Wikimedia Commons",
          license: "CC BY-SA 4.0",
        },
        {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Robi_Corporate_Office.jpg?width=1200",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Robi_Corporate_Office.jpg",
          year: "Modern Corporate Campus",
          title: { en: "Robi Corporate Tower View", bn: "রবি কর্পোরেট টাওয়ার" },
          description: {
            en: "Street-level view of the Gulshan telecom tower headquarters housing core network planning teams.",
            bn: "গুলশানে অবস্থিত রবির কর্পোরেট টাওয়ার।",
          },
          attribution: "Photo by Dhakatech via Wikimedia Commons",
          license: "CC0 1.0 Public Domain",
        },
      ],
    },
    references: [
      {
        label: "Robi Sustainability & Network",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
    ],
  },
  {
    id: "ms-2026-5g-era",
    year: "2026",
    exactDate: { en: "Sept 2025 – 2026 Era", bn: "সেপ্টেম্বর ২০২৫ – ২০২৬ যুগ" },
    title: {
      en: "Commercial 5G Era & Brand Evolution (Cirkle / Robi AI Space)",
      bn: "বাণিজ্যিক ৫জি যুগ ও নতুন ডিজিটাল রূপান্তর (সার্কল ও এআই স্পেস)",
    },
    shortDetail: {
      en: "First commercial 5G launch in Dhaka, Chattogram & Sylhet plus digital brand evolution",
      bn: "ঢাকা, চট্টগ্রাম ও সিলেটে দেশের প্রথম বাণিজ্যিক ৫জি চালু ও ডিজিটাল ব্র্যান্ড বিবর্তন",
    },
    summary: {
      en: "Following its Sept 1, 2025 commercial 5G pioneer launch in 3 cities, Robi enters 2026 with Cirkle & AI connectivity tools.",
      bn: "১ সেপ্টেম্বর ২০২৫ তিন শহরে দেশের প্রথম বাণিজ্যিক ৫জি চালুর ধারাবাহিকতায় ২০২৬ সালে সার্কল ও এআই-ভিত্তিক ডিজিটাল অভিজ্ঞতা যুক্ত হয়েছে।",
    },
    fullDescription: {
      en: "On September 1, 2025, Robi became Bangladesh’s pioneer to launch commercial 5G connectivity across select high-demand corridors in Dhaka, Chattogram, and Sylhet—complemented heading into 2026 by modernized digital customer experiences including Cirkle brand evolution and AI-assisted network diagnostics.",
      bn: '২০২৫ সালের ১ সেপ্টেম্বর রবি ঢাকা, চট্টগ্রাম ও সিলেটের নির্বাচিত এলাকায় বাংলাদেশে সর্বপ্রথম বাণিজ্যিক ৫জি সেবা চালু করে। ২০২৬ সালের দিকে এগিয়ে যাওয়ার পথে ডিজিটাল গ্রাহক অভিজ্ঞতায় "সার্কল" ও আধুনিক এআই নেটওয়ার্ক সেবা যুক্ত হয়েছে।',
    },
    keyFact: {
      en: "Connects Dhaka, Chattogram, and Sylhet—the exact 3-city corridor explored inside RobiTrail.",
      bn: "রবিট্রেইল গেমের তিনটি শহর—ঢাকা, চট্টগ্রাম ও সিলেটেই প্রথম বাণিজ্যিক ৫জি সংযোগ শুরু হয়।",
    },
    verificationStatus: "Verified",
    media: {
      visualKind: "era-illustration",
      eraCode: "2026-5g-era",
      title: { en: "2025–2026 Tri-City 5G Corridor", bn: "২০২৫–২০২৬ ত্রি-নগরী ৫জি করিডোর" },
      caption: {
        en: "Schematic network map highlighting commercial 5G zones linking Dhaka, Chattogram, and Sylhet.",
        bn: "ঢাকা, চট্টগ্রাম ও সিলেটের বাণিজ্যিক ৫জি সংযোগ করিডোরের শিক্ষামূলক চিত্র।",
      },
      disclosureLabel: {
        en: "Original Educational Illustration (Reconstructed Timeline Visual)",
        bn: "মৌলিক শিক্ষামূলক চিত্রণ (ইতিহাসভিত্তিক পুনর্নির্মিত ভিজ্যুয়াল)",
      },
      attribution: "Verified via Robi Official 5G Release & The Business Standard (tbsnews.net).",
      licenseStatus: "Original educational diagram created for RobiTrail.",
    },
    references: [
      {
        label: "Robi Commercial 5G Launch",
        publisher: "robi.com.bd",
        url: "https://www.robi.com.bd/",
      },
      {
        label: "The Business Standard Telecom Coverage",
        publisher: "The Business Standard",
        url: "https://www.tbsnews.net/economy/corporates/robi-first-operator-commercially-launch-5g-bangladesh-1225771",
      },
      {
        label: "Airtel-to-Cirkle Digital Brand Coverage",
        publisher: "The Business Standard",
        url: "https://www.tbsnews.net/",
      },
    ],
  },
];
