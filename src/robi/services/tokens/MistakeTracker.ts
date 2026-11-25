import type { TrailConfig } from "../../data/trails/trails";
import { isFreeIntroTrail } from "./GameAccessService";

/**
 * Only games with explicit, unambiguous validated mistake actions have
 * token mistake deductions enabled. Physics movement, camera panning,
 * obstacle collisions, Help drawers, and sandbox sliders are never penalized.
 */
export const MISTAKE_TRACKED_TRAIL_IDS = new Set<string>([
  "dhk-2", // Connected Everyday — invalid citizen handset dispatch
  "dhk-3", // Speed or Data? — incorrect conclusion answer
  "dhk-5", // Message or Internet? — invalid terminal channel choice
  "syl-3", // Smart Data Choices — failed 2,000 MB 7-day budget check
  "syl-5", // The Network Journey — out-of-sequence hardware rack step
  "syl-6", // Digital Day — unsuitable time-of-day service choice
]);

export function isMistakeTrackingEnabledForTrail(
  trailOrId: string | TrailConfig | undefined | null,
): boolean {
  if (!trailOrId) return false;
  if (isFreeIntroTrail(trailOrId)) return false;
  const id = typeof trailOrId === "string" ? trailOrId : trailOrId.id;
  return MISTAKE_TRACKED_TRAIL_IDS.has(id);
}

export interface MistakeEvalOutcome {
  counted: boolean;
  deductToken: boolean;
  tokenCost: number;
  mistakeCount: number;
  warningStage: "ignored" | "warn_next_costs_1" | "deducted_1";
}

/**
 * Pure session tracker for the "every 2 valid mistakes deducts 1 token" rule:
 * - Mistake 1 -> warning only
 * - Mistake 2 -> -1 token
 * - Mistake 3 -> warning only
 * - Mistake 4 -> -1 token
 * Deduplicates rapid repeated clicks of the exact same mistake actionKey.
 */
export class MistakeSessionTracker {
  private readonly trailId: string;
  private mistakeCount = 0;
  private deductionsCount = 0;
  private lastActionKey = "";
  private lastActionTs = -Infinity;
  private readonly dedupeMs: number;

  constructor(trailId: string, dedupeMs = 900) {
    this.trailId = trailId;
    this.dedupeMs = dedupeMs;
  }

  public getStats() {
    return {
      trailId: this.trailId,
      mistakeCount: this.mistakeCount,
      deductionsCount: this.deductionsCount,
    };
  }

  public reset() {
    this.mistakeCount = 0;
    this.deductionsCount = 0;
    this.lastActionKey = "";
    this.lastActionTs = -Infinity;
  }

  public recordMistake(actionKey: string, nowMs = Date.now()): MistakeEvalOutcome {
    if (!isMistakeTrackingEnabledForTrail(this.trailId)) {
      return {
        counted: false,
        deductToken: false,
        tokenCost: 0,
        mistakeCount: this.mistakeCount,
        warningStage: "ignored",
      };
    }

    const normalizedKey = actionKey.trim() || "invalid-action";
    if (normalizedKey === this.lastActionKey && nowMs - this.lastActionTs < this.dedupeMs) {
      return {
        counted: false,
        deductToken: false,
        tokenCost: 0,
        mistakeCount: this.mistakeCount,
        warningStage: "ignored",
      };
    }

    this.lastActionKey = normalizedKey;
    this.lastActionTs = nowMs;
    this.mistakeCount += 1;

    if (this.mistakeCount % 2 === 0) {
      this.deductionsCount += 1;
      return {
        counted: true,
        deductToken: true,
        tokenCost: 1,
        mistakeCount: this.mistakeCount,
        warningStage: "deducted_1",
      };
    }

    return {
      counted: true,
      deductToken: false,
      tokenCost: 0,
      mistakeCount: this.mistakeCount,
      warningStage: "warn_next_costs_1",
    };
  }
}
