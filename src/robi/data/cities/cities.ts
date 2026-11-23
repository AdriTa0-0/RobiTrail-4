import type { LocalizedText } from "../translations/dictionary";

export interface CityConfig {
  id: "chattogram" | "dhaka" | "sylhet";
  name: LocalizedText;
  tagline: LocalizedText;
  regionLabel: LocalizedText;
  coordinates: { lat: number; lng: number; display: string };
  mapPosition: { x: number; y: number }; // Normalized coordinates on Bangladesh SVG map (viewBox 0 0 400 520)
  description: LocalizedText;
  geographyNotes: LocalizedText;
  sourceAttribution: string;
  camera: {
    startPos: [number, number, number];
    target: [number, number, number];
  };
  theme: {
    skyTop: string;
    skyBottom: string;
    fogColor: string;
    fogDensity: number;
    sunColor: string;
    sunIntensity: number;
    hemiSky: string;
    hemiGround: string;
    accentHex: string;
    roadColor: string;
    groundColor: string;
  };
  ambientSound: {
    baseFreq: number;
    character: "coastal" | "metropolitan" | "riverine";
  };
  achievement: {
    title: LocalizedText;
    emblemLabel: LocalizedText;
  };
  trailIds: string[];
}

export const CITIES: CityConfig[] = [
  {
    id: "chattogram",
    name: { en: "Chattogram", bn: "চট্টগ্রাম" },
    tagline: {
      en: "Port City · Coastal Hills & Commercial Avenues",
      bn: "বন্দর নগরী · পাহাড়, কর্ণফুলী ও বাণিজ্যিক সড়ক",
    },
    regionLabel: { en: "Southeastern Bay Coast", bn: "দক্ষিণ-পূর্ব উপকূলীয় অঞ্চল" },
    coordinates: { lat: 22.3569, lng: 91.7832, display: "22.3569° N, 91.7832° E" },
    mapPosition: { x: 294, y: 368 },
    description: {
      en: "Inspired by Agrabad commercial streets, Foy’s Lake urban hills, and the Karnaphuli riverfront port corridor.",
      bn: "আগ্রাবাদ বাণিজ্যিক সড়ক, ফয়েজ লেক সংলগ্ন পাহাড় এবং কর্ণফুলী নদীর বন্দর তীরের আদলে নির্মিত পরিবেশ।",
    },
    geographyNotes: {
      en: "Urban hillside topography creates real line-of-sight RF signal shadows alongside busy maritime avenues.",
      bn: "শহরের পাহাড়ি ঢাল এবং ব্যস্ত বন্দর সড়ক বাস্তবসম্মত সিগন্যাল প্রতিবন্ধকতার অভিজ্ঞতা তৈরি করে।",
    },
    sourceAttribution:
      "Geographic reference: OpenStreetMap Chattogram Metro, Karnaphuli Estuary & BBS Urban Profile.",
    camera: {
      startPos: [20, 12, 22],
      target: [0, 2, 0],
    },
    theme: {
      skyTop: "#1E3A5F",
      skyBottom: "#E07A5F",
      fogColor: "#C98A76",
      fogDensity: 0.011,
      sunColor: "#FFD6A5",
      sunIntensity: 1.85,
      hemiSky: "#93C5FD",
      hemiGround: "#5C4033",
      accentHex: "#E11D48",
      roadColor: "#2B2F3A",
      groundColor: "#3B5249",
    },
    ambientSound: { baseFreq: 130, character: "coastal" },
    achievement: {
      title: { en: "Karnaphuli Signal Navigator", bn: "কর্ণফুলী সিগন্যাল নেভিগেটর" },
      emblemLabel: { en: "Port Link Badge", bn: "বন্দর সংযোগ ব্যাজ" },
    },
    trailIds: ["ctg-1", "ctg-2", "ctg-3", "ctg-4"],
  },
  {
    id: "dhaka",
    name: { en: "Dhaka", bn: "ঢাকা" },
    tagline: {
      en: "Metropolitan Capital · Elevated Viaducts & High-Density Towers",
      bn: "মেট্রোপলিটন রাজধানী · উড়ালসড়ক ও বহুতল ভবন",
    },
    regionLabel: { en: "Central Buriganga Basin", bn: "মধ্যাঞ্চলীয় বুড়িগঙ্গা অববাহিকা" },
    coordinates: { lat: 23.8103, lng: 90.4125, display: "23.8103° N, 90.4125° E" },
    mapPosition: { x: 198, y: 248 },
    description: {
      en: "Dense metropolitan skyline inspired by Motijheel-Hatirjheel intersections, elevated metro viaducts, and vibrant multi-lane city traffic.",
      bn: "মতিঝিল ও হাতিরঝিলের আদলে বহুতল ভবন, মেট্রো ভায়াডাক্ট ও প্রাণবন্ত বহু-লেনের সড়কসমৃদ্ধ ঘনবসতিপূর্ণ পরিবেশ।",
    },
    geographyNotes: {
      en: "High subscriber density makes mobile data management, sector bandwidth sharing, and speed-vs-volume literacy essential.",
      bn: "উচ্চ ব্যবহারকারী ঘনত্বের কারণে ডেটা ব্যবস্থাপনা ও নেটওয়ার্ক ব্যান্ডউইথ শেয়ারিং বোঝা এখানে অত্যন্ত গুরুত্বপূর্ণ।",
    },
    sourceAttribution:
      "Geographic reference: OpenStreetMap Dhaka Metro, BTRC Urban Teledensity Context.",
    camera: {
      startPos: [-22, 14, 22],
      target: [0, 3, 0],
    },
    theme: {
      skyTop: "#0F172A",
      skyBottom: "#475569",
      fogColor: "#334155",
      fogDensity: 0.012,
      sunColor: "#FDE68A",
      sunIntensity: 1.65,
      hemiSky: "#60A5FA",
      hemiGround: "#334155",
      accentHex: "#F59E0B",
      roadColor: "#1E2430",
      groundColor: "#334155",
    },
    ambientSound: { baseFreq: 165, character: "metropolitan" },
    achievement: {
      title: { en: "Metro Bandwidth Steward", bn: "মেট্রো ব্যান্ডউইথ দক্ষ" },
      emblemLabel: { en: "Capital Grid Badge", bn: "রাজধানী গ্রিড ব্যাজ" },
    },
    trailIds: ["dhk-1", "dhk-2", "dhk-3", "dhk-4", "dhk-5"],
  },
  {
    id: "sylhet",
    name: { en: "Sylhet", bn: "সিলেট" },
    tagline: {
      en: "Surma Valley · Steel Arch Bridge & Outer Regional Hills",
      bn: "সুরমা উপত্যকা · সেতু স্থাপত্য ও প্রান্তীয় সবুজ টিলা",
    },
    regionLabel: { en: "Northeastern Surma Basin", bn: "উত্তর-পূর্ব সুরমা অববাহিকা" },
    coordinates: { lat: 24.8949, lng: 91.8687, display: "24.8949° N, 91.8687° E" },
    mapPosition: { x: 288, y: 158 },
    description: {
      en: "Authentic regional urban streets meeting the Surma River arched steel bridge, with Sylhet’s distinctive green hills framed strictly along the outer horizon.",
      bn: "সুরমা নদীর ঐতিহ্যবাহী আর্চ সেতু, সুপরিকল্পিত আঞ্চলিক সড়ক এবং শহরের প্রান্তজুড়ে থাকা সবুজ টিলার সমন্বয়ে গঠিত।",
    },
    geographyNotes: {
      en: "Combines urban civic buildings in the center with outer hill terrain and river crossings that test network backhaul resilience.",
      bn: "কেন্দ্রীয় শহরের ভবন এবং প্রান্তীয় টিলা ও নদীর পারাপার নেটওয়ার্ক ব্যাকহল ও সিগন্যাল দক্ষতা যাচাই করে।",
    },
    sourceAttribution:
      "Geographic reference: OpenStreetMap Sylhet City, Surma River Corridor & Keane Bridge Geometry.",
    camera: {
      startPos: [18, 11, -22],
      target: [0, 2, 0],
    },
    theme: {
      skyTop: "#064E3B",
      skyBottom: "#A7F3D0",
      fogColor: "#86EFAC",
      fogDensity: 0.01,
      sunColor: "#FEF3C7",
      sunIntensity: 1.8,
      hemiSky: "#A7F3D0",
      hemiGround: "#14532D",
      accentHex: "#059669",
      roadColor: "#2D3748",
      groundColor: "#2F6F4E",
    },
    ambientSound: { baseFreq: 146, character: "riverine" },
    achievement: {
      title: { en: "Surma Network Architect", bn: "সুরমা নেটওয়ার্ক স্থপতি" },
      emblemLabel: { en: "Valley Master Badge", bn: "উপত্যকা মাস্টার ব্যাজ" },
    },
    trailIds: ["syl-1", "syl-2", "syl-3", "syl-4", "syl-5", "syl-6", "syl-7"],
  },
];

export const FUTURE_CITY_EXPANSIONS = [
  {
    id: "rajshahi",
    name: { en: "Rajshahi", bn: "রাজশাহী" },
    status: { en: "Planned Expansion", bn: "পরিকল্পিত সম্প্রসারণ" },
  },
  {
    id: "khulna",
    name: { en: "Khulna", bn: "খুলনা" },
    status: { en: "Planned Expansion", bn: "পরিকল্পিত সম্প্রসারণ" },
  },
  {
    id: "coxs-bazar",
    name: { en: "Cox’s Bazar", bn: "কক্সবাজার" },
    status: { en: "Planned Expansion", bn: "পরিকল্পিত সম্প্রসারণ" },
  },
];

export function getCityById(id: string): CityConfig {
  return CITIES.find((c) => c.id === id) || CITIES[0];
}
