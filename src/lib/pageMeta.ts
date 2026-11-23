const PAGES: Record<string, [string, string]> = {
  "/": [
    "RobiTrail — Explore Bangladesh & Discover Connections",
    "Interactive 3D city games, Robi's history, a digital handbook and certification, grounded in Bangladesh.",
  ],
  "/cities": [
    "Explore Cities — RobiTrail",
    "Discover Chattogram, Dhaka and Sylhet through telecom learning trails.",
  ],
  "/games": [
    "City Games — RobiTrail",
    "Play interactive missions that teach digital communication.",
  ],
  "/robi-journey": [
    "Robi Journey 1997–2026 — RobiTrail",
    "A winding timeline of Robi's milestones across Bangladesh.",
  ],
  "/videos": [
    "Videos & Tutorials — RobiTrail",
    "Animated lessons with voice and subtitles about mobile networks.",
  ],
  "/handbook": [
    "Interactive Handbook — RobiTrail",
    "Guided telecom explanations, diagrams and a 3D tower inspector.",
  ],
  "/research/bangladesh": [
    "Bangladesh Research — RobiTrail",
    "Sources and research on connectivity in Bangladesh.",
  ],
  "/certification": [
    "Certification — RobiTrail",
    "Complete learning experiences and earn a RobiTrail certificate.",
  ],
  "/account": [
    "Account — RobiTrail",
    "Your RobiTrail player profile, city mission progress, achievements and certificates.",
  ],
  "/tokens": [
    "Token Center — RobiTrail",
    "Manage your RobiTrail token balance, rules, purchase packages and recent token activity.",
  ],
  "/about": [
    "About RobiTrail — Team Torongo",
    "Who we are, why RobiTrail exists, how we built it, and the team behind it.",
  ],
};

export function pageHead(path: string) {
  const clean = path.replace(/\/+$/, "") || "/";
  const key =
    Object.keys(PAGES).find((k) => k === clean) ??
    Object.keys(PAGES).filter((k) => k !== "/" && clean.startsWith(k))[0] ??
    "/";
  const [title, description] = PAGES[key]!;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
