export const HARBOUR_MAX_RETRY_CHANCES = 2;

export const HARBOUR_START_Z = 76;
export const HARBOUR_FINISH_Z = -164;
export const HARBOUR_GATEWAY_Z = -165;
export const HARBOUR_TOTAL_DISTANCE_M = HARBOUR_START_Z - HARBOUR_FINISH_Z; // 240m chase span
export const HARBOUR_DECK_LENGTH = 264;
export const HARBOUR_DECK_CENTER_Z = -46; // Spans z = +86 down to z = -178
export const HARBOUR_PRACTICE_RING_POS = { x: -2.4, z: 60 } as const;

export const HARBOUR_WORLD_BOUNDS = {
  minX: -7.5,
  maxX: 7.5,
  minZ: -172,
  maxZ: 82,
} as const;

export const HARBOUR_STATIC_CONTAINER_PLACEMENTS: readonly [number, number][] = [
  [-4.2, 44],
  [4.1, -8],
  [0.0, -38],
  [-3.9, -86],
  [4.2, -118],
  [-1.2, -153],
];

export const HARBOUR_LORRY_CONFIGS = [
  { x: 0, z: 16, color: 0x0284c7, amp: 4.5, speed: 0.9, phase: 0.2 },
  { x: 0, z: -74, color: 0xf59e0b, amp: 4.6, speed: 1.0, phase: 2.1 },
  { x: 0, z: -126, color: 0x0f766e, amp: 4.4, speed: 0.95, phase: 3.7 },
] as const;

export const HARBOUR_CRANE_Z_POSITIONS: readonly number[] = [4, -50, -108, -146];

export const HARBOUR_INTERFERENCE_ZONES: readonly [number, number][] = [
  [3.4, 26],
  [-3.4, -28],
  [2.8, -94],
  [-3.2, -134],
];

export const HARBOUR_BOOST_RING_POSITIONS: readonly [number, number][] = [
  [0.0, 34],
  [-4.2, -18],
  [4.4, -62],
  [-4.0, -100],
  [3.8, -138],
  [0.0, -159],
];

export const HARBOUR_DISTANCE_MARKERS = [
  { z: 16, en: "60m", subEn: "PIER SECTOR 1", bn: "৬০ মি", subBn: "পিয়ার সেক্টর ১" },
  { z: -44, en: "120m", subEn: "HALFWAY", bn: "১২০ মি", subBn: "অর্ধপথ" },
  { z: -104, en: "180m", subEn: "FINAL APPROACH", bn: "১৮০ মি", subBn: "শেষ ধাপ" },
  { z: -156, en: "240m", subEn: "GATEWAY AHEAD", bn: "২৪০ মি", subBn: "গেটওয়ে সামনে" },
] as const;

export function computeHarbourProgressPct(droneZ: number): number {
  if (droneZ <= HARBOUR_FINISH_Z) return 100;
  const pct = ((HARBOUR_START_Z - droneZ) / HARBOUR_TOTAL_DISTANCE_M) * 100;
  return Math.max(0, Math.min(99, Math.round(pct)));
}

export type HarbourCrashCause = "truck" | "container" | "crane" | "interference";

export interface HarbourObstacleBox {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  kind: "truck" | "container";
}

export interface HarbourCraneBox {
  x: number;
  z: number;
}

export function detectHarbourHazardCollision(
  droneX: number,
  droneZ: number,
  obstacles: readonly HarbourObstacleBox[],
  cranes: readonly HarbourCraneBox[],
): "truck" | "container" | "crane" | null {
  for (const obs of obstacles) {
    if (
      Math.abs(droneX - obs.x) < obs.halfW + 0.65 &&
      Math.abs(droneZ - obs.z) < obs.halfD + 0.85
    ) {
      return obs.kind;
    }
  }

  for (const ct of cranes) {
    if (Math.abs(droneX - ct.x) < 1.8 && Math.abs(droneZ - ct.z) < 1.6) {
      return "crane";
    }
  }

  return null;
}

export function getChancesRemainingAfterRetry(currentChances: number): number {
  return Math.max(0, currentChances - 1);
}

export interface HarbourLoseModalCopy {
  kicker: string;
  title: string;
  chancesText: string;
  causeText: string;
  guidanceText: string;
  primaryLabel: string;
  secondaryLabel: string;
}

export function getLoseModalContent(
  lang: "en" | "bn",
  chancesLeft: number,
  cause: HarbourCrashCause,
  exitToCityLabel: string,
): HarbourLoseModalCopy {
  const safeChances = Math.max(0, chancesLeft);

  const kicker = lang === "bn" ? "#৩ · বন্দর প্যাকেট ধাওয়া" : "#3 · Harbour Packet Chase";
  const title = lang === "bn" ? "আপনি খেলায় হেরে গেছেন!" : "You Lost the Game!";

  const chancesText =
    lang === "bn"
      ? safeChances === 2
        ? "আপনার আর ২টি সুযোগ বাকি আছে।"
        : safeChances === 1
          ? "আপনার আর ১টি সুযোগ বাকি আছে।"
          : "আপনার আর ০টি সুযোগ বাকি আছে।"
      : safeChances === 1
        ? "You have 1 chance left."
        : `You have ${safeChances} chances left.`;

  const causeText =
    lang === "bn"
      ? cause === "truck"
        ? "আপনার ড্রোন চলন্ত কার্গো ট্রাকের সাথে ধাক্কা খেয়েছে।"
        : cause === "container"
          ? "আপনার ড্রোন শিপিং কন্টেইনার ব্লকের সাথে ধাক্কা খেয়েছে।"
          : cause === "crane"
            ? "আপনার ড্রোন গ্যান্ট্রি ক্রেনের হুকের সাথে ধাক্কা খেয়েছে।"
            : "অতিরিক্ত ইন্টারফেরেন্সের কারণে প্যাকেট সুরক্ষা শূন্য হয়ে গেছে।"
      : cause === "truck"
        ? "Your carrier collided with a cargo truck on the pier."
        : cause === "container"
          ? "Your carrier collided with a container block on the pier."
          : cause === "crane"
            ? "Your carrier collided with a gantry crane hook."
            : "Packet integrity dropped to zero inside port interference.";

  const guidanceText =
    safeChances > 0
      ? lang === "bn"
        ? "শুরু থেকে আবার চেষ্টা করতে Retry চাপুন — কার্গো ট্রাক, কন্টেইনার ব্লক ও ক্রেনের হুক এড়িয়ে চলুন।"
        : "Press Retry to restart from the pier entrance while dodging cargo trucks, container blocks, and crane hooks."
      : lang === "bn"
        ? "আপনার সব সুযোগ শেষ হয়ে গেছে। নতুন করে খেলতে Restart Game অথবা ফিরে যেতে শহরের গেমস বেছে নিন।"
        : "No retry chances remain for this run. Start a fresh 3-try session or return to City Games.";

  const primaryLabel =
    safeChances > 0
      ? lang === "bn"
        ? "আবার চেষ্টা করুন"
        : "Retry"
      : lang === "bn"
        ? "নতুন করে শুরু করুন"
        : "Restart Game";

  return {
    kicker,
    title,
    chancesText,
    causeText,
    guidanceText,
    primaryLabel,
    secondaryLabel: exitToCityLabel,
  };
}
