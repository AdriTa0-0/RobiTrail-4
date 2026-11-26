import type { LocalizedText } from "../translations/dictionary";

export type TrailIconType =
  | "message-route"
  | "signal-tower"
  | "phone-rescue"
  | "data-meter"
  | "community-nodes"
  | "speed-vs-data"
  | "busy-sector"
  | "channel-choice"
  | "fault-trace"
  | "obstacle-wave"
  | "budget-slider"
  | "community-mesh"
  | "packet-stages"
  | "digital-clock"
  | "capstone-grid";

export interface TrailConfig {
  id: string;
  cityId: "chattogram" | "dhaka" | "sylhet";
  order: number;
  iconType: TrailIconType;
  title: LocalizedText;
  subtitle: LocalizedText;
  objective: LocalizedText;
  howToPlay: LocalizedText[];
  watchDemo: LocalizedText;
  tryPrompt: LocalizedText;
  discoverNote: LocalizedText;
  tip: LocalizedText;
  hintTarget: LocalizedText;
  hintAction: LocalizedText;
  handbookTopicId: string;
  isPremium: boolean;
  worldAnchor: [number, number, number];
  landmarkLabel: LocalizedText;
  nextTeaser?: {
    text: LocalizedText;
    targetCityId: "chattogram" | "dhaka" | "sylhet";
    targetTrailId: string;
  };
}

export const TRAILS: TrailConfig[] = [
  // CHATTOGRAM — 4 TRAILS (3D Interactive Signal Mystery & Street Routing Games)
  {
    id: "ctg-1",
    cityId: "chattogram",
    order: 1,
    iconType: "message-route",
    title: {
      en: "Robi Sheba — The Missing Signal Case",
      bn: "রবি সেবা — হারিয়ে যাওয়া সিগন্যাল রহস্য",
    },
    subtitle: {
      en: "Chattogram Port-Street Signal Investigation",
      bn: "চট্টগ্রাম বন্দর-সড়ক সিগন্যাল অনুসন্ধান",
    },
    objective: {
      en: "Explore the Chattogram street with your RF probe, inspect 4 clues, and file the right Robi Sheba support ticket.",
      bn: "আরএফ প্রোব নিয়ে চট্টগ্রাম সড়ক ঘুরে ৪টি সূত্র পরীক্ষা করুন এবং রবি সেবায় সঠিক অভিযোগ দাখিল করুন।",
    },
    howToPlay: [
      {
        en: "Walk with WASD / mobile joystick (or click the street) to inspect Rahman Telecom, the Fiber Cabinet, the Hillside Alley, and the Warehouse Log.",
        bn: "WASD বা জয়স্টিক দিয়ে হেঁটে দোকান, ফাইবার ক্যাবিনেট, পাহাড়ি গলি ও গুদামের লগ পরীক্ষা করুন।",
      },
      {
        en: "Watch your live dBm probe drop behind the retaining wall shadow while SIM & fiber remain healthy.",
        bn: "গলিতে সিগন্যাল -১০৬ dBm-এ নেমে যাওয়া লক্ষ্য করুন যেখানে সিম ও ফাইবার ঠিক রয়েছে।",
      },
      {
        en: "Open the Robi Sheba 121 Desk and submit the matching Coverage Ticket diagnosis.",
        bn: "রবি সেবা ১২১ ডেস্কে গিয়ে সঠিক নেটওয়ার্ক কভারেজ টিকিট দাখিল করুন।",
      },
    ],
    watchDemo: {
      en: "A weak bar icon does not always mean a broken SIM—walk into the shadowed alley to compare open-street vs blocked dBm readings.",
      bn: "দুর্বল সিগন্যাল মানেই সিম নষ্ট নয়; খোলা সড়ক ও দেয়ালের আড়ালের গলির সিগন্যাল পার্থক্য দেখুন।",
    },
    tryPrompt: {
      en: "Step toward the glowing Practice RF Post beside you first, then walk to Rahman Telecom Shop.",
      bn: "প্রথমে পাশের উজ্জ্বল প্র্যাকটিস পোস্ট পরীক্ষা করুন, তারপর রহমান টেলিকম দোকানে যান।",
    },
    discoverNote: {
      en: "Using My Robi App self-checks and 121 coverage tickets solves localized RF shadow issues faster than unneeded SIM swaps.",
      bn: "মাই রবি অ্যাপ ও ১২১-এর মাধ্যমে সঠিক কভারেজ টিকিট করলে অযথা সিম পরিবর্তন ছাড়াই দ্রুত সমাধান মেলে।",
    },
    tip: {
      en: "Compare the shopkeeper’s healthy SIM check and fiber cabinet reading with the weak alley dBm probe.",
      bn: "দোকানের সুস্থ সিম ও ফাইবার রিডিংয়ের সাথে পাহাড়ি গলির দুর্বল সিগন্যাল মিলিয়ে দেখুন।",
    },
    hintTarget: {
      en: "Target Highlight: Visit the 4 amber stations around the street before walking to the Robi Sheba 121 Booth on the southeast corner.",
      bn: "টার্গেট নির্দেশ: দক্ষিণ-পূর্ব কোণের রবি সেবা ১২১ বুথে যাওয়ার আগে রাস্তার ৪টি সূত্র দেখুন।",
    },
    hintAction: {
      en: 'Next Action: Gather ≥3 clues, open Robi Sheba Desk, select "Localized Hillside RF Coverage Shadow", and choose My Robi / 121 Coverage Ticket.',
      bn: 'পরবর্তী কাজ: অন্তত ৩টি সূত্র সংগ্রহ করে "পাহাড়ি গলির আরএফ সিগন্যাল ছায়া" ও "১২১/মাই রবি কভারেজ টিকিট" জমা দিন।',
    },
    handbookTopicId: "why-signal-changes",
    isPremium: false,
    worldAnchor: [-7, 2.5, -5],
    landmarkLabel: { en: "Agrabad Hillside Street", bn: "আগ্রাবাদ পাহাড়ি সড়ক" },
    nextTeaser: {
      text: {
        en: "Next up: Route rooftop relays over Chattogram water tanks...",
        bn: "পরবর্তী ধাপ: চট্টগ্রামের ছাদজুড়ে রিলে নেটওয়ার্ক ধাঁধা...",
      },
      targetCityId: "chattogram",
      targetTrailId: "ctg-2",
    },
  },
  {
    id: "ctg-2",
    cityId: "chattogram",
    order: 2,
    iconType: "signal-tower",
    title: { en: "Rooftop Network Puzzle", bn: "ছাদের নেটওয়ার্ক ধাঁধা" },
    subtitle: { en: "Elevated Chattogram Line-of-Sight Relay", bn: "বহুতল ছাদজুড়ে রিলে সংযোগ ধাঁধা" },
    objective: {
      en: "Reposition Relay Alpha & Relay Beta across rooftops and aim/lift their dishes around water tanks to link both target roofs.",
      bn: "পানির ট্যাংক ও সিঁড়িঘরের বাধা এড়িয়ে ছাদে রিলে আলফা ও বিটা বসিয়ে এবং ঘুরিয়ে দুটি লক্ষ্য ছাদেই সংযোগ দিন।",
    },
    howToPlay: [
      {
        en: "Swipe open sky/buildings to inspect roof gaps; drag Relay Alpha and Relay Beta onto clear concrete tiles (orbit locks while dragging).",
        bn: "ফাঁকা জায়গায় ঘুরিয়ে ছাদ দেখুন; রিলে আলফা ও বিটা টেনে খোলা ছাদে বসান।",
      },
      {
        en: "Select a relay and use Aim Left / Aim Right / Tall Mast at the bottom to steer the beam clear of water tanks.",
        bn: "নিচের বাটন দিয়ে রিলে ডিশ ঘুরান ও মাস্তুল উঁচু করে পানির ট্যাংকের বাধা পেরোন।",
      },
      {
        en: "Turn both the Coastal Clinic and Harbour Dormitory rooftop beacons emerald green.",
        bn: "ক্লিনিক ও ডরমিটরি—উভয় লক্ষ্য ছাদের বাতি সবুজ হলে মিশন সম্পন্ন হবে।",
      },
    ],
    watchDemo: {
      en: "High-frequency directional relays cannot pierce steel water tanks or stair bulkheads; watch red impact spheres show exact block points.",
      bn: "উঁচু পানির ট্যাংক বা সিঁড়িঘর সিগন্যাল আটকে দিলে লাল বিন্দুতে বাধা দেখা যায়।",
    },
    tryPrompt: {
      en: "Drag or rotate the glowing Practice Tripod on the back-left roof terrace first.",
      bn: "প্রথমে বাম দিকের প্র্যাকটিস ট্রাইপডটি টেনে বা ঘুরিয়ে নিয়ন্ত্রণ বুঝে নিন।",
    },
    discoverNote: {
      en: "Multi-hop rooftop relays bounce directional line-of-sight beams neatly around tall urban obstructions.",
      bn: "বহু-ধাপ রিলে ব্যবহার করলে উঁচু ভবন বা ট্যাংকের আড়ালেও নিরাপদে সিগন্যাল পৌঁছে দেওয়া যায়।",
    },
    tip: {
      en: "Keep Relay Alpha clear on the northern edge of Terrace A/B so it sees the West Source and bounces cleanly to Relay Beta on the East roof.",
      bn: "রিলে আলফাকে উত্তর-মধ্য খোলা অংশে বসান যেন তা পশ্চিম উৎস থেকে রিলে বিটা হয়ে উভয় লক্ষ্য ছাদ দেখতে পায়।",
    },
    hintTarget: {
      en: "Target Highlight: Look at the red impact sphere on the Water Tank Tower—route Relay Alpha north of the tank and Relay Beta near the East Dorm roof.",
      bn: "টার্গেট নির্দেশ: পানির ট্যাংকের লাল বাধা এড়িয়ে আলফাকে উত্তর দিকে ও বিটাকে পূর্ব দিকের ছাদে রাখুন।",
    },
    hintAction: {
      en: "Next Action: Place Relay Alpha on clear north roof tiles aimed toward Relay Beta, lift mast if clipped, and aim Relay Beta toward the Dorm & Clinic.",
      bn: "পরবর্তী কাজ: আলফাকে বিটার দিকে ঘোরান, প্রয়োজনে Tall Mast চালু করুন এবং বিটাকে লক্ষ্য ছাদের দিকে তাক করুন।",
    },
    handbookTopicId: "why-signal-changes",
    isPremium: false,
    worldAnchor: [7, 4.5, -6],
    landmarkLabel: { en: "Foy’s Ridge Rooftops", bn: "ফয়েজ রিজ ছাদ এলাকা" },
    nextTeaser: {
      text: {
        en: "Final Chattogram trial: Steer packets down the busy Harbour Pier...",
        bn: "চট্টগ্রামের শেষ মিশন: বন্দর পিয়ার ধরে প্যাকেট ধাওয়া...",
      },
      targetCityId: "chattogram",
      targetTrailId: "ctg-3",
    },
  },
  {
    id: "ctg-3",
    cityId: "chattogram",
    order: 3,
    iconType: "phone-rescue",
    title: { en: "Harbour Packet Chase", bn: "বন্দর প্যাকেট ধাওয়া" },
    subtitle: {
      en: "Chattogram Port Pier High-Speed Steering",
      bn: "চট্টগ্রাম বন্দর পিয়ারে প্যাকেট স্টিয়ারিং",
    },
    objective: {
      en: "Pilot the Packet Carrier Drone down the 240m Chattogram Harbour Pier to the Gateway while dodging cranes, cargo trucks, and interference.",
      bn: "ক্রেন, কার্গো ট্রাক ও ইন্টারফেরেন্স এড়িয়ে ২৪০ মিটার চট্টগ্রাম বন্দর পিয়ার পেরিয়ে গেটওয়েতে প্যাকেট পৌঁছে দিন।",
    },
    howToPlay: [
      {
        en: "Use A / D or Left / Right keys (or mobile steer buttons) to weave around containers, patrolling lorries, and swinging gantry crane spreaders.",
        bn: "A/D বা তীর চিহ্ন (অথবা মোবাইল বাটন) দিয়ে কন্টেইনার, চলন্ত ট্রাক ও ক্রেনের হুক এড়িয়ে চলুন।",
      },
      {
        en: "Hold W / Boost button for speed bursts and steer through emerald Boost Rings to repair packet integrity.",
        bn: "গতি বাড়াতে W/বুস্ট ধরুন এবং প্যাকেট সুরক্ষা বাড়াতে সবুজ রিং সংগ্রহ করুন।",
      },
      {
        en: "Reach the emerald Harbour Gateway at the far end of the pier before packet integrity drops to zero.",
        bn: "প্যাকেট সুরক্ষা শূন্য হওয়ার আগেই বন্দরের শেষ প্রান্তের সবুজ গেটওয়েতে পৌঁছান।",
      },
    ],
    watchDemo: {
      en: "Just like real harbour wireless links, moving steel containers and radar interference corrupt packets unless error-correction boosts restore integrity.",
      bn: "বাস্তব বন্দরের মতোই লোহার কন্টেইনার ও রাডার ইন্টারফেরেন্স প্যাকেট দুর্বল করে; বুস্ট রিং তা পুনরুদ্ধার করে।",
    },
    tryPrompt: {
      en: "Steer smoothly through the glowing cyan Practice Gate at the start of the pier.",
      bn: "পিয়ারের শুরুতেই নীল প্র্যাকটিস গেটের ভেতর দিয়ে চালিয়ে যান।",
    },
    discoverNote: {
      en: "Forward error correction and clear directional lanes keep live maritime telemetry intact past heavy port interference.",
      bn: "ত্রুটি সংশোধন ও নিরাপদ চ্যানেল বন্দর এলাকার প্রবল বাধার মধ্যেও দ্রুত ডেটা পৌঁছে দেয়।",
    },
    tip: {
      en: "Watch gantry crane trolleys glide side-to-side ahead—pass behind the swinging orange cargo crate.",
      bn: "সামনের গ্যান্ট্রি ক্রেনের দুলতে থাকা কমলা বক্সের গতি দেখে নিরাপদ লেন বেছে নিন।",
    },
    hintTarget: {
      en: "Target Highlight: Look ahead for glowing green Boost Rings (+12% Integrity) and avoid pulsing amber floor rings.",
      bn: "টার্গেট নির্দেশ: সবুজ বুস্ট রিং (+১২% সুরক্ষা) ধরুন এবং মেঝের হলুদ ইন্টারফেরেন্স বৃত্ত এড়িয়ে যান।",
    },
    hintAction: {
      en: "Next Action: Steer steadily left/right around slow trucks, skip risky lanes inside amber interference zones, and cross the Harbour Gateway.",
      bn: "পরবর্তী কাজ: ট্রাক ও হলুদ অঞ্চল পাশ কাটিয়ে স্থিরভাবে চালান এবং শেষ প্রান্তের বন্দর গেটওয়ে পার হন।",
    },
    handbookTopicId: "how-tower-works",
    isPremium: false,
    worldAnchor: [0, 2, 7],
    landmarkLabel: { en: "Karnaphuli Harbour Pier", bn: "কর্ণফুলী বন্দর পিয়ার" },
    nextTeaser: {
      text: {
        en: "Bonus Chattogram route: Trace all 5 checkpoints in The Message Journey...",
        bn: "চট্টগ্রামের আরেকটি মিশন: দ্য মেসেজ জার্নিতে ৫টি ধাপ জুড়ে সিগন্যাল পাঠান...",
      },
      targetCityId: "chattogram",
      targetTrailId: "ctg-4",
    },
  },
  {
    id: "ctg-4",
    cityId: "chattogram",
    order: 4,
    iconType: "message-route",
    title: { en: "The Message Journey", bn: "বার্তার যাত্রাপথ" },
    subtitle: { en: "3D Street Network Routing", bn: "৩ডি সড়ক নেটওয়ার্ক রাউটিং" },
    objective: {
      en: "Connect the 5-hop route across Agrabad street and launch the message packet to the receiving phone.",
      bn: "আগ্রাবাদ সড়কের ৫টি ধাপ যুক্ত করে গ্রাহক ফোনে বার্তা প্যাকেট পাঠান।",
    },
    howToPlay: [
      {
        en: "Walk with WASD or click the street toward each glowing ring and click it (or click Operate).",
        bn: "WASD বা ক্লিক করে প্রতিটি জ্বলন্ত রিংয়ের কাছে যান এবং সরাসরি ক্লিক বা অপারেট চাপুন।",
      },
      {
        en: "Activate hops in order: Sender Phone → Agrabad Tower → Core Hub → Patenga Tower → Receiver.",
        bn: "প্রেরক ফোন → আগ্রাবাদ টাওয়ার → কোর হাব → পতেঙ্গা টাওয়ার → গ্রাহক ক্রমে যুক্ত করুন।",
      },
      {
        en: "Click Launch Packet and watch it fly across the 3D skyline.",
        bn: "প্যাকেট পাঠান এবং ৩ডি আকাশপথে তার যাত্রা দেখুন।",
      },
    ],
    watchDemo: {
      en: "Signals never jump phone-to-phone across a city; watch how each hop relays upward to a tower, through fiber core, and down again.",
      bn: "ফোন সরাসরি দূরে বার্তা পাঠাতে পারে না; প্রতিটি সংকেত টাওয়ার ও কোর হাব হয়ে গন্তব্যে যায়।",
    },
    tryPrompt: {
      en: "Step onto the left Sender Phone pad first—look for the glowing ring.",
      bn: "প্রথমে বাম দিকের প্রেরক ফোনের সবুজ-কমলা রিংয়ের কাছে যান।",
    },
    discoverNote: {
      en: "Every call or chat takes a last-mile wireless hop to a local tower before riding underground fiber through the core.",
      bn: "প্রতিটি কল বা চ্যাট প্রথমে বেতার তরঙ্গে টাওয়ারে ওঠে এবং পরে ফাইবার কোর হয়ে অন্য প্রান্তে নামে।",
    },
    tip: {
      en: "Follow the numbered sequence from left (Sender) to right (Receiver) without skipping the Core Switching Hub.",
      bn: "বাম থেকে ডানে ধারাবাহিক ক্রম অনুসরণ করুন এবং কোর সুইচিং হাব বাদ দেবেন না।",
    },
    hintTarget: {
      en: "Target Highlight: Look for the pulsing cyan beacon at the next unlinked station along the Agrabad street.",
      bn: "টার্গেট নির্দেশ: রাস্তার পরবর্তী অসংযুক্ত স্টেশনের উজ্জ্বল নীল বিকনের দিকে এগিয়ে যান।",
    },
    hintAction: {
      en: "Next Action: Click the ground beside the highlighted station (or walk with WASD), then click the station or Operate to lock the hop.",
      bn: "পরবর্তী কাজ: চিহ্নিত স্টেশনের পাশে হেঁটে গিয়ে অপারেট বা সরাসরি স্টেশনে ক্লিক করুন।",
    },
    handbookTopicId: "how-tower-works",
    isPremium: false,
    worldAnchor: [-7, 2.5, -5],
    landmarkLabel: { en: "Agrabad Relay Street", bn: "আগ্রাবাদ রিলে সড়ক" },
    nextTeaser: {
      text: {
        en: "Next city: Dhaka — The Digital Control City...",
        bn: "পরবর্তী শহর: ঢাকা — ডিজিটাল কন্ট্রোল সিটি...",
      },
      targetCityId: "dhaka",
      targetTrailId: "dhk-1",
    },
  },

  // DHAKA — 5 TRAILS
  {
    id: "dhk-1",
    cityId: "dhaka",
    order: 5,
    iconType: "data-meter",
    title: { en: "Data Detective", bn: "ডেটা গোয়েন্দা" },
    subtitle: {
      en: "3D Dhaka Apartment Network & Speed Audit",
      bn: "৩ডি ঢাকা অ্যাপার্টমেন্ট নেটওয়ার্ক ও গতি অডিট",
    },
    objective: {
      en: "Audit all 4 Dhaka apartment stations (Smartphone, Workstation, Wi-Fi Router, Smart TV) to cut daily drain from 1,440 MB to ≤ 350 MB AND boost study speed to ≥ 12 Mbps.",
      bn: "ঢাকা অ্যাপার্টমেন্টের ৪টি স্টেশন (স্মার্টফোন, ওয়ার্কস্টেশন, ওয়াই-ফাই রাউটার, স্মার্ট টিভি) পরীক্ষা করে দৈনিক ডেটা খরচ ১,৪৪০ MB থেকে ≤ ৩৫০ MB এবং স্টাডি গতি ≥ ১২ Mbps-এ আনুন।",
    },
    howToPlay: [
      {
        en: "Inspect all 4 room stations: Desk Smartphone, Telemetry Workstation, Wi-Fi Fiber Router, and Smart TV Corner.",
        bn: "বাসার ৪টি স্টেশনই পরীক্ষা করুন: ডেস্ক স্মার্টফোন, ওয়ার্কস্টেশন, ওয়াই-ফাই রাউটার ও স্মার্ট টিভি কর্নার।",
      },
      {
        en: "Stop hotspot tethering, move Smart TV to Fiber, switch Router to 5 GHz, enable Study QoS, and lower video resolution.",
        bn: "হটস্পট বন্ধ করুন, স্মার্ট টিভি ফাইবারে নিন, রাউটার ৫ GHz-এ সেট করুন, স্টাডি QoS চালু করুন এবং ভিডিও মান কমান।",
      },
      {
        en: "Keep Essential Live Class & Study PDFs active, then click Verify & Lock Plan once MB ≤ 350 and Mbps ≥ 12.",
        bn: "জরুরি লাইভ ক্লাস ও স্টাডি পিডিএফ চালু রেখে ≤ ৩৫০ MB এবং ≥ ১২ Mbps নিশ্চিত করে পরিকল্পনা যাচাই করুন।",
      },
    ],
    watchDemo: {
      en: "Watch crimson overhead packet cubes shrink as you eliminate leaks and emerald fiber pulses accelerate toward 12+ Mbps.",
      bn: "অতিরিক্ত ডেটা খরচ কমালে লাল প্যাকেটগুলো কীভাবে কমে এবং ৫ GHz ও QoS দিলে ফাইবার গতি কীভাবে বাড়ে তা দেখুন।",
    },
    tryPrompt: {
      en: "Walk to any of the 4 glowing stations in the Dhaka apartment to begin your 0/4 hardware audit.",
      bn: "অডিট শুরু করতে ঢাকা অ্যাপার্টমেন্টের ৪টি উজ্জ্বল স্টেশনের যেকোনো একটিতে যান।",
    },
    discoverNote: {
      en: "Stopping TV mobile hotspots, switching to clean 5 GHz Wi-Fi with Study QoS, and scheduling cloud sync rescues both quota and live lecture speed.",
      bn: "টিভি হটস্পট বন্ধ, ৫ GHz ওয়াই-ফাই ও স্টাডি QoS ব্যবহার করলে ডেটা প্যাক বাঁচে এবং লাইভ ক্লাসের গতিও বহুগুণ বাড়ে।",
    },
    tip: {
      en: "You must visit all 4 stations (Phone, Workstation, Router, Smart TV) and achieve BOTH ≤ 350 MB and ≥ 12 Mbps.",
      bn: "৪টি স্টেশনই ভিজিট করে ≤ ৩৫০ MB খরচ এবং ≥ ১২ Mbps গতি—উভয় লক্ষ্য পূরণ করতে হবে।",
    },
    hintTarget: {
      en: "Target Highlight: Check the Smart TV Hotspot Corner, 5 GHz Router Band, and Workstation Study QoS.",
      bn: "টার্গেট নির্দেশ: স্মার্ট টিভি হটস্পট, ৫ GHz রাউটার ব্যান্ড এবং ওয়ার্কস্টেশন স্টাডি QoS পরীক্ষা করুন।",
    },
    hintAction: {
      en: "Next Action: Audit all 4 stations, turn off Phone/TV hotspot drains, set 5 GHz + Study QoS, choose 480p/360p, and verify.",
      bn: "পরবর্তী কাজ: ৪টি স্টেশন অডিট করুন, হটস্পট ও অটোপ্লে বন্ধ করুন, ৫ GHz ও স্টাডি QoS দিয়ে যাচাই করুন।",
    },
    handbookTopicId: "what-is-mobile-data",
    isPremium: false,
    worldAnchor: [-8, 3.5, -5],
    landmarkLabel: { en: "Motijheel Data Exchange", bn: "মতিঝিল ডেটা এক্সচেঞ্জ" },
  },
  {
    id: "dhk-2",
    cityId: "dhaka",
    order: 6,
    iconType: "community-nodes",
    title: { en: "Connected Everyday", bn: "নিত্যদিনের সংযোগ" },
    subtitle: {
      en: "3D Hatirjheel Citizen Handset Dispatch",
      bn: "৩ডি হাতিরঝিল নাগরিক সংযোগ মিশন",
    },
    objective: {
      en: "Walk across the 3D Hatirjheel plaza to 4 citizens, operate their pocket handsets, and fire the right link to the plaza tower.",
      bn: "৩ডি হাতিরঝিল চত্বরে ৪ জন নাগরিকের কাছে গিয়ে তাদের হ্যান্ডসেট পরিচালনা করুন এবং টাওয়ারে সঠিক সংযোগ পাঠান।",
    },
    howToPlay: [
      {
        en: "Walk or click to reach all 4 citizen booths around the plaza trees.",
        bn: "প্লাজার গাছ ও কিয়স্ক পাশ কাটিয়ে ৪টি নাগরিক বুথে যান।",
      },
      {
        en: "Operate their handset tool (Illustrative USSD Demo, SMS, Voice Call, or 4G Class) suited to their situation.",
        bn: "প্রত্যেকের নেটওয়ার্ক অবস্থা বুঝে উপযুক্ত হ্যান্ডসেট টুলটি চালান।",
      },
      {
        en: "Watch each citizen’s link beam turn emerald toward the plaza tower.",
        bn: "প্রতিটি সফল সংযোগ টাওয়ারের সাথে সবুজ রশ্মিতে যুক্ত হতে দেখুন।",
      },
    ],
    watchDemo: {
      en: "Each Dhaka resident faces a different constraint—offline balance checks, quick pickup texts, urgent audio, or live video.",
      bn: "প্রত্যেক নাগরিকের পরিস্থিতি আলাদা—অফলাইন ব্যালেন্স, সংক্ষিপ্ত টেক্সট, জরুরি কথা বা লাইভ ভিডিও ক্লাস।",
    },
    tryPrompt: {
      en: "Start at the Elderly Passenger booth on the southwest corner.",
      bn: "প্রথমে দক্ষিণ-পশ্চিম কোণে প্রবীণ যাত্রীর বুথে যান।",
    },
    discoverNote: {
      en: "Matching the lightest reliable service (SMS/USSD/Voice vs 4G video) keeps every member of a community connected.",
      bn: "সঠিক সময়ে সহজ ও নির্ভরযোগ্য মাধ্যম বেছে নিলে সবাই নিরবচ্ছিন্নভাবে যুক্ত থাকতে পারে।",
    },
    tip: {
      en: "Think about whether the person has mobile internet enabled or needs instant voice/offline text.",
      bn: "ব্যক্তির কাছে ইন্টারনেট চালু আছে কিনা এবং কী ধরনের বার্তা জরুরি তা খেয়াল করুন।",
    },
    hintTarget: {
      en: "Target Highlight: Amber/Cyan rings mark citizens still waiting for handset dispatch.",
      bn: "টার্গেট নির্দেশ: যেসব নাগরিকের বুথ এখনো অসংযুক্ত তাদের রিংগুলো উজ্জ্বল দেখাচ্ছে।",
    },
    hintAction: {
      en: "Next Action: Offline SIM prompt → Demo USSD; Offline Bus ETA → SMS; Urgent Medicine Call → Voice; Live Tuition → 4G Video.",
      bn: "পরবর্তী কাজ: অফলাইন তথ্য → ডেমো USSD; বাস সময় → SMS; জরুরি কল → ভয়েস; অনলাইন ক্লাস → 4G ভিডিও।",
    },
    handbookTopicId: "sms-voice-data",
    isPremium: false,
    worldAnchor: [7, 2.5, -7],
    landmarkLabel: { en: "Hatirjheel Community Plaza", bn: "হাতিরঝিল কমিউনিটি প্লাজা" },
  },
  {
    id: "dhk-3",
    cityId: "dhaka",
    order: 7,
    iconType: "speed-vs-data",
    title: { en: "Speed or Data?", bn: "গতি নাকি ডেটা?" },
    subtitle: {
      en: "Animated Dual-Smartphone Download Race",
      bn: "দুটি স্মার্টফোনের অ্যানিমেটেড ডাউনলোড পরীক্ষা",
    },
    objective: {
      en: "Race Phone A and Phone B downloading the same file at different Mbps speeds to prove speed changes wait time, not total MB.",
      bn: "দুটি স্মার্টফোনে ভিন্ন গতিতে একই ফাইল ডাউনলোড করে প্রমাণ করুন—গতি সময় কমায়, কিন্তু মোট ডেটা খরচ বদলায় না।",
    },
    howToPlay: [
      {
        en: "Adjust the shared File Size (MB) and set Phone A & Phone B to two different Mbps speeds.",
        bn: "একটি ফাইল সাইজ (MB) নিন এবং ফোন এ ও ফোন বি-তে ভিন্ন গতি (Mbps) সেট করুন।",
      },
      {
        en: "Press Start Dual Download and watch packets race down both phones simultaneously.",
        bn: "যৌথ ডাউনলোড শুরু করুন এবং দুটি ফোনের প্রবাহ দেখুন।",
      },
      {
        en: "Lock in the proven rule once both phones finish transferring identical megabytes.",
        bn: "উভয় ফোনের ডাউনলোড শেষ হলে ফলাফল যাচাই করে উত্তর নিশ্চিত করুন।",
      },
    ],
    watchDemo: {
      en: "Two phones fetch the same 160 MB science archive: a 40 Mbps link finishes 4× sooner than 10 Mbps, yet both tally 160 MB.",
      bn: "৪০ Mbps সংযোগ ১০ Mbps-এর চেয়ে ৪ গুণ দ্রুত ফাইল নামায়, তবে দুটি ফোনেই ১৬০ MB খরচ হয়।",
    },
    tryPrompt: {
      en: "Set Phone B faster than Phone A (e.g., 10 Mbps vs 40 Mbps) and hit Start Dual Download.",
      bn: "ফোন এ (১০ Mbps) এবং ফোন বি (৪০ Mbps) রেখে ডাউনলোড রেস চালু করুন।",
    },
    discoverNote: {
      en: "Theoretical Download Time = (File Size MB × 8) ÷ Speed Mbps. Higher speed delivers bits sooner; file size determines megabytes used.",
      bn: "তাত্ত্বিক সময় = (ফাইল সাইজ MB × ৮) ÷ গতি Mbps। বেশি গতি সময় বাঁচায়, ডেটার পরিমাণ নয়।",
    },
    tip: {
      en: "Make sure Phone A and Phone B have different Mbps speeds before running the race so you can verify the contrast.",
      bn: "পার্থক্য পরিষ্কার দেখতে ফোন এ এবং ফোন বি-র গতি আলাদা রাখুন।",
    },
    hintTarget: {
      en: 'Target Highlight: Look at both phones’ "Total MB Consumed" counters after the bars hit 100%.',
      bn: 'টার্গেট নির্দেশ: রেস শেষ হওয়ার পর উভয় ফোনের "মোট ব্যবহৃত ডেটা (MB)" মিটার দেখুন।',
    },
    hintAction: {
      en: 'Next Action: Run the race with unequal speeds, inspect both completion readouts, then select "Faster Mbps saves time; MB stays equal".',
      bn: "পরবর্তী কাজ: ভিন্ন গতিতে রেস চালিয়ে ফলাফল দেখুন, তারপর সঠিক সিদ্ধান্তটি বাছাই করুন।",
    },
    handbookTopicId: "speed-vs-data",
    isPremium: false,
    worldAnchor: [-6, 3, 6],
    landmarkLabel: { en: "Metro Viaduct Speed Lab", bn: "মেট্রো ভায়াডাক্ট স্পিড ল্যাব" },
  },
  {
    id: "dhk-4",
    cityId: "dhaka",
    order: 8,
    iconType: "busy-sector",
    title: { en: "The Busy Network", bn: "ব্যস্ত নেটওয়ার্ক" },
    subtitle: { en: "3D Gulshan Sector Load Balancing", bn: "৩ডি গুলশান সেক্টর লোড নিয়ন্ত্রণ" },
    objective: {
      en: "Walk across the 3D Gulshan block to heavy user hubs and bring evening sector load down below 75% capacity.",
      bn: "৩ডি গুলশান ব্লকের ব্যস্ত ভবনগুলোতে গিয়ে সেক্টরের চাপ ৭৫%-এর নিচে নামিয়ে আনুন।",
    },
    howToPlay: [
      {
        en: "Navigate around building blocks to visit the 4K Showroom, Office Backup Server, and Student Study Cafe.",
        bn: "ভবনের মাঝ দিয়ে হেঁটে ৪কে শোরুম, অফিস ব্যাকআপ সার্ভার ও স্টাডি ক্যাফেতে যান।",
      },
      {
        en: "Operate console switches (cap 4K→480p, schedule backups off-peak) while watching the 3D tower capacity ring.",
        bn: "৪কে ভিডিও মান কমান এবং ব্যাকআপ রাতের অফ-পিক সময়ে সরিয়ে নিন।",
      },
      {
        en: "Verify the Central Tower ring turns emerald (< 75% load) without cutting off students.",
        bn: "শিক্ষার্থীর ক্লাস সচল রেখেই কেন্দ্রীয় টাওয়ারের চাপ সবুজ স্তরে নামান।",
      },
    ],
    watchDemo: {
      en: "Red traffic pulses jam the central Gulshan mast above 100% until heavy non-urgent streams are capped or rescheduled.",
      bn: "সন্ধ্যার অতিরিক্ত চাপে টাওয়ার লাল হয়ে যায়; অপ্রয়োজনীয় ভারী ট্রাফিক সরালেই আবার সবুজ গতি ফিরে আসে।",
    },
    tryPrompt: {
      en: "Walk to the pulsing red 4K Showroom or Office Server console first.",
      bn: "প্রথমে লাল রঙে জ্বলতে থাকা ৪কে শোরুম বা অফিস সার্ভারে যান।",
    },
    discoverNote: {
      en: "Cellular towers share radio bandwidth among nearby users—smoothing non-urgent peak traffic restores low latency for everyone.",
      bn: "টাওয়ারের রেডিও সক্ষমতা সবার মাঝে ভাগ হয়; অপ্রয়োজনীয় পিক-আওয়ার লোড কমালে সবার গতি বাড়ে।",
    },
    tip: {
      en: "Do not shut off the Student Cafe or Clinic! Trim heavy 4K TV displays and postpone Cloud Backups to night.",
      bn: "শিক্ষার্থী বা ক্লিনিকের সংযোগ বন্ধ করবেন না—শুধু ৪কে টিভি এবং রাতের ব্যাকআপ সামলান।",
    },
    hintTarget: {
      en: "Target Highlight: Both the 4K Showroom (NW) and Office Backup Server (NE) are drawing excess Mbps.",
      bn: "টার্গেট নির্দেশ: ৪কে শোরুম (উত্তর-পশ্চিম) এবং অফিস ব্যাকআপ সার্ভার (উত্তর-পূর্ব) অতিরিক্ত ব্যান্ডউইথ নিচ্ছে।",
    },
    hintAction: {
      en: "Next Action: Click/Operate at 4K Showroom → Cap to 480p; then at Office Server → Move Backups to 2 AM Off-Peak.",
      bn: "পরবর্তী কাজ: ৪কে শোরুমে গিয়ে ৪৮০পি নির্বাচন করুন এবং অফিস সার্ভারে রাত ২টার অফ-পিক চালু করুন।",
    },
    handbookTopicId: "network-congestion",
    isPremium: false,
    worldAnchor: [8, 3.5, 5],
    landmarkLabel: { en: "Gulshan Sector Hub", bn: "গুলশান সেক্টর হাব" },
  },
  {
    id: "dhk-5",
    cityId: "dhaka",
    order: 9,
    iconType: "channel-choice",
    title: { en: "Message or Internet?", bn: "এসএমএস নাকি ইন্টারনেট?" },
    subtitle: {
      en: "3D Transit & Ferry Terminal Handset Dispatch",
      bn: "৩ডি ফেরি ও ফার্মগেট টার্মিনাল চ্যানেল বাছাই",
    },
    objective: {
      en: "Operate citizen phones at 3 transit terminals—accepting all technically valid solutions for each connectivity zone.",
      bn: "৩টি ট্রানজিট টার্মিনালে গিয়ে নাগরিকের ফোন পরিচালনা করুন—প্রতিটি অবস্থায় একাধিক কার্যকর সমাধান গ্রহণযোগ্য।",
    },
    howToPlay: [
      {
        en: "Walk along the terminal pier to the 2G River Ferry, Campus Wi-Fi Kiosk, and Rainy Bus Shelter.",
        bn: "২জি নদী ফেরি, ক্যাম্পাস কিয়স্ক ও বৃষ্টির বাস ছাউনিতে যান।",
      },
      {
        en: "Select a technically reliable communication mode on each terminal’s handset console.",
        bn: "প্রতিটি টার্মিনালের সিগন্যাল অবস্থা দেখে কার্যকর মাধ্যম নির্বাচন করুন।",
      },
    ],
    watchDemo: {
      en: "Multiple channels can succeed when they fit the radio budget: on a 2G river ferry, both SMS and Voice beat failing 4G video.",
      bn: "একই পরিস্থিতিতে একাধিক সমাধান সঠিক হতে পারে—যেমন নদীতে ২জি থাকলে এসএমএস ও ভয়েস কল দুটোই কার্যকর।",
    },
    tryPrompt: {
      en: "Walk to the River Ferry Pier booth and inspect its signal strength.",
      bn: "নদী ফেরি ঘাটের বুথে গিয়ে সিগন্যাল অবস্থা পরীক্ষা করুন।",
    },
    discoverNote: {
      en: "Resilient communicators adapt to what the radio channel supports—lightweight SMS/Voice in weak zones, 4G/Wi-Fi for rich files.",
      bn: "বাস্তব পরিস্থিতিতে সংযোগের অবস্থা বুঝে হালকা SMS/ভয়েস বা পূর্ণাঙ্গ ইন্টারনেট ব্যবহার করাই বুদ্ধিমানের কাজ।",
    },
    tip: {
      en: "Every scenario accepts more than one valid channel if it matches the bandwidth available there.",
      bn: "প্রতিটি জায়গায় নেটওয়ার্ক অনুযায়ী একাধিক সঠিক মাধ্যম গ্রহণযোগ্য।",
    },
    hintTarget: {
      en: "Target Highlight: Three glowing terminal booths run along the water/terminal edge.",
      bn: "টার্গেট নির্দেশ: ঘাট ও টার্মিনাল বরাবর তিনটি জ্বলন্ত বুথ রয়েছে।",
    },
    hintAction: {
      en: "Next Action: Ferry Pier → SMS or Voice; Campus Kiosk → Internet Data; Elderly Bus Shelter → Voice or SMS.",
      bn: "পরবর্তী কাজ: ফেরি ঘাট → SMS বা ভয়েস; ক্যাম্পাস কিয়স্ক → ইন্টারনেট ডেটা; বাস ছাউনি → ভয়েস বা SMS।",
    },
    handbookTopicId: "sms-voice-data",
    isPremium: false,
    worldAnchor: [0, 4, -8],
    landmarkLabel: { en: "Farmgate Routing Gate", bn: "ফার্মগেট রাউটিং গেট" },
    nextTeaser: {
      text: { en: "The connection continues in Sylhet...", bn: "সংযোগের পরবর্তী অধ্যায় সিলেটে..." },
      targetCityId: "sylhet",
      targetTrailId: "syl-1",
    },
  },

  // SYLHET — 7 TRAILS (3D Interactive Operating Scenes)
  {
    id: "syl-1",
    cityId: "sylhet",
    order: 10,
    iconType: "fault-trace",
    title: { en: "The Lost Connection", bn: "হারানো সংযোগ" },
    subtitle: {
      en: "3D Surma Bridge Fiber Probe & Splicing",
      bn: "৩ডি সুরমা ব্রিজ ফাইবার প্রোব ও স্প্লাইসিং",
    },
    objective: {
      en: "Probe the 3D nodes across Keane Bridge to isolate the broken splice, run the 3-step Fiber Splicer, and pass an Optical Pulse.",
      bn: "৩ডি কিন ব্রিজ করিডোরের নোডগুলো প্রোব দিয়ে পরীক্ষা করুন, ভাঙা স্প্লাইস খুঁজে ৩-ধাপের ফিউশন স্প্লাইসার চালিয়ে অপটিক্যাল পালস পাঠান।",
    },
    howToPlay: [
      {
        en: "Walk to each of the 5 nodes along the Surma bridge corridor and click or Operate to probe.",
        bn: "ফোন থেকে সার্ভার পর্যন্ত প্রতিটি ৩ডি নোডে গিয়ে প্রোব পরীক্ষা চালান।",
      },
      {
        en: "At the failing Red Splice Manhole, operate the Fiber Splicer sequence: Strip → Align Cores → Arc Fuse.",
        bn: "ত্রুটিপূর্ণ লাল ম্যানহোলে গিয়ে স্ট্রিপ → অ্যালাইন → ফিউজ ধাপগুলো চালান।",
      },
      {
        en: "Fire the Optical Pulse Test to verify end-to-end restoration.",
        bn: "শেষে অপটিক্যাল পালস চালিয়ে পুরো রুট সবুজ নিশ্চিত করুন।",
      },
    ],
    watchDemo: {
      en: "A single severed underground fiber stops Core Routing and servers downstream, even while the Phone and Tower radio stays green.",
      bn: "ফোন ও টাওয়ার ঠিক থাকলেও একটি ভাঙা ফাইবার স্প্লাইসের পর থেকে কোর রাউটার ও সার্ভার বিচ্ছিন্ন হয়ে যায়।",
    },
    tryPrompt: {
      en: "Probe Phone Radio → Keane Tower → Surma Splice Box to locate the exact red fault.",
      bn: "প্রথমে ফোন রেডিও ও কিন টাওয়ার প্রোব করে লাল ত্রুটির স্থানটি নিশ্চিত করুন।",
    },
    discoverNote: {
      en: "Real telecom engineers trace faults hop-by-hop from the last green node before cutting open and precision-fusing hair-thin glass fiber.",
      bn: "বাস্তবে প্রকৌশলীরা শেষ সবুজ নোড থেকে ধাপে ধাপে ত্রুটি খুঁজে সূক্ষ্ম গ্লাস ফাইবার জোড়া লাগান।",
    },
    tip: {
      en: "You must probe at least through the broken Surma Fiber Splice box to unlock the Fusion Splicer chamber.",
      bn: "স্প্লাইসার চালু করতে হলে আগে প্রোব টুল দিয়ে সুরমা ফাইবার স্প্লাইস বক্স পরীক্ষা করুন।",
    },
    hintTarget: {
      en: "Target Highlight: Look for the amber/crimson manhole splice pit at the center of the bridge span.",
      bn: "টার্গেট নির্দেশ: সেতুর মাঝামাঝি থাকা ফাইবার স্প্লাইস ম্যানহোল বক্সটি লক্ষ্য করুন।",
    },
    hintAction: {
      en: "Next Action: Probe nodes 1–3, open the Splice Console, click Strip Cladding → Align Cores (align slider) → Arc Fuse, then Pulse Test.",
      bn: "পরবর্তী কাজ: নোড ১–৩ প্রোব করে স্প্লাইস কনসোলে স্ট্রিপ → অ্যালাইন → ফিউজ এবং পালস টেস্ট করুন।",
    },
    handbookTopicId: "tower-components-3d",
    isPremium: false,
    worldAnchor: [-7, 2.5, -4],
    landmarkLabel: { en: "Keane Bridge Fiber Node", bn: "কিন ব্রিজ ফাইবার নোড" },
  },
  {
    id: "syl-2",
    cityId: "sylhet",
    order: 11,
    iconType: "obstacle-wave",
    title: { en: "Signal and Obstacles", bn: "সিগন্যাল ও প্রতিবন্ধকতা" },
    subtitle: {
      en: "3D Zindabazar-Tilagarh RF Field Walk",
      bn: "৩ডি জিন্দাবাজার-টিলাগড় সিগন্যাল পরিমাপ",
    },
    objective: {
      en: "Carry the 3D handheld RF meter across 4 Sylhet terrain beacons around the Concrete Hall and Tilagarh Hill to map attenuation.",
      bn: "কংক্রিট হল ও টিলাগড় পাহাড়ের চারপাশে থাকা ৪টি বিমানে ৩ডি হ্যান্ডহেল্ড আরএফ মিটার নিয়ে গিয়ে সিগন্যালের মান মাপুন।",
    },
    howToPlay: [
      {
        en: "Walk physically with WASD or click ground between the 4 terrain beacons—the hill & hall act as solid colliders.",
        bn: "WASD বা ক্লিক করে ৪টি স্থানে যান; কংক্রিট ভবন ও টিলা বাস্তব বাধা হিসেবে কাজ করবে।",
      },
      {
        en: "At each beacon, click Log Reading (or Operate) while watching the 3D Tower-to-Player signal ray shift color.",
        bn: "প্রতিটি স্থানে গিয়ে অপারেট বা ক্লিক চেপে dBm মান রেকর্ড করুন এবং ৩ডি সিগন্যাল রশ্মির রং দেখুন।",
      },
    ],
    watchDemo: {
      en: "Observe the live beam turning green (-64 dBm) in open air, amber (-87 dBm) near concrete walls, and crimson (-106 dBm) behind the hill.",
      bn: "খোলা জায়গায় রশ্মি সবুজ, কংক্রিট ভবনের পেছনে হলুদ এবং টিলার আড়ালে লাল হয়ে যাওয়ার দৃশ্য দেখুন।",
    },
    tryPrompt: {
      en: "Walk to Zone 1 (Open Surma Lawn) and log your baseline dBm reading.",
      bn: "প্রথমে জোন ১ (খোলা মাঠ)-এ গিয়ে সিগন্যালের মূল মান রেকর্ড করুন।",
    },
    discoverNote: {
      en: "Terrain shadowing and dense concrete cause sharp signal drops—explaining why stepping outside or uphill instantly restores bars.",
      bn: "কংক্রিট ও পাহাড়-টিলা সিগন্যাল শোষণ করে—তাই খোলা জায়গায় এলে দ্রুত নেটওয়ার্ক ফিরে আসে।",
    },
    tip: {
      en: "Walk all the way around Tilagarh Ridge to reach the Valley Shadow beacon behind it.",
      bn: "টিলার পেছনের উপত্যকায় যেতে টিলার পাশ দিয়ে ঘুরে যান।",
    },
    hintTarget: {
      en: "Target Highlight: Any unvisited beacon ring glows amber across the Zindabazar courtyard and behind Tilagarh Hill.",
      bn: "টার্গেট নির্দেশ: জিন্দাবাজার চত্বর ও টিলার পেছনে থাকা অরেকর্ডকৃত রিংগুলোর দিকে যান।",
    },
    hintAction: {
      en: 'Next Action: Step onto each of the 4 beacons and click "Log Reading" or Operate to complete all 4 attenuation logs.',
      bn: 'পরবর্তী কাজ: ৪টি রিংয়েই পা রেখে অপারেট বা "Log Reading" বোতামে ক্লিক করুন।',
    },
    handbookTopicId: "why-signal-changes",
    isPremium: false,
    worldAnchor: [7, 2.5, -5],
    landmarkLabel: { en: "Zindabazar Signal Walk", bn: "জিন্দাবাজার সিগন্যাল ওয়াক" },
  },
  {
    id: "syl-3",
    cityId: "sylhet",
    order: 12,
    iconType: "budget-slider",
    title: { en: "Smart Data Choices", bn: "স্মার্ট ডেটা সিদ্ধান্ত" },
    subtitle: {
      en: "3D Tilagarh Student Hostel Desk Planner",
      bn: "৩ডি টিলাগড় শিক্ষার্থী হোস্টেল ডেটা ল্যাব",
    },
    objective: {
      en: "Operate the 3D hostel appliances (Video TV, Messaging Terminal, Study Tablet) so Nadia’s 2,000 MB weekly pack survives Day 7’s quiz.",
      bn: "৩ডি হোস্টেলের ডিভাইসগুলো পরিচালনা করে নাদিয়ার ২,০০০ MB প্যাক যেন ৭ম দিনের কুইজ পর্যন্ত টিকে থাকে তা নিশ্চিত করুন।",
    },
    howToPlay: [
      {
        en: "Walk to the Video Monitor, Phone Chat Desk, and Study Tablet around the hostel room.",
        bn: "হোস্টেল কক্ষে ভিডিও মনিটর, চ্যাট ডেস্ক ও স্টাডি ট্যাবলেটের কাছে যান।",
      },
      {
        en: "Operate each station: lower video to 360p, set chat media to Wi-Fi Only, and cache lecture PDFs offline.",
        bn: "ভিডিও ৩৬০পি করুন, চ্যাট অটো-ডাউনলোড বন্ধ করুন এবং অফলাইন পিডিএফ ক্যাশ চালু করুন।",
      },
      {
        en: "Trigger the 7-Day Simulator Wall Calendar to verify ≤ 2,000 MB total consumption.",
        bn: "দেয়ালের ৭ দিনের ক্যালেন্ডার সিমুলেটর চালিয়ে ২,০০০ MB-এর ভেতর থাকা নিশ্চিত করুন।",
      },
    ],
    watchDemo: {
      en: "Unchecked 720p video and group video auto-downloads burn 2,000 MB by Day 4—smart settings leave room for Day 7’s exam.",
      bn: "৭২০পি ভিডিও ও অটো-ডাউনলোড চালু থাকলে ৪ দিনেই প্যাক শেষ হয়ে যায়; স্মার্ট সেটিংসে পুরো ৭ দিন চলে।",
    },
    tryPrompt: {
      en: "Click/visit the Hostel Video Screen and Messaging Desk first.",
      bn: "প্রথমে হোস্টেলের ভিডিও স্ক্রিন এবং চ্যাট ডেস্কে গিয়ে সেটিংস ঠিক করুন।",
    },
    discoverNote: {
      en: "Caching lecture notes offline once and disabling chat auto-download protects student exam budgets all week.",
      bn: "পড়াশোনার নোট অফলাইনে সেভ করে রাখলে এবং চ্যাট অটো-ডাউনলোড বন্ধ করলে পুরো সপ্তাহ নিশ্চিন্তে থাকা যায়।",
    },
    tip: {
      en: "All three hostel stations contribute to weekly MB—inspect Video, Messaging, and Study Tablet before running the 7-day calendar.",
      bn: "সাপ্তাহিক ক্যালেন্ডার চালানোর আগে তিনটি ডিভাইসের সেটিংসই পরীক্ষা করে নিন।",
    },
    hintTarget: {
      en: "Target Highlight: Look for the 3 desk stations plus the Wall Calendar Test console.",
      bn: "টার্গেট নির্দেশ: ৩টি ডেস্ক ডিভাইস এবং দেয়ালের ৭-দিনের ক্যালেন্ডার কনসোল দেখুন।",
    },
    hintAction: {
      en: 'Next Action: Set Video=360p, Chat=Manual, Tablet=Offline Cache, then click "Run 7-Day Simulation" on the Calendar.',
      bn: "পরবর্তী কাজ: ভিডিও=৩৬০পি, চ্যাট=ম্যানুয়াল এবং ট্যাবলেট=অফলাইন ক্যাশ করে ৭ দিনের সিমুলেশন চালান।",
    },
    handbookTopicId: "what-is-mobile-data",
    isPremium: false,
    worldAnchor: [-6, 3, 6],
    landmarkLabel: { en: "Tilagarh Study Campus", bn: "টিলাগড় স্টাডি ক্যাম্পাস" },
  },
  {
    id: "syl-4",
    cityId: "sylhet",
    order: 13,
    iconType: "community-mesh",
    title: { en: "Connect the Community", bn: "কমিউনিটি সংযুক্তি" },
    subtitle: {
      en: "3D Surma Civic Catenary Fiber Builder",
      bn: "৩ডি সুরমা কমিউনিটি ফাইবার নির্মাণ",
    },
    objective: {
      en: "String overhead 3D optical/relay links connecting School, Clinic, Ferry Ghat, and Tea Co-op back to the Main Tower within 4 links.",
      bn: "সর্বোচ্চ ৪টি লিংক ব্যবহার করে স্কুল, ক্লিনিক, ফেরিঘাট ও চা সমবায়কে মূল টাওয়ারের সাথে ৩ডি কেবলে যুক্ত করুন।",
    },
    howToPlay: [
      {
        en: "Click two 3D nodes in sequence (or walk between poles and click Operate) to string a glowing overhead cable.",
        bn: "দুটি ৩ডি স্থাপনায় পরপর ক্লিক করে (অথবা হেঁটে গিয়ে অপারেট চেপে) ওভারহেড কেবল টানুন।",
      },
      {
        en: "Daisy-chain nearby buildings within your 4-link budget so all 5 nodes turn emerald.",
        bn: "৪টি লিংকের বাজেটের মধ্যে সবগুলো স্থাপনা মূল টাওয়ারে যুক্ত করুন।",
      },
    ],
    watchDemo: {
      en: "A single hub-and-spoke or short daisy-chain topology connects 5 sites using just 4 spans instead of redundant cross-wiring.",
      bn: "বুদ্ধিদীপ্ত চেইন বা স্টার সংযোগ ব্যবহার করলে মাত্র ৪টি কেবলেই ৫টি কেন্দ্র যুক্ত করা যায়।",
    },
    tryPrompt: {
      en: "Click Main Tower first, then click Clinic or School to hang your first 3D cable.",
      bn: "প্রথমে মূল টাওয়ারে ক্লিক করুন, তারপর ক্লিনিক বা স্কুলে ক্লিক করে প্রথম কেবল টানুন।",
    },
    discoverNote: {
      en: "Minimum spanning links (N−1 = 4 links for 5 nodes) deliver full network reachability with minimal infrastructure cost.",
      bn: "৫টি কেন্দ্রকে যুক্ত করতে কমপক্ষে ৪টি সংযোগ (N−1 টপোলজি) হলেই পুরো নেটওয়ার্ক সচল হয়।",
    },
    tip: {
      en: "If you run out of the 4-link budget, click Clear Links or tap an existing cable to undo and try a cleaner chain.",
      bn: "৪টি লিংক শেষ হয়ে গেলে Clear Links দিয়ে নতুনভাবে কাছাকাছি স্থাপনাগুলো যুক্ত করুন।",
    },
    hintTarget: {
      en: "Target Highlight: Any dark gray building without a green beacon roof is still isolated from the Main Tower.",
      bn: "টার্গেট নির্দেশ: যে ভবনগুলোর ছাদের বাতি এখনো ধূসর, সেগুলো টাওয়ারের সাথে যুক্ত হয়নি।",
    },
    hintAction: {
      en: "Next Action: Link Tower → School → Tea Co-op, and Tower → Clinic → Ferry Ghat (4 clean links!).",
      bn: "পরবর্তী কাজ: টাওয়ার → স্কুল → চা সমবায় এবং টাওয়ার → ক্লিনিক → ফেরিঘাট যুক্ত করুন।",
    },
    handbookTopicId: "how-tower-works",
    isPremium: true,
    worldAnchor: [8, 3, 5],
    landmarkLabel: { en: "Surma Civic Mesh Hub", bn: "সুরমা সিভিক মেশ হাব" },
  },
  {
    id: "syl-5",
    cityId: "sylhet",
    order: 14,
    iconType: "packet-stages",
    title: { en: "The Network Journey", bn: "নেটওয়ার্কের ভেতরের যাত্রা" },
    subtitle: {
      en: "3D Amberkhana Hardware Rack Walkthrough",
      bn: "৩ডি আম্বরখানা হার্ডওয়্যার র‍্যাক অনুশীলন",
    },
    objective: {
      en: "Walk down all 6 hardware racks in the Amberkhana facility and operate each console to transform Sound → Bits → RF → Laser → Voice.",
      bn: "আম্বরখানা স্টেশনের ৬টি ৩ডি হার্ডওয়্যার র‍্যাক পরিদর্শন করে ধাপে ধাপে শব্দ → বিট → রেডিও → লেজার → কণ্ঠস্বর রূপান্তর সম্পন্ন করুন।",
    },
    howToPlay: [
      {
        en: "Walk down the 3D facility aisle from Rack 01 (Encoder) to Rack 06 (Receiver Decoder).",
        bn: "র‍্যাক ০১ (এনকোডার) থেকে র‍্যাক ০৬ (রিসিভার) পর্যন্ত পর্যায়ক্রমে যান।",
      },
      {
        en: "Operate the lever/button on each active console and watch the 3D waveform morph along the overhead conduit.",
        bn: "প্রতিটি র‍্যাকের লিভার চালু করুন এবং ওপরে ৩ডি সিগন্যাল তরঙ্গ বদলাতে দেখুন।",
      },
    ],
    watchDemo: {
      en: "Voice never travels as raw sound down a cable—it transforms through binary encoding, RF carrier waves, and optical light.",
      bn: "কণ্ঠস্বর সরাসরি তারে যায় না; এটি বাইনারি বিট, রেডিও তরঙ্গ এবং অপটিক্যাল আলোয় রূপান্তরিত হয়।",
    },
    tryPrompt: {
      en: "Start at Rack 01 (Voice Encoder) on the far left of the corridor.",
      bn: "করিডোরের বাম প্রান্তের র‍্যাক ০১ (ভয়েস এনকোডার) থেকে শুরু করুন।",
    },
    discoverNote: {
      en: "Standardized encoding and fiber optics carry thousands of simultaneous conversations without interference.",
      bn: "ডিজিটাল এনকোডিং ও অপটিক্যাল ফাইবারের কারণে একইসাথে হাজারো কল নিরাপদে আদান-প্রদান হয়।",
    },
    tip: {
      en: "Follow the illuminated green cable along the floor from Rack 01 through Rack 06 in order.",
      bn: "মেঝের সবুজ কেবল অনুসরণ করে ০১ থেকে ০৬ ক্রমে র‍্যাকগুলো চালু করুন।",
    },
    hintTarget: {
      en: "Target Highlight: The next unactivated hardware rack pulses cyan down the center aisle.",
      bn: "টার্গেট নির্দেশ: পরবর্তী সক্রিয় করার র‍্যাকটি নীল আলোয় জ্বলছে।",
    },
    hintAction: {
      en: "Next Action: Walk next to the cyan glowing rack and click Operate (or click it) to engage that signal stage.",
      bn: "পরবর্তী কাজ: জ্বলতে থাকা র‍্যাকের সামনে গিয়ে অপারেট চাপুন অথবা সরাসরি ক্লিক করুন।",
    },
    handbookTopicId: "how-tower-works",
    isPremium: true,
    worldAnchor: [0, 4, -8],
    landmarkLabel: { en: "Amberkhana Core Station", bn: "আম্বরখানা কোর স্টেশন" },
  },
  {
    id: "syl-6",
    cityId: "sylhet",
    order: 15,
    iconType: "digital-clock",
    title: { en: "Digital Day", bn: "ডিজিটাল দিনলিপি" },
    subtitle: {
      en: "3D Dynamic Sky & 24-Hour Service Simulation",
      bn: "৩ডি দিন-রাত আবহাওয়া ও ডিজিটাল সেবা মিশন",
    },
    objective: {
      en: "Experience shifting 3D sky lighting—Morning, Noon, Monsoon Rain, and Night—while operating 4 Sylhet kiosks smoothly.",
      bn: "সকাল, দুপুর, বর্ষার বৃষ্টি ও রাতের পরিবর্তনশীল ৩ডি আকাশের নিচে সিলেটের ৪টি কিয়স্কের সঠিক সেবা নির্বাচন করুন।",
    },
    howToPlay: [
      {
        en: "Walk to the active time-of-day kiosk in Subhanighat Square as the sun, rain, and night lights transition.",
        bn: "সকাল থেকে রাতের আবহাওয়া পরিবর্তনের সাথে সক্রিয় কিয়স্কগুলোতে যান।",
      },
      {
        en: "Select the smart service channel matching that moment’s battery and monsoon weather constraint.",
        bn: "সময়, ব্যাটারি ও বৃষ্টির অবস্থা অনুযায়ী সঠিক ডিজিটাল সেবা বাছাই করুন।",
      },
    ],
    watchDemo: {
      en: "As dark monsoon clouds roll over Sylhet in the afternoon, switching from heavy streaming to lightweight SMS keeps you connected.",
      bn: "দুপুর গড়িয়ে বর্ষার মেঘ নামলে ভারী স্ট্রিমিংয়ের বদলে হালকা এসএমএস বা অফলাইন ক্যাশ ব্যবহারই সেরা।",
    },
    tryPrompt: {
      en: "Visit Kiosk 1 (Morning Bus QR Gate) illuminated in warm morning sunlight.",
      bn: "প্রথমে সকালের আলোয় থাকা কিয়স্ক ১ (বাস কিউআর গেট)-এ যান।",
    },
    discoverNote: {
      en: "Adapting your choice across battery levels, monsoon weather, and Wi-Fi availability turns 1 GB into effortless daily productivity.",
      bn: "ব্যাটারি, বৃষ্টি ও ওয়াই-ফাই অবস্থা বুঝে সিদ্ধান্ত নিলে অল্প ডেটাতেই পুরো দিন সুন্দরভাবে চলে।",
    },
    tip: {
      en: "Pay attention to the storm rain in Dusk (Kiosk 3) where battery is 12% and 4G fluctuates.",
      bn: "বিকেলের বৃষ্টিতে (কিয়স্ক ৩) ১২% ব্যাটারি ও দুর্বল ৪জি থাকায় সবচেয়ে হালকা মাধ্যম বাছুন।",
    },
    hintTarget: {
      en: "Target Highlight: Follow the active golden/cyan time beacon clockwise around Subhanighat Square.",
      bn: "টার্গেট নির্দেশ: চত্বরের চারপাশে ঘড়ির কাঁটার দিকে জ্বলন্ত কিয়স্কটি দেখুন।",
    },
    hintAction: {
      en: "Next Action: Kiosk 1 → Mobile Ticket Data; Kiosk 2 → 360p Study Stream; Kiosk 3 (Storm) → Lightweight SMS; Kiosk 4 → Home Wi-Fi.",
      bn: "পরবর্তী কাজ: কিয়স্ক ১ → মোবাইল টিকিট; কিয়স্ক ২ → ৩৬০পি ক্লাস; কিয়স্ক ৩ (বৃষ্টি) → SMS; কিয়স্ক ৪ → ওয়াই-ফাই।",
    },
    handbookTopicId: "sms-voice-data",
    isPremium: true,
    worldAnchor: [-2, 2.2, 8],
    landmarkLabel: { en: "Subhanighat Digital Clock", bn: "সুবহানীঘাট ডিজিটাল ক্লক" },
  },
  {
    id: "syl-7",
    cityId: "sylhet",
    order: 16,
    iconType: "capstone-grid",
    title: { en: "The Final Connection", bn: "চূড়ান্ত সংযোগ" },
    subtitle: { en: "3D National Corridor Tabletop Capstone", bn: "৩ডি জাতীয় করিডোর চূড়ান্ত মিশন" },
    objective: {
      en: "Operate physical 3D stations for Chattogram (elevate mast), Dhaka (balance sector load < 75%), and Sylhet (splice broken fiber) to ignite the 3-city laser corridor.",
      bn: "চট্টগ্রাম (টাওয়ার উত্তোলন), ঢাকা (সেক্টর লোড < ৭৫%) এবং সিলেট (ফাইবার জোড়া)—তিনটি ৩ডি স্টেশন পরিচালনা করে জাতীয় লেজার করিডোর সচল করুন।",
    },
    howToPlay: [
      {
        en: "Walk to Zone 1 (Chattogram Hill Mast) and elevate/drag the relay mast clear of the ridge.",
        bn: "জোন ১ (চট্টগ্রাম)-এ গিয়ে রিলে টাওয়ারটি টিলার ওপরে তুলুন।",
      },
      {
        en: "Walk to Zone 2 (Dhaka Sector Console) and trim evening backups below 75% capacity.",
        bn: "জোন ২ (ঢাকা)-তে গিয়ে সন্ধ্যার লোড ৭৫%-এর নিচে আনুন।",
      },
      {
        en: "Walk to Zone 3 (Sylhet Bridge Splice) and fuse the optical fiber cable to ignite the full 3-city corridor.",
        bn: "জোন ৩ (সিলেট)-এ গিয়ে ফাইবার স্প্লাইস জোড়া লাগিয়ে ৩ শহরের সংযোগ চালু করুন।",
      },
    ],
    watchDemo: {
      en: "Three miniature cities sit linked on the corridor table—fixing line-of-sight, congestion, and physical fiber completes the national loop.",
      bn: "করিডোর টেবিলে থাকা তিন শহরের সংযোগ—টাওয়ার উচ্চতা, যানজট ও ফাইবার জোড়া ঠিক করলেই জাতীয় নেটওয়ার্ক সম্পূর্ণ হয়।",
    },
    tryPrompt: {
      en: "Start at the miniature Chattogram coastal ridge on the west side of the corridor table.",
      bn: "পশ্চিম পাশের চট্টগ্রাম অঞ্চল দিয়ে আপনার চূড়ান্ত মেরামত শুরু করুন।",
    },
    discoverNote: {
      en: "Telecom reliability rests on three pillars: clean RF line-of-sight, balanced shared sector capacity, and unbroken optical fiber core.",
      bn: "নির্ভরযোগ্য টেলিকমের মূল ভিত্তি তিনটি: বাধামুক্ত রেডিও সিগন্যাল, সুষম সেক্টর সক্ষমতা এবং অটুট ফাইবার কোর।",
    },
    tip: {
      en: "Complete each city zone in any order—watch its miniature city beacon turn emerald as you finish.",
      bn: "যেকোনো ক্রমে তিনটি শহরের স্টেশনই পরিচালনা করে প্রতিটি শহরকে সবুজ রঙে রূপান্তর করুন।",
    },
    hintTarget: {
      en: "Target Highlight: Visit whichever city zone is still pulsing red/amber—Chattogram (West), Dhaka (Center), or Sylhet (East).",
      bn: "টার্গেট নির্দেশ: যে শহরের স্টেশনটি এখনো লাল/হলুদ দেখাচ্ছে সেখানে যান—চট্টগ্রাম, ঢাকা বা সিলেট।",
    },
    hintAction: {
      en: "Next Action: Chattogram → Raise Mast to 16m; Dhaka → Off-peak Backups (58% Load); Sylhet → Align & Fuse Fiber Splice.",
      bn: "পরবর্তী কাজ: চট্টগ্রাম → ১৬ মিটার টাওয়ার; ঢাকা → অফ-পিক ব্যাকআপ; সিলেট → ফাইবার ফিউজ।",
    },
    handbookTopicId: "bangladesh-connectivity",
    isPremium: true,
    worldAnchor: [2, 5, 0],
    landmarkLabel: { en: "National Corridor Beacon", bn: "জাতীয় করিডোর বিকন" },
  },
];

export function getTrailsForCity(cityId: string): TrailConfig[] {
  return TRAILS.filter((tr) => tr.cityId === cityId).sort((a, b) => a.order - b.order);
}

export function getTrailById(id: string): TrailConfig | undefined {
  return TRAILS.find((tr) => tr.id === id);
}
