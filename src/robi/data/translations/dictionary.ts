export type Lang = "en" | "bn";

export interface LocalizedText {
  en: string;
  bn: string;
}

export function t(text: LocalizedText, lang: Lang): string {
  return text[lang];
}

export const UI_DICT = {
  nav: {
    exploreCities: { en: "Cities", bn: "শহরসমূহ" },
    games: { en: "Games", bn: "গেমসমূহ" },
    robiJourney: { en: "Robi Journey", bn: "রবি যাত্রা" },
    videosTutorials: { en: "Videos & Tutorials", bn: "ভিডিও ও টিউটোরিয়াল" },
    handbook: { en: "Handbook", bn: "হ্যান্ডবুক" },
    research: { en: "Bangladesh Research", bn: "বাংলাদেশ গবেষণা" },
    certification: { en: "Certification", bn: "সনদপত্র" },
    tokenCenter: { en: "Token Center", bn: "টোকেন সেন্টার" },
    account: { en: "Account", bn: "অ্যাকাউন্ট" },
  },
  banner: {
    prefix: { en: "ROBITRAIL", bn: "রবিট্রেইল" },
    explore: { en: "EXPLORE BANGLADESH", bn: "বাংলাদেশ ঘুরে দেখুন" },
    discover: { en: "DISCOVER CONNECTIONS", bn: "সংযোগের গল্প জানুন" },
  },
  hero: {
    kicker: {
      en: "Interactive 360° Bangladesh Telecom World & Digital Museum",
      bn: "ইন্টারেক্টিভ ৩৬০° বাংলাদেশ টেলিকম বিশ্ব ও ডিজিটাল জাদুঘর",
    },
    headline: {
      en: "Discover how Bangladesh stays connected.",
      bn: "জেনে নিন বাংলাদেশ কীভাবে সংযুক্ত থাকে।",
    },
    subheadline: {
      en: "Drag 360° to explore each Bangladeshi city, jump right into playable city missions, or walk through Robi’s historical journey.",
      bn: "৩৬০° ঘুরিয়ে বাংলাদেশের প্রতিটি শহর ঘুরে দেখুন, শহরভিত্তিক মিশনে খেলুন অথবা রবির ইতিহাসের পথচলা জানুন।",
    },
    playCta: { en: "Play Games", bn: "গেম খেলুন" },
    enterExplore: { en: "Explore Cities", bn: "শহরসমূহ ঘুরে দেখুন" },
    resetView: { en: "Reset View", bn: "ভিউ রিসেট" },
    cameraDistance: { en: "Distance", bn: "দূরত্ব" },
    closer: { en: "Close", bn: "কাছে" },
    wider: { en: "Wide", bn: "দূরে" },
    dragHint: {
      en: "Drag 360° to look · Scroll page freely",
      bn: "৩৬০° ঘুরাতে টেনে আনুন · পেজ স্বাভাবিকভাবে স্ক্রল করুন",
    },
    settings: { en: "Audio", bn: "অডিও" },
    soundOn: { en: "Sound On", bn: "শব্দ চালু" },
    soundOff: { en: "Muted", bn: "শব্দ বন্ধ" },
  },
  cities: {
    sectionTitle: { en: "Explore Cities", bn: "শহর অন্বেষণ" },
    sectionSubtitle: {
      en: "Select a city on the map of Bangladesh to preview its geography, atmosphere, and launch playable missions.",
      bn: "বাংলাদেশের মানচিত্রে একটি শহর নির্বাচন করে তার পরিবেশ, ভৌগোলিক বৈশিষ্ট্য ও মিশনগুলো শুরু করুন।",
    },
    enterCity: { en: "Open City Games", bn: "শহরের গেমসমূহ দেখুন" },
    activeCity: { en: "Viewing City", bn: "বর্তমান শহর" },
    trailsCount: { en: "Playable Games", bn: "খেলার মিশন" },
    completed: { en: "Completed", bn: "সম্পন্ন" },
    futureHeading: { en: "Expandable City Architecture", bn: "সম্প্রসারণযোগ্য শহর কাঠামো" },
    futureDesc: {
      en: "Built on configuration-driven city modules ready for Rajshahi, Khulna, and Cox’s Bazar.",
      bn: "রাজশাহী, খুলনা ও কক্সবাজার যুক্ত করার জন্য উপযোগী কনফিগারেশন-ভিত্তিক আর্কিটেকচার।",
    },
  },
  mission: {
    objective: { en: "YOUR TASK", bn: "আপনার কাজ" },
    howToPlay: { en: "HOW TO PLAY", bn: "খেলার নিয়ম" },
    needTip: { en: "NEED A TIP?", bn: "সহায়তা প্রয়োজন?" },
    progress: { en: "PROGRESS", bn: "অগ্রগতি" },
    restart: { en: "Restart", bn: "পুনরায় শুরু" },
    pause: { en: "Pause", bn: "বিরতি" },
    resume: { en: "Resume Game", bn: "খেলা চালিয়ে যান" },
    exitToCity: { en: "City Games", bn: "শহরের গেমে ফিরুন" },
    exitToHome: { en: "Home", bn: "হোম" },
    openHandbook: { en: "Handbook", bn: "হ্যান্ডবুক" },
    learnMore: { en: "Learn More", bn: "আরও জানুন" },
    completedTitle: { en: "Mission Accomplished!", bn: "মিশন সম্পন্ন হয়েছে!" },
    continueNext: { en: "Next Mission", bn: "পরবর্তী মিশন" },
    leaveTitle: { en: "Leave Unfinished Mission?", bn: "অসমাপ্ত মিশন ছেড়ে যাবেন?" },
    leaveBody: {
      en: "Your current mission actions are still in progress. Returning now will discard this attempt.",
      bn: "এই মিশনটি এখনো চলমান রয়েছে। এখন ফিরে গেলে বর্তমান ধাপের অগ্রগতি মুছে যাবে।",
    },
    stayBtn: { en: "Keep Playing", bn: "খেলা চালিয়ে যান" },
    leaveBtn: { en: "Leave Mission", bn: "ছেড়ে যান" },
    premiumNoticeTitle: { en: "Token-Locked Experience", bn: "টোকেন-লকড অভিজ্ঞতা" },
    premiumNoticeDesc: {
      en: "This adventure can be unlocked permanently with 2 tokens. The Message Journey remains free for everyone.",
      bn: "এই মিশনটি ২টি টোকেন দিয়ে স্থায়ীভাবে আনলক করা যাবে। “The Message Journey” সবার জন্য ফ্রি।",
    },
    openTokenCenter: { en: "Open Token Center", bn: "টোকেন সেন্টার দেখুন" },
  },
  certification: {
    badge: { en: "Play. Learn. Unlock.", bn: "খেলুন। শিখুন। অর্জন করুন।" },
    title: { en: "Certification & Learning Mastery", bn: "সনদপত্র ও শিক্ষণ মূল্যায়ন" },
    subtitle: {
      en: "Track your trail completions separately from formal assessment eligibility. Earn a downloadable educational completion certificate by passing the practical telecom quiz.",
      bn: "সাধারণ ট্রেইল সম্পন্নের পাশাপাশি মূল্যায়ন পরীক্ষায় অংশ নিয়ে শিক্ষামূলক সমাপ্তি সনদপত্র অর্জন করুন।",
    },
    prototypeNotice: {
      en: "Educational app created for BDapps Tech Quest — issued for learning demonstration, not an official credential from Robi Axiata PLC or bdapps.",
      bn: "BDapps Tech Quest-এর জন্য নির্মিত শিক্ষামূলক অ্যাপ — শিক্ষণ মূল্যায়নের জন্য প্রদত্ত, এটি রবি বা বিডিঅ্যাপস-এর অফিসিয়াল বাণিজ্যিক সনদ নয়।",
    },
    downloadSvg: { en: "Download Certificate (SVG)", bn: "সনদপত্র ডাউনলোড (SVG)" },
  },
} as const;
