import type { LocalizedText } from "../translations/dictionary";

export type VideoCategory =
  "All" | "Animated Lessons" | "Mobile Networks" | "Mobile Data" | "bdapps" | "Robi";

export type ExplainerDiagramMode =
  | "network-arch"
  | "packet-hops"
  | "data-bucket"
  | "signal-barrier"
  | "tower-anatomy"
  | "speed-vs-data"
  | "device-duplex"
  | "bd-services";

export interface AnimatedExplainerFrame {
  timeSec: number;
  endSec: number;
  headline: LocalizedText;
  caption: LocalizedText;
  voiceLine: LocalizedText;
  diagramMode: ExplainerDiagramMode;
  stageStep: 0 | 1 | 2 | 3;
  cameraFocus: "overview" | "left" | "center" | "right";
}

export interface VideoLibraryItem {
  id: string;
  type: "youtube" | "animated-explainer" | "official-reference";
  category: Exclude<VideoCategory, "All" | "Animated Lessons">;
  youtubeId?: string;
  title: LocalizedText;
  summary: LocalizedText;
  durationLabel: string;
  durationSec?: number;
  sourceName: string;
  externalUrl?: string;
  frames?: AnimatedExplainerFrame[];
}

export const VIDEO_CATEGORIES: { id: VideoCategory; label: LocalizedText }[] = [
  { id: "All", label: { en: "All", bn: "সব" } },
  { id: "Animated Lessons", label: { en: "Animated Lessons (7)", bn: "অ্যানিমেটেড পাঠ (৭)" } },
  { id: "bdapps", label: { en: "bdapps", bn: "বিডিঅ্যাপস" } },
  { id: "Robi", label: { en: "Robi & Bangladesh", bn: "রবি ও বাংলাদেশ" } },
];

export const VIDEO_LIBRARY: VideoLibraryItem[] = [
  // 1. How a mobile network works
  {
    id: "anim-network",
    type: "animated-explainer",
    category: "Mobile Networks",
    title: {
      en: "1. How a Mobile Network Works",
      bn: "১. মোবাইল নেটওয়ার্ক কীভাবে কাজ করে",
    },
    summary: {
      en: "Visual documentary walkthrough of cellular cells, base station antennas, optical fiber backhaul, and core switching.",
      bn: "সেলুলার কভারেজ জোন, বেস স্টেশন অ্যান্টেনা, ফাইবার ব্যাকহল এবং কোর সুইচিংয়ের সম্পূর্ণ অ্যানিমেটেড ব্যাখ্যা।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Explainer (GSMA & ITU Architecture Reference)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "network-arch",
        stageStep: 0,
        cameraFocus: "overview",
        headline: { en: "1. A Grid of Radio Cells", bn: "১. রেডিও সেলের সমন্বিত জাল" },
        caption: {
          en: "Cities and districts are divided into overlapping hexagonal cells, each served by a local tower.",
          bn: "শহর ও গ্রামাঞ্চলকে অসংখ্য ছোট রেডিও সেলে ভাগ করা হয় এবং প্রতিটি সেলে একটি টাওয়ার থাকে।",
        },
        voiceLine: {
          en: "A mobile network divides Bangladesh into overlapping radio cells, each powered by a local cellular tower.",
          bn: "একটি মোবাইল নেটওয়ার্ক দেশকে অসংখ্য রেডিও সেলে ভাগ করে, যেখানে প্রতিটি সেলের কেন্দ্রবিন্দুতে থাকে একটি টাওয়ার।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "network-arch",
        stageStep: 1,
        cameraFocus: "left",
        headline: { en: "2. Handshake on Radio Waves", bn: "২. রেডিও তরঙ্গে ফোনের সংযোগ" },
        caption: {
          en: "When powered on, your SIM registers securely with the nearest sector antenna over licensed spectrum.",
          bn: "ফোন চালু থাকলে আপনার সিম নিকটস্থ টাওয়ারের সেক্টর অ্যান্টেনার সাথে সুরক্ষিতভাবে যুক্ত থাকে।",
        },
        voiceLine: {
          en: "Your smartphone checks in wirelessly with the closest tower sector using licensed radio frequencies.",
          bn: "আপনার স্মার্টফোন লাইসেন্সপ্রাপ্ত বেতার তরঙ্গের মাধ্যমে সবচেয়ে কাছের টাওয়ারের সাথে যুক্ত হয়।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "network-arch",
        stageStep: 2,
        cameraFocus: "center",
        headline: { en: "3. Fiber Optic Backhaul & Core", bn: "৩. অপটিক্যাল ফাইবার ও কোর হাব" },
        caption: {
          en: "Once at the tower, signals convert into light pulses inside underground fiber heading to the core switch.",
          bn: "টাওয়ার থেকে তথ্য মাটির নিচের অপটিক্যাল ফাইবারে আলোর সংকেত হয়ে কোর সুইচে পৌঁছে যায়।",
        },
        voiceLine: {
          en: "From the tower, your call or data switches from airwaves into high-speed underground optical fiber.",
          bn: "টাওয়ার থেকে সেই সংকেত মাটির নিচের দ্রুতগতির অপটিক্যাল ফাইবারে প্রবেশ করে কোর সুইচে যায়।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "network-arch",
        stageStep: 3,
        cameraFocus: "right",
        headline: {
          en: "4. Seamless Handoff While Moving",
          bn: "৪. চলন্ত অবস্থায় নিরবচ্ছিন্ন হ্যান্ডঅফ",
        },
        caption: {
          en: "As a bus or CNG crosses from one cell to the next, the core hands your connection smoothly to the next tower.",
          bn: "গাড়ি বা বাস এক সেল থেকে অন্য সেলে গেলে নেটওয়ার্ক সংযোগ না কেটেই পরবর্তী টাওয়ারে স্থানান্তরিত হয়।",
        },
        voiceLine: {
          en: "While riding through traffic, the network automatically hands your session to the next tower without dropping the call.",
          bn: "গাড়িতে চলাচলের সময় নেটওয়ার্ক স্বয়ংক্রিয়ভাবে পরবর্তী টাওয়ারে সংযোগ হস্তান্তর করে, ফলে কল কেটে যায় না।",
        },
      },
    ],
  },

  // 2. How a message travels
  {
    id: "anim-1",
    type: "animated-explainer",
    category: "Mobile Networks",
    title: {
      en: "2. How a Message Travels Across Cities",
      bn: "২. এক শহর থেকে অন্য শহরে মেসেজ কীভাবে পৌঁছায়",
    },
    summary: {
      en: "Trace every hop a chat message or SMS makes from Chattogram to Dhaka in milliseconds.",
      bn: "চট্টগ্রাম থেকে ঢাকায় একটি বার্তা কীভাবে মিলিসেকেন্ডের মধ্যে কয়েকটি ধাপ পেরিয়ে পৌঁছায় তা দেখুন।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Original Animation (3GPP Signaling Overview)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "packet-hops",
        stageStep: 0,
        cameraFocus: "left",
        headline: { en: "1. Text Turns Into Digital Packets", bn: "১. লেখা থেকে ডিজিটাল প্যাকেট" },
        caption: {
          en: "Your message is broken into addressed binary packets and transmitted wirelessly to your street tower.",
          bn: "আপনার বার্তাটি ঠিকানাযুক্ত ডিজিটাল প্যাকেটে বিভক্ত হয়ে নিকটস্থ টাওয়ারে পৌঁছায়।",
        },
        voiceLine: {
          en: "Step one: your message becomes addressed digital packets sent wirelessly to your local street tower.",
          bn: "প্রথম ধাপ: আপনার লেখাটি ঠিকানাযুক্ত ডিজিটাল প্যাকেটে রূপান্তরিত হয়ে স্থানীয় টাওয়ারে যায়।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "packet-hops",
        stageStep: 1,
        cameraFocus: "center",
        headline: { en: "2. Inter-City Fiber Trunk", bn: "২. আন্তঃজেলা ফাইবার ব্যাকবোন" },
        caption: {
          en: "Optical lasers shoot the packets along national fiber highways linking Chattogram to Dhaka’s core.",
          bn: "অপটিক্যাল লেজার পালসের মাধ্যমে বার্তাটি জাতীয় ফাইবার হাইওয়ে ধরে কোর সুইচে আসে।",
        },
        voiceLine: {
          en: "Step two: optical lasers carry those packets along high-speed fiber trunks toward the core network.",
          bn: "দ্বিতীয় ধাপ: অপটিক্যাল লেজার আলো প্যাকেটগুলোকে ফাইবার হাইওয়ে দিয়ে কোর নেটওয়ার্কে নিয়ে আসে।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "packet-hops",
        stageStep: 2,
        cameraFocus: "center",
        headline: { en: "3. Core Lookup & Verification", bn: "৩. কোর রাউটিং ও গন্তব্য খোঁজা" },
        caption: {
          en: "The switching core checks which destination tower currently serves the recipient’s active phone.",
          bn: "কোর সুইচ খুঁজে বের করে প্রাপকের ফোন এই মুহূর্তে কোন টাওয়ারের অধীনে আছে।",
        },
        voiceLine: {
          en: "Step three: the switching core looks up which cell tower is currently serving your friend.",
          bn: "তৃতীয় ধাপ: কোর সুইচিং সেন্টার শনাক্ত করে আপনার প্রাপক বন্ধু বর্তমানে কোন টাওয়ারের আওতায় আছেন।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "packet-hops",
        stageStep: 3,
        cameraFocus: "right",
        headline: { en: "4. Final Wireless Hop & Receipt", bn: "৪. শেষ বেতার ধাপ ও প্রাপ্তি" },
        caption: {
          en: "The destination tower broadcasts the packet on radio waves, reassembling the chat on screen.",
          bn: "গন্তব্য টাওয়ার বেতার তরঙ্গে বার্তাটি পৌঁছে দিলে অপর প্রান্তের ফোনে নোটিফিকেশন বাজে।",
        },
        voiceLine: {
          en: "Step four: the destination tower transmits the final wireless hop so your friend reads the message almost instantly.",
          bn: "চতুর্থ ধাপ: গন্তব্য টাওয়ার বেতার সংকেতে বার্তা পাঠিয়ে দেয় এবং মুহূর্তেই বন্ধুর ফোনে মেসেজ ভেসে ওঠে।",
        },
      },
    ],
  },

  // 3. What mobile data means
  {
    id: "anim-2",
    type: "animated-explainer",
    category: "Mobile Data",
    title: {
      en: "3. What Mobile Data Means (KB, MB & GB)",
      bn: "৩. মোবাইল ডেটা কী ও কীভাবে খরচ হয়",
    },
    summary: {
      en: "Understand why text messages sip kilobytes while HD video streams drain gigabytes.",
      bn: "টেক্সট বার্তায় কেন সামান্য কিলোবাইট লাগে আর এইচডি ভিডিওতে কেন দ্রুত গিগাবাইট ফুরিয়ে যায় তা জানুন।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Original Animation (ITU Data Literacy)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "data-bucket",
        stageStep: 0,
        cameraFocus: "overview",
        headline: {
          en: "1. Measuring Digital Information",
          bn: "১. তথ্যের পরিমাপ: বাইট থেকে গিগাবাইট",
        },
        caption: {
          en: "Every photo, lecture PDF, and web clip has a measurable weight counted in Kilobytes, Megabytes, and Gigabytes.",
          bn: "প্রতিটি ছবি, পিডিএফ ও ভিডিও ফাইলের নির্দিষ্ট পরিমাণ রয়েছে, যা কিলোবাইট, মেগাবাইট বা গিগাবাইটে মাপা হয়।",
        },
        voiceLine: {
          en: "Mobile data measures the total volume of digital information transferred between your device and the internet.",
          bn: "মোবাইল ডেটা হলো আপনার ফোন ও ইন্টারনেট সার্ভারের মধ্যে আদান-প্রদান হওয়া তথ্যের মোট পরিমাণ।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "data-bucket",
        stageStep: 1,
        cameraFocus: "left",
        headline: { en: "2. Text & Documents Are Light", bn: "২. টেক্সট ও নথি খুব হালকা" },
        caption: {
          en: "Thousands of chat lines use under 1 MB, and an offline study PDF uses just a few megabytes once.",
          bn: "হাজারো টেক্সট চ্যাটে ১ মেগাবাইটের কম লাগে, আর একটি পিডিএফ একবার নামালেই অফলাইনে পড়া যায়।",
        },
        voiceLine: {
          en: "Chatting by text uses tiny kilobytes, and downloading a study PDF once lets you read it repeatedly offline.",
          bn: "চ্যাট বা টেক্সট বার্তায় অতি সামান্য ডেটা খরচ হয় এবং পিডিএফ একবার সেভ করলে অফলাইনেই পড়া যায়।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "data-bucket",
        stageStep: 2,
        cameraFocus: "center",
        headline: { en: "3. Video Resolution Drives Usage", bn: "৩. ভিডিও রেজোলিউশনই বড় প্রভাবক" },
        caption: {
          en: "Full HD (1080p) sends over 4x more pixels every second than 360p—draining data packs rapidly.",
          bn: "১০৮০পি ভিডিও প্রতি সেকেন্ডে ৩৬০পি-র তুলনায় চার গুণের বেশি পিক্সেল পাঠিয়ে দ্রুত প্যাক শেষ করে।",
        },
        voiceLine: {
          en: "Watching video at 1080p Full HD sends several times more data per minute than 360p on a small screen.",
          bn: "ফোনের ছোট পর্দায় ১০৮০পি-তে ভিডিও দেখলে ৩৬০পি-র তুলনায় কয়েক গুণ বেশি ডেটা খরচ হয়।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "data-bucket",
        stageStep: 3,
        cameraFocus: "right",
        headline: { en: "4. Quiet Background Syncing", bn: "৪. অদৃশ্য ব্যাকগ্রাউন্ড সিঙ্ক" },
        caption: {
          en: "Moving cloud photo backups and app updates to Wi-Fi stops unexpected mobile MB drain.",
          bn: "অ্যাপ আপডেট ও ক্লাউড ফটো ব্যাকআপ ওয়াই-ফাইয়ে সীমাবদ্ধ রাখলে অযথা এমবি নষ্ট হয় না।",
        },
        voiceLine: {
          en: "Offloading automatic app updates and cloud backups to Wi-Fi protects your weekly mobile data budget.",
          bn: "অটো-আপডেট ও ক্লাউড ব্যাকআপ ওয়াই-ফাইয়ের জন্য সংরক্ষিত রাখলে আপনার সাপ্তাহিক ডেটা প্যাক দীর্ঘস্থায়ী হয়।",
        },
      },
    ],
  },

  // 4. Why signal strength changes
  {
    id: "anim-3",
    type: "animated-explainer",
    category: "Mobile Networks",
    title: {
      en: "4. Why Signal Strength Changes",
      bn: "৪. সিগন্যালের শক্তি কেন কমে বা বাড়ে",
    },
    summary: {
      en: "Explore how distance, reinforced concrete walls, hills, and evening congestion affect received signal dBm.",
      bn: "দূরত্ব, কংক্রিটের দেয়াল, পাহাড়-টিলা এবং ব্যস্ত সময়ের চাপ কীভাবে সিগন্যাল বদলে দেয় তা দেখুন।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Explainer (ITU-R P.1411 Propagation Primer)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "signal-barrier",
        stageStep: 0,
        cameraFocus: "left",
        headline: { en: "1. Distance Spreads Radio Energy", bn: "১. দূরত্ব বাড়লে তরঙ্গ ছড়িয়ে যায়" },
        caption: {
          en: "Like ripples on a pond, radio waves thin out as distance from the tower grows—dropping negative dBm.",
          bn: "পুকুরের ঢেউয়ের মতো টাওয়ার থেকে দূরত্ব বাড়লে রেডিও তরঙ্গ চারদিকে ছড়িয়ে পড়ে দুর্বল হয়ে যায়।",
        },
        voiceLine: {
          en: "Radio waves weaken as they travel outward from the tower, just like ripples fading across a river.",
          bn: "টাওয়ার থেকে দূরে যাওয়ার সাথে সাথে রেডিও তরঙ্গ পুকুরের ঢেউয়ের মতো ছড়িয়ে পড়ে দুর্বল হয়ে যায়।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "signal-barrier",
        stageStep: 1,
        cameraFocus: "center",
        headline: { en: "2. Concrete & Hills Cast Shadows", bn: "২. কংক্রিট ও পাহাড়ে সিগন্যাল ছায়া" },
        caption: {
          en: "Brick stairwells, steel rebar, and hills absorb 15 to 25 dB, leaving indoor rooms in a radio shadow.",
          bn: "কংক্রিটের মোটা দেয়াল ও পাহাড় ১৫ থেকে ২৫ dB সিগন্যাল শোষণ করে ঘরে অন্ধকার ছায়া তৈরি করে।",
        },
        voiceLine: {
          en: "Reinforced concrete walls and hills block direct radio beams, creating weaker indoor shadow zones.",
          bn: "কংক্রিট দেয়াল ও পাহাড়-টিলা সরাসরি তরঙ্গ আটকে দেয়, ফলে ঘরের ভেতর সিগন্যাল অনেকটা কমে যায়।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "signal-barrier",
        stageStep: 2,
        cameraFocus: "right",
        headline: {
          en: "3. Stepping Near Windows Restores Sight",
          bn: "৩. খোলা জানালা বা ছাদে সিগন্যাল ফিরে পাওয়া",
        },
        caption: {
          en: "Moving into open courtyards or near windows restores clear line-of-sight and jumps signal back to -68 dBm.",
          bn: "জানালা বা খোলা চত্বরে এলে সরাসরি সংযোগ ফিরে আসে এবং সিগন্যাল আবার পূর্ণ বার পায়।",
        },
        voiceLine: {
          en: "Stepping beside a window or outdoors removes the wall barrier and immediately restores stronger bars.",
          bn: "জানালার পাশে বা খোলা উঠোনে এলে দেয়ালের বাধা সরে যায় এবং সাথে সাথে শক্তিশালী সিগন্যাল ফিরে আসে।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "signal-barrier",
        stageStep: 3,
        cameraFocus: "overview",
        headline: {
          en: "4. Shared Sector Congestion at Peak Hour",
          bn: "৪. পিক আওয়ারে শেয়ার্ড সেক্টর যানজট",
        },
        caption: {
          en: "At 9 PM, hundreds of nearby users share one tower sector—lowering speed even with full bars.",
          bn: "রাত ৯টার দিকে একই সেক্টরে অসংখ্য মানুষ যুক্ত থাকায় পূর্ণ সিগন্যাল বার থাকলেও গতি ধীর হতে পারে।",
        },
        voiceLine: {
          en: "Even with full signal bars, evening congestion happens when hundreds of phones share one tower sector at once.",
          bn: "ফোনে পূর্ণ সিগন্যাল বার থাকলেও সন্ধ্যার ব্যস্ত সময়ে অনেক ব্যবহারকারী একই সেক্টর ভাগ করে নিলে গতি কিছুটা কমতে পারে।",
        },
      },
    ],
  },

  // 5. How a telecommunications tower works
  {
    id: "anim-tower",
    type: "animated-explainer",
    category: "Mobile Networks",
    title: {
      en: "5. How a Telecommunications Tower Works",
      bn: "৫. একটি টেলিকম টাওয়ার কীভাবে কাজ করে",
    },
    summary: {
      en: "Inspect every key subsystem of a Bangladeshi cellular BTS tower: sector antennas, radios, power backup, and fiber backhaul.",
      bn: "টেলিকম টাওয়ারের সেক্টর অ্যান্টেনা, রেডিও ইউনিট, বিদ্যুৎ ব্যাকআপ ও ফাইবার ব্যাকহলের সমন্বিত কাজ জানুন।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Explainer (GSMA BTS Tower Engineering Reference)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "tower-anatomy",
        stageStep: 0,
        cameraFocus: "left",
        headline: {
          en: "1. Elevated Lattice Mast & Antennas",
          bn: "১. উঁচু কাঠামো ও সেক্টর অ্যান্টেনা",
        },
        caption: {
          en: "Three directional panels spaced 120° apart sweep clean wireless coverage over rooftops and streets.",
          bn: "ভবনের ওপর থেকে ১২০° কোণে বসানো তিনটি সেক্টর অ্যান্টেনা পুরো ৩৬০° এলাকায় সিগন্যাল ছড়ায়।",
        },
        voiceLine: {
          en: "At the top of the steel mast, three directional sector antennas divide 360 degrees into three focused radio zones.",
          bn: "স্টিল টাওয়ারের শীর্ষে থাকা তিনটি সেক্টর অ্যান্টেনা ১২০ ডিগ্রি করে পুরো ৩৬০ ডিগ্রি এলাকায় সিগন্যাল ছড়িয়ে দেয়।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "tower-anatomy",
        stageStep: 1,
        cameraFocus: "center",
        headline: {
          en: "2. Radio Hardware (RRU & Baseband)",
          bn: "২. রেডিও ও বেসব্যান্ড প্রসেসিং ইউনিট",
        },
        caption: {
          en: "Remote Radio Units amplify high-frequency signals while base cabinets encode thousands of digital streams.",
          bn: "রেডিও ইউনিট বেতার সংকেত শক্তিশালী করে এবং বেসব্যান্ড ক্যাবিনেট হাজারো কণ্ঠ ও ডেটা প্রক্রিয়াকরণ করে।",
        },
        voiceLine: {
          en: "Radio hardware right behind the antennas converts digital network packets into precisely tuned radio waves.",
          bn: "অ্যান্টেনার পেছনের রেডিও যন্ত্রাংশ ডিজিটাল ডেটাকে নির্দিষ্ট ফ্রিকোয়েন্সির বেতার তরঙ্গে রূপান্তর করে।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "tower-anatomy",
        stageStep: 2,
        cameraFocus: "right",
        headline: { en: "3. Fiber & Microwave Backhaul", bn: "৩. ফাইবার ও মাইক্রোওয়েভ ব্যাকহল" },
        caption: {
          en: "Buried optical cables or point-to-point microwave dishes connect the tower back to regional network hubs.",
          bn: "মাটির নিচের অপটিক্যাল ফাইবার বা মাইক্রোওয়েভ ডিশ টাওয়ারটিকে মূল নেটওয়ার্কের সাথে যুক্ত রাখে।",
        },
        voiceLine: {
          en: "A tower cannot work alone: buried fiber optics or microwave dishes link all street traffic to the core network.",
          bn: "কোনো টাওয়ার একাকী কাজ করে না; ফাইবার কেবল অথবা মাইক্রোওয়েভ ডিশ সকল ট্রাফিক মূল নেটওয়ার্কে নিয়ে যায়।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "tower-anatomy",
        stageStep: 3,
        cameraFocus: "overview",
        headline: {
          en: "4. Solar, Battery Backup & Earthing",
          bn: "৪. সৌরশক্তি, ব্যাটারি ও সুরক্ষা ব্যবস্থা",
        },
        caption: {
          en: "Rectifiers, battery banks, solar panels, and lightning arrestors keep service steady through outages and storms.",
          bn: "ব্যাটারি ব্যাংক, সোলার ও বজ্রপাত নিরোধক ব্যবস্থা ঝড় বা লোডশেডিংয়ের সময়ও টাওয়ার সচল রাখে।",
        },
        voiceLine: {
          en: "Backup battery cabinets, solar canopies, and lightning rods keep Bangladeshi towers online even during power cuts.",
          bn: "ব্যাটারি ব্যাকআপ, সৌর প্যানেল ও বজ্রপাত নিরোধক রড বিদ্যুৎ বিভ্রাট ও ঝড়ের মধ্যেও টাওয়ারকে সচল রাখে।",
        },
      },
    ],
  },

  // 6. The difference between internet speed and data usage
  {
    id: "anim-speed-vs-data",
    type: "animated-explainer",
    category: "Mobile Data",
    title: {
      en: "6. Internet Speed vs Data Usage",
      bn: "৬. ইন্টারনেট গতি বনাম ডেটা খরচের পার্থক্য",
    },
    summary: {
      en: "Side-by-side animated proof that faster Mbps finishes downloads sooner while total MB consumed remains identical.",
      bn: "প্রমাণ দেখুন—গতি (Mbps) বেশি হলে ডাউনলোড দ্রুত শেষ হয়, কিন্তু মোট ব্যবহৃত ডেটা (MB) সমানই থাকে।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Original Curriculum Lab",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "speed-vs-data",
        stageStep: 0,
        cameraFocus: "overview",
        headline: { en: "1. Two Phones, Same 160 MB File", bn: "১. দুটি ফোন, একই ১৬০ MB ফাইল" },
        caption: {
          en: "Both phones request an identical 160 MB study archive—Phone A at 10 Mbps and Phone B at 40 Mbps.",
          bn: "দুটি ফোনেই ১৬০ MB আকারের একই ফাইল নামানো হচ্ছে—একটি ১০ Mbps এবং অন্যটি ৪০ Mbps গতিতে।",
        },
        voiceLine: {
          en: "Imagine two phones downloading the exact same 160 megabyte archive—one on 10 Mbps, the other on 40 Mbps.",
          bn: "ধরুন দুটি ফোনেই ঠিক একই ১৬০ মেগাবাইটের ফাইল ডাউনলোড হচ্ছে—প্রথমটি ১০ Mbps এবং দ্বিতীয়টি ৪০ Mbps গতিতে।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "speed-vs-data",
        stageStep: 1,
        cameraFocus: "left",
        headline: { en: "2. Wider Pipe Delivers Bits Faster", bn: "২. বেশি গতি মানে দ্রুত প্রবাহ" },
        caption: {
          en: "At 40 Mbps, bits flow 4 times faster across the link—finishing the transfer in ~32 seconds instead of 128.",
          bn: "৪০ Mbps গতিতে তথ্য ৪ গুণ দ্রুত প্রবাহিত হয়, ফলে ১২৮ সেকেন্ডের বদলে মাত্র ৩২ সেকেন্ডে শেষ হয়।",
        },
        voiceLine: {
          en: "At forty megabits per second, the wider pipe delivers packets four times faster, cutting waiting time down sharply.",
          bn: "৪০ মেগাবিট প্রতি সেকেন্ড গতিতে ডেটা ৪ গুণ দ্রুত আসে, ফলে অপেক্ষার সময় অনেক কমে যায়।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "speed-vs-data",
        stageStep: 2,
        cameraFocus: "right",
        headline: {
          en: "3. Final Data Tally Equals 160 MB",
          bn: "৩. শেষে মোট ডেটা খরচ সমান (১৬০ MB)",
        },
        caption: {
          en: "When Phone A catches up later, both devices have downloaded the exact same 160 MB.",
          bn: "ফোন এ কিছুক্ষণ পর শেষ করলেও উভয় ফোনেই ঠিক একই ১৬০ মেগাবাইট ডেটা খরচ হয়েছে।",
        },
        voiceLine: {
          en: "Once both downloads reach 100 percent, each phone has still consumed the exact same 160 megabytes.",
          bn: "উভয় ফোনে ডাউনলোড শতভাগ শেষ হলে দেখা যায়, দুটি ফোনেই ঠিক ১৬০ মেগাবাইট ডেটা ব্যবহৃত হয়েছে।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "speed-vs-data",
        stageStep: 3,
        cameraFocus: "overview",
        headline: {
          en: "4. Speed Saves Time, Resolution Changes MB",
          bn: "৪. গতি সময় বাঁচায়, রেজোলিউশন MB বদলায়",
        },
        caption: {
          en: "Remember the rule: higher Mbps saves wait time; auto-playing HD video is what uses more MB.",
          bn: "মনে রাখুন: বেশি গতি কেবল সময় বাঁচায়; আর ভিডিওর উচ্চ রেজোলিউশন ডেটার পরিমাণ বাড়ায়।",
        },
        voiceLine: {
          en: "Speed changes how long you wait; file size and video resolution determine how much data you spend.",
          bn: "গতি আপনার অপেক্ষার সময় কমায়, আর ফাইলের আকার ও ভিডিওর মান নির্ধারণ করে কতটুকু ডেটা খরচ হবে।",
        },
      },
    ],
  },

  // 7. How different communication methods work
  {
    id: "anim-4",
    type: "animated-explainer",
    category: "Mobile Networks",
    title: {
      en: "7. How Different Communication Methods Work",
      bn: "৭. বিভিন্ন যোগাযোগ মাধ্যম কীভাবে কাজ করে",
    },
    summary: {
      en: "Compare control-channel SMS & USSD, real-time Voice calls, and packet-switched 4G broadband.",
      bn: "এসএমএস, ইউএসএসডি, ভয়েস কল এবং ৪জি ইন্টারনেট কীভাবে আলাদা প্রযুক্তিতে চলে তা তুলনা করুন।",
    },
    durationLabel: "0:24 · Voice + Subtitles",
    durationSec: 24,
    sourceName: "RobiTrail Original Animation (GSM / VoLTE Standards)",
    frames: [
      {
        timeSec: 0,
        endSec: 6,
        diagramMode: "device-duplex",
        stageStep: 0,
        cameraFocus: "left",
        headline: { en: "1. SMS on Control Channels", bn: "১. কন্ট্রোল চ্যানেলে এসএমএস" },
        caption: {
          en: "SMS squeezes tiny ~140-byte texts onto signaling channels—working reliably even with 1 signal bar.",
          bn: "এসএমএস অতি ক্ষুদ্র কন্ট্রোল চ্যানেল ব্যবহার করে, তাই দুর্বল সিগন্যালেও পৌঁছে যায়।",
        },
        voiceLine: {
          en: "SMS messages ride lightweight control channels, working reliably without mobile internet even on weak connections.",
          bn: "এসএমএস কোনো ইন্টারনেট ছাড়াই হালকা কন্ট্রোল চ্যানেলে চলে বলে দুর্বল নেটওয়ার্কেও নির্ভরযোগ্য।",
        },
      },
      {
        timeSec: 6,
        endSec: 12,
        diagramMode: "device-duplex",
        stageStep: 1,
        cameraFocus: "center",
        headline: { en: "2. Interactive Offline USSD Sessions", bn: "২. অফলাইন ইউএসএসডি মেনু" },
        caption: {
          en: "Short codes create live two-way text menus for balance or emergency lookups without an internet pack.",
          bn: "ডেটা প্যাক না থাকলেও সাধারণ কোডের মাধ্যমে তাৎক্ষণিক তথ্য মেনু পাওয়া যায়।",
        },
        voiceLine: {
          en: "USSD opens a real-time text session directly with the operator core, ideal when mobile data is turned off.",
          bn: "ইউএসএসডি ইন্টারনেট ছাড়াই অপারেটরের সাথে সরাসরি তাৎক্ষণিক টেক্সট সেশন তৈরি করে।",
        },
      },
      {
        timeSec: 12,
        endSec: 18,
        diagramMode: "device-duplex",
        stageStep: 2,
        cameraFocus: "center",
        headline: { en: "3. Low-Latency Voice Calls", bn: "৩. ন্যূনতম বিলম্বের ভয়েস কল" },
        caption: {
          en: "Voice frames receive priority scheduling across towers so two people speak seamlessly without delay.",
          bn: "কথোপকথনে যেন দেরি না হয় সেজন্য ভয়েস প্যাকেটগুলো টাওয়ারে সর্বোচ্চ অগ্রাধিকার পায়।",
        },
        voiceLine: {
          en: "Voice calls receive high network priority so spoken conversation sounds smooth and immediate.",
          bn: "কথোপকথন সাবলীল রাখতে নেটওয়ার্কের ভেতরে ভয়েস কলকে সর্বোচ্চ অগ্রাধিকার দেওয়া হয়।",
        },
      },
      {
        timeSec: 18,
        endSec: 24,
        diagramMode: "device-duplex",
        stageStep: 3,
        cameraFocus: "right",
        headline: { en: "4. High-Capacity 4G/5G Data Packets", bn: "৪. উচ্চ-গতির ৪জি/৫জি ইন্টারনেট" },
        caption: {
          en: "Broadband IP packets carry classrooms, video calls, maps, and apps whenever strong signal & data are available.",
          bn: "অনলাইন ক্লাস, ভিডিও কল ও আধুনিক অ্যাপগুলোর জন্য উচ্চগতির প্যাকেট ডেটা ব্যবহৃত হয়।",
        },
        voiceLine: {
          en: "And when you need classrooms, maps, or rich web apps, 4G and 5G broadband carries large IP data streams.",
          bn: "আর অনলাইন ক্লাস, ম্যাপ বা ভিডিও কলের জন্য উচ্চগতির ৪জি ও ৫জি ইন্টারনেট প্যাকেট ব্যবহৃত হয়।",
        },
      },
    ],
  },

  // Official YouTube Reference Videos (Embedded cleanly)
  {
    id: "yt-bdapps-01",
    type: "youtube",
    category: "bdapps",
    youtubeId: "aKCATX3Yub4",
    title: {
      en: "bdapps Tutorial 01 — What is bdapps & How to Create Account",
      bn: "বিডিঅ্যাপস টিউটোরিয়াল ০১ — বিডিঅ্যাপস কী এবং কীভাবে অ্যাকাউন্ট তৈরি করবেন",
    },
    summary: {
      en: "Official bdapps tutorial introducing Lite Apps, Pro Apps, OTP verification, and account registration on Bangladesh’s national telecom application platform.",
      bn: "বাংলাদেশের জাতীয় টেলিকম অ্যাপ প্ল্যাটফর্ম বিডিঅ্যাপস-এ লাইট ও প্রো অ্যাপ পরিচিতি এবং ওটিপি ভেরিফিকেশনসহ অ্যাকাউন্ট তৈরির অফিশিয়াল নির্দেশিকা।",
    },
    durationLabel: "YouTube Embedded",
    sourceName: "bdapps Official YouTube (@user.bdapps)",
    externalUrl: "https://www.youtube.com/watch?v=aKCATX3Yub4",
  },
  {
    id: "yt-bdapps-essential",
    type: "youtube",
    category: "bdapps",
    youtubeId: "Ak5LIix2wrU",
    title: {
      en: "bdapps Essential Developer Training — SMS, USSD & Subscription APIs",
      bn: "বিডিঅ্যাপস এসেনশিয়াল ডেভেলপার ট্রেনিং — এসএমএস, ইউএসএসডি ও এপিআই",
    },
    summary: {
      en: "Step-by-step official overview of bdapps Lite apps, Alert/Service modules, and core telecom APIs for mobile builders.",
      bn: "বিডিঅ্যাপস লাইট অ্যাপ, অ্যালার্ট/সার্ভিস মডিউল এবং টেলিকম এপিআই ব্যবহারের ধারাবাহিক ভিডিও টিউটোরিয়াল।",
    },
    durationLabel: "YouTube Embedded",
    sourceName: "bdapps Developer Training (YouTube)",
    externalUrl: "https://www.youtube.com/watch?v=Ak5LIix2wrU",
  },
  {
    id: "yt-bdapps-quiz",
    type: "youtube",
    category: "bdapps",
    youtubeId: "rOfuYDZnEG8",
    title: {
      en: "Introducing the Quiz Module in bdapps",
      bn: "বিডিঅ্যাপস-এ কুইজ মডিউল তৈরি ও ব্যবহার",
    },
    summary: {
      en: "Official tutorial demonstrating how creators configure interactive quiz flows on the bdapps developer platform.",
      bn: "বিডিঅ্যাপস প্ল্যাটফর্মে ইন্টারেক্টিভ কুইজ ফিচার তৈরি করার অফিশিয়াল টিউটোরিয়াল।",
    },
    durationLabel: "YouTube Embedded",
    sourceName: "bdapps Official YouTube (@user.bdapps)",
    externalUrl: "https://www.youtube.com/watch?v=rOfuYDZnEG8",
  },
  {
    id: "ref-bdapps-training",
    type: "official-reference",
    category: "Robi",
    title: {
      en: "bdapps Essential Developer Training Portal",
      bn: "বিডিঅ্যাপস এসেনশিয়াল ডেভেলপার ট্রেনিং পোর্টাল",
    },
    summary: {
      en: "Official Robi / bdapps training documentation covering SMS, USSD, Subscription, and CaaS API onboarding for Bangladeshi developers.",
      bn: "এসএমএস, ইউএসএসডি, সাবস্ক্রিপশন ও CaaS এপিআই শেখার জন্য অফিশিয়াল বিডিঅ্যাপস প্রশিক্ষণ পোর্টাল।",
    },
    durationLabel: "Official Training Docs",
    sourceName: "dev.bdapps.com Essential Training",
    externalUrl: "https://dev.bdapps.com/essential_training.php",
  },
];
