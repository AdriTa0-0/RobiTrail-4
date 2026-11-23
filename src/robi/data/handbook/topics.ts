import type { LocalizedText } from "../translations/dictionary";

export interface HandbookHotspot {
  id: string;
  label: LocalizedText;
  explanation: LocalizedText;
}

export type HandbookExhibitMode =
  | "network-flow"
  | "data-phone"
  | "signal-obstacles"
  | "speed-vs-data"
  | "tower-3d"
  | "sms-voice-data"
  | "congestion-sector"
  | "robi-bdapps"
  | "bd-connectivity";

export interface HandbookTopic {
  id: string;
  order: number;
  title: LocalizedText;
  summary: LocalizedText;
  interactiveMode: HandbookExhibitMode;
  seeIt: LocalizedText;
  tryIt: LocalizedText;
  understandIt: LocalizedText;
  exploreMore: LocalizedText;
  advancedNote: LocalizedText;
  sourceAttribution: string;
  hotspots: HandbookHotspot[];
}

export const HANDBOOK_TOPICS: HandbookTopic[] = [
  {
    id: "how-tower-works",
    order: 1,
    title: { en: "How Mobile Networks Work", bn: "মোবাইল নেটওয়ার্ক কীভাবে কাজ করে" },
    summary: {
      en: "Follow a voice call or chat packet as it travels wirelessly from your phone to a nearby tower, through fiber backhaul and the switching core, and out to the destination.",
      bn: "আপনার ফোন থেকে একটি কল বা বার্তা কীভাবে নিকটস্থ টাওয়ার, ফাইবার ব্যাকহল এবং সুইচিং কোর হয়ে গন্তব্য ফোনে পৌঁছায় তা দেখুন।",
    },
    interactiveMode: "network-flow",
    seeIt: {
      en: "Watch animated packets climb from Phone A to Tower A, turn into optical light inside underground fiber, pass the Core Switch, and exit Tower B.",
      bn: "ফোন এ থেকে টাওয়ার এ, মাটির নিচের ফাইবারে আলোর স্পন্দন হয়ে কোর সুইচ ও টাওয়ার বি-তে প্যাকেটের যাত্রা দেখুন।",
    },
    tryIt: {
      en: "Press Play Packet Flow, click any hop to inspect it, or pause at the Core Switch to examine routing.",
      bn: "প্লে বোতামে চাপুন অথবা যেকোনো ধাপে ক্লিক করে তার ভূমিকা পরীক্ষা করুন।",
    },
    understandIt: {
      en: 'Two phones almost never talk directly. Every call or internet request uses radio for only the "last mile" before entering high-capacity optical fiber.',
      bn: "দুটি ফোন সাধারণত সরাসরি সংযুক্ত হয় না; কেবল শেষ ধাপে রেডিও তরঙ্গ এবং মূল পথে উচ্চগতির অপটিক্যাল ফাইবার ব্যবহৃত হয়।",
    },
    exploreMore: {
      en: "Practiced live in Chattogram Trail 1 (Robi Sheba — The Missing Signal Case) and Sylhet Trail 5 (The Network Journey).",
      bn: "চট্টগ্রাম ট্রেইল ১ এবং সিলেট ট্রেইল ৫-এ এই প্রক্রিয়াটি হাতেকলমে অনুশীলন করা হয়েছে।",
    },
    advancedNote: {
      en: "In 4G LTE, eNodeB towers connect to the Evolved Packet Core (EPC) via S1 fiber links using IP packet switching—even voice runs as prioritized VoLTE packets.",
      bn: "৪জি এলটিই নেটওয়ার্কে টাওয়ার (eNodeB) এস১ ফাইবার লিংকের মাধ্যমে কোর নেটওয়ার্কে (EPC) যুক্ত থাকে এবং ভয়েসও প্যাকেট আকারে যায়।",
    },
    sourceAttribution: "ITU Mobile Radio Access Principles & GSMA Infrastructure Guide",
    hotspots: [
      {
        id: "phone-a",
        label: { en: "Sender Phone", bn: "প্রেরক ফোন" },
        explanation: {
          en: "Converts voice or text into binary digital packets and radiates radio waves toward the strongest local tower sector.",
          bn: "কণ্ঠস্বর বা লেখাকে ডিজিটাল প্যাকেটে রূপান্তর করে নিকটস্থ শক্তিশালী টাওয়ারে পাঠায়।",
        },
      },
      {
        id: "tower-a",
        label: { en: "Local Tower (BTS)", bn: "নিকটস্থ টাওয়ার" },
        explanation: {
          en: "Captures weak wireless signals from hundreds of phones and hands them onto fiber optic cables.",
          bn: "শত শত ফোনের বেতার সংকেত সংগ্রহ করে অপটিক্যাল ফাইবার কেবলে তুলে দেয়।",
        },
      },
      {
        id: "core",
        label: { en: "Switching Core", bn: "কোর সুইচিং হাব" },
        explanation: {
          en: "Verifies SIM registration, checks data balance or permissions, and routes packets to the destination tower.",
          bn: "সিম ও অনুমোদন যাচাই করে প্যাকেটগুলো সঠিক গন্তব্য টাওয়ারের দিকে পাঠিয়ে দেয়।",
        },
      },
      {
        id: "phone-b",
        label: { en: "Receiver Phone", bn: "গ্রাহক ফোন" },
        explanation: {
          en: "Receives incoming radio bursts from Tower B and decodes the packets back into speech, image, or text.",
          bn: "টাওয়ার বি থেকে বেতার সংকেত গ্রহণ করে সেগুলোকে আবার শব্দ বা বার্তায় রূপান্তর করে।",
        },
      },
    ],
  },
  {
    id: "what-is-mobile-data",
    order: 2,
    title: { en: "What Is Mobile Data?", bn: "মোবাইল ডেটা কী?" },
    summary: {
      en: "Mobile data is the digital volume (KB, MB, GB) transferred between your phone and servers. Launch simulated apps below to watch how different tasks consume your allowance.",
      bn: "মোবাইল ডেটা হলো আপনার ফোন ও সার্ভারের মধ্যে আদান-প্রদান হওয়া তথ্যের পরিমাণ (KB, MB, GB)। নিচের ফোনে অ্যাপ চালিয়ে খরচ দেখুন।",
    },
    interactiveMode: "data-phone",
    seeIt: {
      en: "Inspect the live smartphone screen and watch the megabyte fuel tank respond differently to text, PDFs, SD classes, and 1080p streams.",
      bn: "স্মার্টফোনের স্ক্রিনে মেগাবাইট মিটার দেখুন—টেক্সট, পিডিএফ, সাধারণ ভিডিও ও এইচডি ভিডিওর খরচের পার্থক্য স্পষ্টভাবে ফুটে ওঠে।",
    },
    tryIt: {
      en: "Tap simulated apps inside the phone screen to run a 15-minute session, or toggle Auto-Play & Cloud Sync and Reset to compare.",
      bn: "ফোনের স্ক্রিনের বিভিন্ন অ্যাপে ট্যাপ করে ১৫ মিনিটের খরচ দেখুন এবং অটোপ্লে চালু/বন্ধ করে তুলনা করুন।",
    },
    understandIt: {
      en: "Text messages move tiny amounts of data (under 0.1 MB), while high-resolution video sends millions of pixels per second—making video quality the biggest driver of MB usage.",
      bn: "টেক্সট বার্তায় অতি সামান্য ডেটা খরচ হয়, কিন্তু উচ্চ মানের ভিডিও প্রতি সেকেন্ডে বিপুল পিক্সেল পাঠায় বলে দ্রুত এমবি শেষ হয়।",
    },
    exploreMore: {
      en: "Applied directly in Dhaka Trail 1 (Data Detective) and Sylhet Trail 3 (Smart Data Choices).",
      bn: "ঢাকা ট্রেইল ১ (ডেটা গোয়েন্দা) এবং সিলেট ট্রেইল ৩-এ এই দক্ষতা প্রয়োগ করা হয়।",
    },
    advancedNote: {
      en: "Telecom billing commonly uses decimal metric units (1 GB = 1,000 MB), whereas some operating systems display binary GiB (1,024 MiB).",
      bn: "টেলিকম বিলিংয়ে সাধারণত ১ জিবি = ১,০০০ এমবি (দশমিক) হিসেবে ধরা হয়, যদিও কিছু ফোনে ১,০২৪ এমবি দেখায়।",
    },
    sourceAttribution: "BTRC Consumer Data Literacy & ITU Packet Switching Primer",
    hotspots: [
      {
        id: "text",
        label: { en: "Chat & Text (< 1 MB)", bn: "চ্যাট ও টেক্সট (< ১ MB)" },
        explanation: {
          en: "Short messages and exam notifications take only a few kilobytes—one 1080p video minute equals thousands of text messages.",
          bn: "ছোট বার্তা বা পরীক্ষার নোটিফিকেশনে মাত্র কয়েক কিলোবাইট খরচ হয়।",
        },
      },
      {
        id: "pdf",
        label: { en: "Study PDF (8 MB)", bn: "পড়াশোনার পিডিএফ (৮ MB)" },
        explanation: {
          en: "Downloading a lecture PDF once lets you read offline repeatedly with zero extra mobile data.",
          bn: "একবার পিডিএফ ডাউনলোড করলে অফলাইনে বারবার পড়া যায়, অতিরিক্ত ডেটা কাটে না।",
        },
      },
      {
        id: "video",
        label: { en: "360p vs 1080p Video", bn: "৩৬০পি বনাম ১০৮০পি ভিডিও" },
        explanation: {
          en: "Watching an online class in 360p saves ~70% of mobile data compared to 1080p Full HD on small phone screens.",
          bn: "ছোট ফোনের স্ক্রিনে ১০৮০পি-র বদলে ৩৬০পি-তে ক্লাস করলে প্রায় ৭০% ডেটা সাশ্রয় হয়।",
        },
      },
    ],
  },
  {
    id: "why-signal-changes",
    order: 3,
    title: { en: "Why Does Signal Strength Change?", bn: "সিগন্যালের শক্তি কেন কমে-বাড়ে?" },
    summary: {
      en: "Radio waves weaken quickly with distance and are absorbed or reflected by reinforced concrete walls, hills, and heavy monsoon rain.",
      bn: "দূরত্ব বাড়লে এবং কংক্রিট দেয়াল, টিলা ও ভারী বৃষ্টির মধ্যে দিয়ে যাওয়ার সময় রেডিও তরঙ্গ দুর্বল হয়ে পড়ে।",
    },
    interactiveMode: "signal-obstacles",
    seeIt: {
      en: "Observe animated RF arcs leaving the tower and fading as you move the phone farther away or place obstacles in their path.",
      bn: "টাওয়ার থেকে বের হওয়া রেডিও তরঙ্গ দূরত্ব ও বাধার কারণে কীভাবে ক্ষীণ হয়ে যায় তা লাইভ দেখুন।",
    },
    tryIt: {
      en: "Drag the Distance slider and toggle Brick/Concrete Wall, Tilagarh Hill, and Monsoon Rain to watch dBm & signal bars shift.",
      bn: "দূরত্বের স্লাইডার সরান এবং কংক্রিট দেয়াল, টিলা বা বৃষ্টি চালু করে dBm মানের পরিবর্তন দেখুন।",
    },
    understandIt: {
      en: "Signal strength is measured in negative dBm: -65 dBm is strong (5 bars), while -108 dBm drops packets. Every 6 dB drop cuts radio wave amplitude in half.",
      bn: "সিগন্যাল ঋণাত্মক dBm-এ মাপা হয়: -৬৫ dBm শক্তিশালী, আর -১০৮ dBm প্রায় বিচ্ছিন্ন হওয়ার অবস্থা।",
    },
    exploreMore: {
      en: "Practiced in Chattogram Trail 2 (Rooftop Network Puzzle) and Sylhet Trail 2 (Signal and Obstacles).",
      bn: "চট্টগ্রাম ট্রেইল ২ এবং সিলেট ট্রেইল ২-এ এই বিষয়টি হাতেকলমে শেখানো হয়েছে।",
    },
    advancedNote: {
      en: "Lower frequency bands (such as 900 MHz) bend farther around buildings and hills, while higher 1800/2100/2600 MHz bands carry more data speed at shorter range.",
      bn: "কম ফ্রিকোয়েন্সির তরঙ্গ (৯০০ MHz) দূর ও ভবনের ভেতরে ভালো যায়; আর ১৮০০/২১০০ MHz ব্যান্ড দ্রুত ডেটা গতি দেয়।",
    },
    sourceAttribution: "ITU-R P.1411 Propagation Model (Simplified Educational Adaptation)",
    hotspots: [
      {
        id: "distance",
        label: { en: "Distance Attenuation", bn: "দূরত্বজনিত ক্ষয়" },
        explanation: {
          en: "As radio energy spreads outward in three dimensions, signal intensity drops steeply with distance.",
          bn: "টাওয়ার থেকে দূরে যাওয়ার সাথে সাথে তরঙ্গ চারদিকে ছড়িয়ে পড়ে বলে শক্তি দ্রুত কমে।",
        },
      },
      {
        id: "concrete",
        label: { en: "Concrete Shadowing", bn: "কংক্রিট দেয়ালের বাধা" },
        explanation: {
          en: "Thick concrete and steel rebar inside dense city stairwells can drop signal by 15 to 25 dB.",
          bn: "ঘন কংক্রিট ও রড-সিমেন্টের দেয়াল সিগন্যাল ১৫ থেকে ২৫ dB পর্যন্ত কমিয়ে দিতে পারে।",
        },
      },
      {
        id: "rain",
        label: { en: "Terrain & Heavy Rain", bn: "টিলা ও ভারী বৃষ্টি" },
        explanation: {
          en: "Hills block direct line-of-sight, and heavy monsoon downpours scatter higher radio bands.",
          bn: "পাহাড়-টিলা সরাসরি সংযোগে বাধা দেয় এবং ভারী বৃষ্টি উচ্চ তরঙ্গে বিঘ্ন ঘটায়।",
        },
      },
    ],
  },
  {
    id: "speed-vs-data",
    order: 4,
    title: { en: "Internet Speed vs Data Usage", bn: "ইন্টারনেট গতি বনাম ডেটা পরিমাণ" },
    summary: {
      en: "Speed (Mbps) measures how quickly data arrives, while Data Volume (MB/GB) measures the size of the file itself. Faster speed saves time, not megabytes.",
      bn: "গতি (Mbps) হলো ডেটা আসার হার, আর ডেটা (MB/GB) হলো ফাইলের মোট আকার। বেশি গতি সময় বাঁচায়, মেগাবাইট বেশি কাটে না।",
    },
    interactiveMode: "speed-vs-data",
    seeIt: {
      en: "Race two side-by-side download pipes transferring the exact same file at two different Mbps speeds.",
      bn: "একই ফাইল ভিন্ন গতির দুটি সংযোগে ডাউনলোড হতে দেখুন এবং সময় ও ব্যবহৃত এমবি তুলনা করুন।",
    },
    tryIt: {
      en: "Set File Size and Speeds for Pipe A & Pipe B, press Run Race, and verify that both consume identical MB upon completion.",
      bn: "ফাইলের আকার ও দুটি গতি নির্ধারণ করে রেস চালান এবং শেষ হওয়ার পর উভয়ের মোট ডেটা খরচ দেখুন।",
    },
    understandIt: {
      en: "Theoretical Download Time (s) = (File Size MB × 8 bits/byte) ÷ Speed (Mbps). Doubling speed halves wait time without doubling MB used.",
      bn: "তাত্ত্বিক সময় (সেকেন্ড) = (ফাইল সাইজ MB × ৮) ÷ গতি (Mbps)। গতি দ্বিগুণ হলে সময় অর্ধেক হয়, ডেটা খরচ একই থাকে।",
    },
    exploreMore: {
      en: "Interactive dual-phone experiment available in Dhaka Trail 3 (Speed or Data?).",
      bn: "ঢাকা ট্রেইল ৩ (গতি নাকি ডেটা?)-এ দুটি ফোনের মাধ্যমে সরাসরি এই পরীক্ষাটি করা যায়।",
    },
    advancedNote: {
      en: "Because 1 Byte = 8 bits, an 8 Mbps link theoretically transfers 1 MB per second; real TCP/IP protocol headers add a small ~5–8% overhead.",
      bn: "১ বাইট = ৮ বিট হওয়ায় ৮ Mbps গতিতে তাত্ত্বিকভাবে প্রতি সেকেন্ডে ১ MB ডাউনলোড হয়; বাস্তবে প্রোটোকল ওভারহেডের কারণে সামান্য বেশি সময় লাগে।",
    },
    sourceAttribution: "RobiTrail Telecommunications Curriculum",
    hotspots: [
      {
        id: "mbps",
        label: { en: "Mbps (Flow Rate)", bn: "এমবিপিএস (প্রবাহের হার)" },
        explanation: {
          en: "Megabits per second describes pipe width—how fast bits stream across the air.",
          bn: "প্রতি সেকেন্ডে কত মেগাবিট তথ্য আসছে তা নির্দেশ করে।",
        },
      },
      {
        id: "mb",
        label: { en: "MB / GB (File Size)", bn: "এমবি / জিবি (মোট আকার)" },
        explanation: {
          en: "Megabytes describe total volume stored or fetched—determined by the file itself.",
          bn: "ডাউনলোড করা ফাইলের মোট পরিমাণ নির্দেশ করে।",
        },
      },
    ],
  },
  {
    id: "tower-components-3d",
    order: 5,
    title: { en: "Tower Components (3D)", bn: "মোবাইল টাওয়ারের যন্ত্রাংশ (৩ডি)" },
    summary: {
      en: "Rotate, zoom, and click all 6 real engineering subsystems of a 3D Bangladeshi cellular base station tower (BTS) in a daylight inspection compound.",
      bn: "দিনের আলোর ৩ডি টাওয়ার কম্পাউন্ডে একটি মোবাইল বেস স্টেশনের ৬টি মূল যন্ত্রাংশ ঘুরিয়ে, জুম করে ও ক্লিক করে পরীক্ষা করুন।",
    },
    interactiveMode: "tower-3d",
    seeIt: {
      en: "Inspect the 6 core tower subsystems in 3D: Sector Antennas, Remote Radio Units (RRU), Steel Lattice Structure, Solar/Battery Power System, Microwave/Fiber Backhaul, and Baseband Supporting Shelter.",
      bn: "৩ডি টাওয়ারে ৬টি প্রধান অংশ দেখুন: সেক্টর অ্যান্টেনা, রেডিও ইউনিট (RRU), স্টিল ল্যাটিস কাঠামো, সৌর/ব্যাটারি বিদ্যুৎ ব্যবস্থা, মাইক্রোওয়েভ ও ফাইবার ব্যাকহল এবং সহায়ক বেসব্যান্ড শেল্টার।",
    },
    tryIt: {
      en: "Click any part directly on the 3D tower or select a component button to watch the camera smoothly focus in, or drag 360° freely.",
      bn: "৩ডি টাওয়ারের যেকোনো অংশে বা নিচের বোতামে ক্লিক করলে ক্যামেরা মসৃণভাবে সেখানে জুম করবে; চাইলে ৩৬০° ঘুরিয়েও দেখতে পারেন।",
    },
    understandIt: {
      en: "Every cellular site combines RF antennas at height, radio transceivers converting light to radio waves, backup power for outages, and fiber or microwave backhaul linking to the core.",
      bn: "প্রতিটি টাওয়ারে ওপরে থাকে অ্যান্টেনা ও রেডিও ইউনিট, নিচে বিদ্যুৎ-ব্যাটারি ও ক্যাবিনেট এবং পেছনে কোর নেটওয়ার্কের সাথে যুক্ত মাইক্রোওয়েভ বা ফাইবার ব্যাকহল।",
    },
    exploreMore: {
      en: "Understanding all 6 subsystems helps you diagnose faults in Chattogram Trail 3 and Sylhet Trail 1.",
      bn: "এই ৬টি যন্ত্রাংশ চিনতে পারলে চট্টগ্রাম ট্রেইল ৩ ও সিলেট ট্রেইল ১-এ ত্রুটি মেরামত করা সহজ হবে।",
    },
    advancedNote: {
      en: "Modern Giga Green 4G sites pair solar arrays and lithium backup banks with tower-mounted RRUs to minimize coaxial feeder cable losses.",
      bn: "আধুনিক গিগা গ্রিন ৪জি সাইটে সৌর প্যানেল, লিথিয়াম ব্যাটারি এবং টাওয়ারের মাথায় RRU বসানো হয় যাতে সিগন্যাল ক্ষয় কমে।",
    },
    sourceAttribution: "GSMA Tower Infrastructure Reference & Robi Network Engineering Notes",
    hotspots: [
      {
        id: "antenna",
        label: { en: "1. Antennas", bn: "১. সেক্টর অ্যান্টেনা" },
        explanation: {
          en: "Three white directional panel antennas spaced 120° apart provide complete 360° street coverage while dividing users into clean radio sectors.",
          bn: "১২০° কোণে বসানো তিনটি সাদা প্যানেল অ্যান্টেনা মিলে ৩৬০° এলাকায় স্পষ্ট সিগন্যাল ছড়িয়ে দেয়।",
        },
      },
      {
        id: "radio",
        label: { en: "2. Radio Unit (RRU)", bn: "২. রেডিও ইউনিট (RRU)" },
        explanation: {
          en: "Mounted right behind the antennas, Remote Radio Units amplify signals and convert optical fiber light from the base cabinet into high-frequency RF waveforms.",
          bn: "অ্যান্টেনার ঠিক পেছনে থাকা রেডিও ইউনিট ফাইবারের আলোর সংকেতকে শক্তিশালী রেডিও তরঙ্গে রূপান্তর করে।",
        },
      },
      {
        id: "structure",
        label: { en: "3. Steel Structure", bn: "৩. স্টিল কাঠামো" },
        explanation: {
          en: "Cross-braced galvanized steel lattice elevates antennas 25–45 meters above rooftops and trees while withstanding monsoon cyclones.",
          bn: "গ্যালভানাইজড স্টিলের মাস্তুল অ্যান্টেনাকে ভবন ও গাছপালার ওপরে রাখে এবং কালবৈশাখী ও ঘূর্ণিঝড়ে স্থির রাখে।",
        },
      },
      {
        id: "power",
        label: { en: "4. Power System", bn: "৪. বিদ্যুৎ ও সৌর ব্যবস্থা" },
        explanation: {
          en: "Combines grid power rectifiers, backup battery banks, and solar panels so rural and city towers remain online during electrical outages.",
          bn: "জাতীয় গ্রিড, ব্যাকআপ ব্যাটারি ও সৌর প্যানেলের সমন্বয়ে বিদ্যুৎ বিচ্ছিন্ন হলেও টাওয়ার সচল থাকে।",
        },
      },
      {
        id: "backhaul",
        label: { en: "5. Backhaul (Fiber & MW)", bn: "৫. ব্যাকহল (ফাইবার ও ডিশ)" },
        explanation: {
          en: "Includes both buried optical fiber conduits and elevated microwave drum dishes carrying high-speed traffic across rivers and hills to Robi’s core hubs.",
          bn: "মাটির নিচের অপটিক্যাল ফাইবার এবং টাওয়ারে লাগানো মাইক্রোওয়েভ ডিশ মিলে সমস্ত ডেটা কোর নেটওয়ার্কে পৌঁছে দেয়।",
        },
      },
      {
        id: "supporting",
        label: { en: "6. Supporting Components", bn: "৬. সহায়ক শেল্টার ও কেব্‌ল" },
        explanation: {
          en: "Shielded baseband shelter cabinet, vertical cable tray ladders, and copper lightning-protection earthing bars safeguarding tower electronics.",
          bn: "নিরাপদ বেসব্যান্ড শেল্টার ক্যাবিনেট, কেব্‌ল ল্যাডার এবং বজ্রপাত প্রতিরোধী তামার আর্থিং ব্যবস্থা।",
        },
      },
    ],
  },
  {
    id: "sms-voice-data",
    order: 6,
    title: { en: "SMS, Voice & Internet Communication", bn: "এসএমএস, ভয়েস ও ইন্টারনেট যোগাযোগ" },
    summary: {
      en: "Compare how SMS, illustrative USSD menus, Voice calls, and 4G Internet Packets operate under different signal and balance conditions.",
      bn: "ভিন্ন নেটওয়ার্ক ও ব্যালেন্স অবস্থায় এসএমএস, ইউএসএসডি, ভয়েস কল এবং ৪জি ইন্টারনেট কীভাবে কাজ করে তা তুলনা করুন।",
    },
    interactiveMode: "sms-voice-data",
    seeIt: {
      en: "Inspect three parallel phone channels showing packet size, signal requirement, and behavior when mobile data is turned off.",
      bn: "ইন্টারনেট বন্ধ বা দুর্বল থাকা অবস্থায় তিনটি আলাদা চ্যানেল কীভাবে কাজ করে তা পাশাপাশি দেখুন।",
    },
    tryIt: {
      en: "Switch between 4G Strong, Weak 2G Ferry, and Data Off conditions, then trigger SMS, Illustrative USSD (*000# Demo), Voice, or Video.",
      bn: "ভিন্ন সিগন্যাল অবস্থা নির্বাচন করে এসএমএস, ডেমো ইউএসএসডি, ভয়েস কল ও ভিডিও পরীক্ষা করে দেখুন।",
    },
    understandIt: {
      en: "SMS and USSD travel on tiny GSM control channels without needing an internet pack, making them dependable during emergencies and river crossings.",
      bn: "এসএমএস ও ইউএসএসডি ইন্টারনেট ছাড়াই সাধারণ কন্ট্রোল চ্যানেলে কাজ করে বলে জরুরি অবস্থা বা দুর্বল সিগন্যালেও অত্যন্ত নির্ভরযোগ্য।",
    },
    exploreMore: {
      en: "Compare channel choices across real scenarios in Dhaka Trail 2 and Dhaka Trail 5.",
      bn: "ঢাকা ট্রেইল ২ এবং ঢাকা ট্রেইল ৫-এ বাস্তব পরিস্থিতিতে মাধ্যম নির্বাচন অনুশীলন করুন।",
    },
    advancedNote: {
      en: "Note: *000# shown in the simulator is an illustrative educational prompt—always verify active operator codes directly inside official operator apps.",
      bn: "দ্রষ্টব্য: সিমুলেটরে দেখানো *000# শুধুমাত্র শিক্ষামূলক নমুনা কোড; আসল অপারেটর কোডের জন্য অফিসিয়াল অ্যাপ দেখুন।",
    },
    sourceAttribution: "GSM Core Signaling & RobiTrail Telecom Literacy Guide",
    hotspots: [
      {
        id: "sms-ussd",
        label: { en: "SMS & Illustrative USSD", bn: "এসএমএস ও ডেমো ইউএসএসডি" },
        explanation: {
          en: "Lightweight text sessions (~140 bytes) ideal for OTPs, banking alerts, and low-signal reliability.",
          bn: "ওটিপি, সতর্কবার্তা ও দুর্বল সিগন্যালে অত্যন্ত নির্ভরযোগ্য টেক্সট মাধ্যম।",
        },
      },
      {
        id: "voice",
        label: { en: "Voice Call (Circuit / VoLTE)", bn: "ভয়েস কল" },
        explanation: {
          en: "Prioritizes ultra-low delay for live two-way conversation across 2G/3G/4G.",
          bn: "তাৎক্ষণিক কথোপকথনের জন্য ন্যূনতম দেরিতে দুই দিকের শব্দ পরিবহন করে।",
        },
      },
      {
        id: "data",
        label: { en: "4G Packet Internet", bn: "৪জি ইন্টারনেট ডেটা" },
        explanation: {
          en: "Carries web pages, study apps, maps, and video streams whenever mobile broadband is enabled.",
          bn: "ওয়েবসাইট, ম্যাপ, অনলাইন ক্লাস ও ভিডিও স্ট্রিমিংয়ের জন্য অপরিহার্য।",
        },
      },
    ],
  },
  {
    id: "network-congestion",
    order: 7,
    title: { en: "Network Congestion", bn: "নেটওয়ার্ক যানজট (কনজেশন)" },
    summary: {
      en: "A single tower sector shares its finite radio bandwidth among everyone nearby. Too many heavy evening streams raise latency and slow everyone down.",
      bn: "একটি টাওয়ার সেক্টরের নির্দিষ্ট সক্ষমতা আশপাশের সবাই ভাগ করে ব্যবহার করে। একইসাথে অতিরিক্ত ভারী ব্যবহার ল্যাটেন্সি বাড়িয়ে দেয়।",
    },
    interactiveMode: "congestion-sector",
    seeIt: {
      en: "Watch the shared 100 Mbps sector pipe load meter climb from green to amber to overloaded crimson as concurrent evening users join.",
      bn: "সন্ধ্যায় একইসাথে ব্যবহারকারী বাড়ার সাথে সাথে ১০০ Mbps সেক্টরের চাপ সবুজ থেকে লাল স্তরে পৌঁছানো দেখুন।",
    },
    tryIt: {
      en: "Toggle concurrent neighborhood loads (4K TVs, Cloud Backups, Online Exams, Messaging) and observe Latency (ms) & Packet Queuing.",
      bn: "৪কে টিভি, ক্লাউড ব্যাকআপ, অনলাইন পরীক্ষা ও চ্যাটিং চালু/বন্ধ করে ল্যাটেন্সি ও সেক্টরের চাপ দেখুন।",
    },
    understandIt: {
      en: "Congestion is rarely a broken tower—it is a traffic jam on shared airwaves. Moving automated backups off-peak and using HD instead of 4K keeps everyone fast.",
      bn: "সন্ধ্যার ধীরগতি সবসময় টাওয়ার নষ্ট হওয়ার কারণে নয়; বরং একসাথে সবার ভারী ব্যবহারের যানজটে হয়।",
    },
    exploreMore: {
      en: "Rebalance a busy Gulshan tower sector yourself in Dhaka Trail 4 (The Busy Network).",
      bn: "ঢাকা ট্রেইল ৪ (ব্যস্ত নেটওয়ার্ক)-এ নিজেই একটি ব্যস্ত সেক্টরের লোড নিয়ন্ত্রণ করে দেখুন।",
    },
    advancedNote: {
      en: "Operators relieve persistent congestion by adding carrier aggregation spectrum (e.g., 1800 + 2100 + 2600 MHz), deploying small cells, and upgrading fiber backhaul.",
      bn: "নেটওয়ার্ক অপারেটররা ক্যারিয়ার অ্যাগ্রিগেশন, স্মল সেল ও ফাইবার আপগ্রেডের মাধ্যমে ব্যস্ত এলাকার যানজট কমায়।",
    },
    sourceAttribution: "Cellular Traffic Engineering & Queueing Basics",
    hotspots: [
      {
        id: "shared-pipe",
        label: { en: "Shared Radio Spectrum", bn: "শেয়ার্ড রেডিও স্পেকট্রাম" },
        explanation: {
          en: "Radio spectrum over a city block is finite—each active downloader takes time-frequency resource blocks.",
          bn: "একটি এলাকার বায়ুস্তরে রেডিও তরঙ্গের পরিমাণ সীমিত, যা সবাই ভাগ করে নেয়।",
        },
      },
      {
        id: "latency",
        label: { en: "Queue Latency Spike", bn: "ল্যাটেন্সি বৃদ্ধি" },
        explanation: {
          en: "Above 85% utilization, packets wait in queues—causing video buffering and sluggish page loads.",
          bn: "ব্যবহার ৮৫%-এর ওপরে উঠলে প্যাকেট অপেক্ষমাণ সারিতে আটকে যায় এবং বাফারিং শুরু হয়।",
        },
      },
    ],
  },
  {
    id: "robi-and-bdapps",
    order: 8,
    title: { en: "Robi and bdapps", bn: "রবি এবং বিডিঅ্যাপস (bdapps)" },
    summary: {
      en: "Explore how Robi’s mobile operator network connects with bdapps—a national telco API platform empowering local Bangladeshi developers to build SMS, OTP, and USSD apps.",
      bn: "রবির মোবাইল নেটওয়ার্ক কীভাবে bdapps প্ল্যাটফর্মের মাধ্যমে দেশীয় ডেভেলপারদের SMS, OTP ও USSD ভিত্তিক সেবা তৈরিতে সহায়তা করে তা জানুন।",
    },
    interactiveMode: "robi-bdapps",
    seeIt: {
      en: "Trace the live API pipeline: Student Developer App → bdapps API Gateway → Robi Operator Core → Citizen’s Mobile Handset.",
      bn: "শিক্ষার্থী ডেভেলপার অ্যাপ → bdapps এপিআই গেটওয়ে → রবি কোর → নাগরিকের ফোন পর্যন্ত প্রবাহ দেখুন।",
    },
    tryIt: {
      en: "Click an API Module (SMS Alert API, OTP Verification, or Subscription API) and run a sandbox call to watch JSON payloads flow end-to-end.",
      bn: "SMS, OTP অথবা Subscription এপিআই নির্বাচন করে স্যান্ডবক্স অনুরোধ চালিয়ে ফলাফল দেখুন।",
    },
    understandIt: {
      en: "Launched in 2014 under Robi, bdapps lowers barriers for students and startups across Bangladesh by providing telecom APIs and transparent user consent flows.",
      bn: "২০১৪ সালে চালু হওয়া bdapps বাংলাদেশের তরুণ ডেভেলপার ও উদ্যোক্তাদের সহজ টেলিকম এপিআই ও স্বচ্ছ গ্রাহক সম্মতি ব্যবস্থা প্রদান করে।",
    },
    exploreMore: {
      en: "Watch real bdapps developer walkthroughs in Videos & Tutorials or test the interactive API sandbox right here.",
      bn: "ভিডিও ও টিউটোরিয়াল পাতায় bdapps প্রশিক্ষণ দেখুন এবং এখানেই ইন্টারঅ্যাক্টিভ এপিআই স্যান্ডবক্স পরীক্ষা করুন।",
    },
    advancedNote: {
      en: "Modern bdapps integrations require explicit user consent, OTP confirmation, and straightforward unsubscribe triggers for every recurring service.",
      bn: "নিরাপদ সেবা নিশ্চিত করতে প্রতিটি সাবস্ক্রিপশনে স্পষ্ট সম্মতি, ওটিপি যাচাই এবং সহজ আনসাবস্ক্রাইব সুবিধা বাধ্যতামূলক।",
    },
    sourceAttribution: "bdapps Official Developer Portal (dev.bdapps.com) & Robi Axiata PLC",
    hotspots: [
      {
        id: "gateway",
        label: { en: "bdapps API Gateway", bn: "বিডিঅ্যাপস গেটওয়ে" },
        explanation: {
          en: "Translates simple HTTPS developer requests into secure telecom network signaling.",
          bn: "সহজ ওয়েব এপিআই অনুরোধকে নিরাপদ টেলিকম সিগন্যালে রূপান্তর করে।",
        },
      },
      {
        id: "consent",
        label: { en: "OTP & Consent Guard", bn: "ওটিপি ও সম্মতি সুরক্ষা" },
        explanation: {
          en: "Ensures users explicitly confirm services via OTP before any subscription activates.",
          bn: "যেকোনো সেবা চালুর আগে ওটিপি ও ব্যবহারকারীর স্পষ্ট সম্মতি নিশ্চিত করে।",
        },
      },
    ],
  },
  {
    id: "bangladesh-connectivity",
    order: 9,
    title: { en: "Bangladesh Digital Connectivity", bn: "বাংলাদেশের ডিজিটাল সংযোগ" },
    summary: {
      en: "Inspect verified national BTRC and BBS telecom statistics alongside the diverse geography of Bangladesh’s Chattogram, Dhaka, and Sylhet divisions.",
      bn: "বিটিআরসি ও বিবিএস-এর যাচাইকৃত জাতীয় পরিসংখ্যান এবং চট্টগ্রাম, ঢাকা ও সিলেট অঞ্চলের ভৌগোলিক সংযোগ বৈশিষ্ট্য দেখুন।",
    },
    interactiveMode: "bd-connectivity",
    seeIt: {
      en: "Explore the interactive schematic division map highlighting Bangladesh’s 3-city learning corridor and verified national subscriber figures.",
      bn: "বাংলাদেশের ৩ শহরের মানচিত্রে চট্টগ্রাম, ঢাকা ও সিলেটের ভৌগোলিক অবস্থান এবং জাতীয় সংযোগ পরিসংখ্যান দেখুন।",
    },
    tryIt: {
      en: "Select Chattogram, Dhaka, or Sylhet on the map to examine regional terrain challenges (port & hills, dense towers, river/haor wetlands).",
      bn: "মানচিত্রে চট্টগ্রাম, ঢাকা বা সিলেট নির্বাচন করে প্রতিটি অঞ্চলের নেটওয়ার্ক চ্যালেঞ্জ দেখুন।",
    },
    understandIt: {
      en: "As of BTRC August 2026 reports, Bangladesh has 191.09M mobile SIMs and 137.66M internet subscribers (122.26M mobile internet; 122.71M on 4G)—making mobile literacy vital nationwide.",
      bn: "বিটিআরসি (আগস্ট ২০২৬) অনুযায়ী দেশে ১৯.১১ কোটি মোবাইল সিম ও ১৩.৭৭ কোটি ইন্টারনেট গ্রাহক রয়েছে, যার ১২.২৩ কোটি মোবাইল ইন্টারনেট ব্যবহারকারী।",
    },
    exploreMore: {
      en: "Play missions across all three cities and earn your prototype certificate on the Certification page.",
      bn: "তিন শহরের সকল মিশন সম্পন্ন করে সনদপত্র পাতায় মূল্যায়ন পরীক্ষায় অংশ নিন।",
    },
    advancedNote: {
      en: "Only verified national BTRC and BBS indicators are cited here—individual district percentages are intentionally omitted unless published in an official survey.",
      bn: "এখানে শুধুমাত্র বিটিআরসি ও বিবিএস কর্তৃক প্রকাশিত যাচাইকৃত জাতীয় পরিসংখ্যান ব্যবহৃত হয়েছে।",
    },
    sourceAttribution: "BTRC (August 2026) & BBS ICT Household Survey",
    hotspots: [
      {
        id: "btrc",
        label: { en: "BTRC Aug 2026 Totals", bn: "বিটিআরসি আগস্ট ২০২৬" },
        explanation: {
          en: "191.09M mobile SIMs · 137.66M total internet · 122.26M mobile internet · 15.40M fixed broadband · 122.71M 4G users.",
          bn: "১৯.১১ কোটি মোবাইল সিম · ১৩.৭৭ কোটি মোট ইন্টারনেট · ১২.২৩ কোটি মোবাইল ইন্টারনেট · ১২.২৭ কোটি ৪জি গ্রাহক।",
        },
      },
      {
        id: "bbs",
        label: { en: "BBS Household Survey", bn: "বিবিএস পরিবার জরিপ" },
        explanation: {
          en: "99% household mobile ownership, 89.6% individual mobile use, 75.1% smartphone access, and 59.2% individual internet use (age 5+).",
          bn: "৯৯% পরিবারে মোবাইল ফোন, ৮৯.৬% ব্যক্তিগত ব্যবহার, ৭৫.১% স্মার্টফোন এবং ৫৯.২% ইন্টারনেট ব্যবহারকারী।",
        },
      },
    ],
  },
];
