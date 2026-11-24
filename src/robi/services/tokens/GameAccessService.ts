import { TRAILS, type TrailConfig } from "../../data/trails/trails";

export type GameAccessTier = "free_intro" | "available" | "token_locked";

export const GAME_UNLOCK_TOKEN_COST = 2;

export interface ConfigurableGameAccessMap {
  // Trail IDs configured as token-locked (excluding any dynamically identified free_intro game)
  tokenLockedTrailIds: string[];
  // Trail IDs requiring account registration even when not token-locked (default: all non-intro games)
  accountRequiredForAllNonIntro: boolean;
}

const DEFAULT_CONFIG: ConfigurableGameAccessMap = {
  // Derived from existing trail premium flags as initial configurable defaults; never hardcoded permanently
  tokenLockedTrailIds: TRAILS.filter((tr) => tr.isPremium).map((tr) => tr.id),
  accountRequiredForAllNonIntro: true,
};

let activeAccessConfig: ConfigurableGameAccessMap = {
  tokenLockedTrailIds: [...DEFAULT_CONFIG.tokenLockedTrailIds],
  accountRequiredForAllNonIntro: DEFAULT_CONFIG.accountRequiredForAllNonIntro,
};

/**
 * Dynamically identifies "The Message Journey" from the game registry
 * regardless of whether its ID is ctg-1, ctg-4, or re-ordered later.
 */
export function isFreeIntroTrail(trailOrId: string | TrailConfig | undefined | null): boolean {
  if (!trailOrId) return false;
  const trail =
    typeof trailOrId === "string" ? TRAILS.find((tr) => tr.id === trailOrId) : trailOrId;
  if (!trail) return false;
  if (trail.id === "ctg-1" || trail.id === "ctg-3") return true;
  const enTitle = trail.title.en.trim().toLowerCase();
  return (
    enTitle === "the message journey" ||
    enTitle.includes("message journey") ||
    enTitle.includes("harbour packet chase") ||
    enTitle.includes("the missing signal case") ||
    enTitle.includes("robi sheba")
  );
}

export function findFreeIntroTrail(): TrailConfig | undefined {
  return (
    TRAILS.find((tr) => {
      const enTitle = tr.title.en.trim().toLowerCase();
      return enTitle === "the message journey" || enTitle.includes("message journey");
    }) || TRAILS.find((tr) => isFreeIntroTrail(tr))
  );
}

export function getConfigurableAccessConfig(): ConfigurableGameAccessMap {
  return {
    tokenLockedTrailIds: [...activeAccessConfig.tokenLockedTrailIds],
    accountRequiredForAllNonIntro: activeAccessConfig.accountRequiredForAllNonIntro,
  };
}

export function setConfigurableAccessConfig(next: Partial<ConfigurableGameAccessMap>): void {
  activeAccessConfig = {
    tokenLockedTrailIds: Array.isArray(next.tokenLockedTrailIds)
      ? next.tokenLockedTrailIds.filter((id) => !isFreeIntroTrail(id))
      : [...activeAccessConfig.tokenLockedTrailIds],
    accountRequiredForAllNonIntro:
      typeof next.accountRequiredForAllNonIntro === "boolean"
        ? next.accountRequiredForAllNonIntro
        : activeAccessConfig.accountRequiredForAllNonIntro,
  };
}

export function resetConfigurableAccessConfig(): void {
  activeAccessConfig = {
    tokenLockedTrailIds: [...DEFAULT_CONFIG.tokenLockedTrailIds],
    accountRequiredForAllNonIntro: DEFAULT_CONFIG.accountRequiredForAllNonIntro,
  };
}

export function getConfiguredAccessTier(
  trailOrId: string | TrailConfig,
  overrideConfig?: ConfigurableGameAccessMap,
): GameAccessTier {
  const id = typeof trailOrId === "string" ? trailOrId : trailOrId.id;
  if (isFreeIntroTrail(trailOrId)) {
    return "free_intro";
  }
  const cfg = overrideConfig || activeAccessConfig;
  if (cfg.tokenLockedTrailIds.includes(id)) {
    return "token_locked";
  }
  return "available";
}

export interface TrailAccessResolution {
  tier: GameAccessTier;
  accessible: boolean;
  devBypass: boolean;
  requiresRegistration: boolean;
  requiresTokenUnlock: boolean;
  alreadyUnlockedByPlayer: boolean;
  alreadyCompletedByPlayer: boolean;
  unlockCost: number;
}

export function resolveTrailAccess(params: {
  trail: TrailConfig;
  signedIn: boolean;
  devTestingMode: boolean;
  tokenPreviewMode: boolean;
  unlockedTrailIds: string[];
  completedTrailIds: string[];
  subscriptionActive: boolean;
  overrideConfig?: ConfigurableGameAccessMap;
}): TrailAccessResolution {
  const {
    trail,
    signedIn,
    devTestingMode,
    tokenPreviewMode,
    unlockedTrailIds,
    completedTrailIds,
    subscriptionActive,
    overrideConfig,
  } = params;

  const tier = getConfiguredAccessTier(trail, overrideConfig);
  const alreadyCompletedByPlayer = completedTrailIds.includes(trail.id);
  const alreadyUnlockedByPlayer = unlockedTrailIds.includes(trail.id) || subscriptionActive;

  // Rule: Introductory trails ("The Message Journey", "Harbour Packet Chase", and "Robi Sheba — The Missing Signal Case")
  // are 100% free with zero registration or token barrier.
  if (tier === "free_intro" || isFreeIntroTrail(trail) || trail.id === "ctg-1" || trail.id === "ctg-3") {
    return {
      tier: "free_intro",
      accessible: true,
      devBypass: false,
      requiresRegistration: false,
      requiresTokenUnlock: false,
      alreadyUnlockedByPlayer: true,
      alreadyCompletedByPlayer,
      unlockCost: 0,
    };
  }

  // Retain existing developer testing access when Token Preview toggle is off
  if (devTestingMode && !tokenPreviewMode) {
    return {
      tier,
      accessible: true,
      devBypass: true,
      requiresRegistration: false,
      requiresTokenUnlock: false,
      alreadyUnlockedByPlayer,
      alreadyCompletedByPlayer,
      unlockCost: tier === "token_locked" ? GAME_UNLOCK_TOKEN_COST : 0,
    };
  }

  const cfg = overrideConfig || activeAccessConfig;

  // Unregistered players attempting restricted/locked games get the friendly registration prompt
  if (!signedIn && (cfg.accountRequiredForAllNonIntro || tier === "token_locked")) {
    return {
      tier,
      accessible: false,
      devBypass: false,
      requiresRegistration: true,
      requiresTokenUnlock: false,
      alreadyUnlockedByPlayer: false,
      alreadyCompletedByPlayer,
      unlockCost: tier === "token_locked" ? GAME_UNLOCK_TOKEN_COST : 0,
    };
  }

  // Signed-in players checking a token-locked game
  if (tier === "token_locked" && !alreadyUnlockedByPlayer && !alreadyCompletedByPlayer) {
    return {
      tier,
      accessible: false,
      devBypass: false,
      requiresRegistration: false,
      requiresTokenUnlock: true,
      alreadyUnlockedByPlayer: false,
      alreadyCompletedByPlayer,
      unlockCost: GAME_UNLOCK_TOKEN_COST,
    };
  }

  return {
    tier,
    accessible: true,
    devBypass: false,
    requiresRegistration: false,
    requiresTokenUnlock: false,
    alreadyUnlockedByPlayer,
    alreadyCompletedByPlayer,
    unlockCost: tier === "token_locked" ? GAME_UNLOCK_TOKEN_COST : 0,
  };
}
