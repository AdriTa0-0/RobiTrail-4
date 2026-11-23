export const APP_CONFIG = {
  appName: "RobiTrail",
  version: "2.4.0",
  buildChannel: "BDAPPS-TECH-QUEST",
  supportedLanguages: ["en", "bn"] as const,
  defaultCityId: "chattogram",
  disclaimer: {
    en: "Educational app created for BDapps Tech Quest. Independent learning experience, not an official Robi Axiata PLC or bdapps commercial product.",
    bn: "BDapps Tech Quest-এর জন্য নির্মিত একটি শিক্ষামূলক অ্যাপ। এটি স্বাধীন শিক্ষণ উদ্যোগ, রবি আজিয়াটা পিএলসি বা বিডিঅ্যাপস-এর বাণিজ্যিক পণ্য নয়।",
  },
} as const;
