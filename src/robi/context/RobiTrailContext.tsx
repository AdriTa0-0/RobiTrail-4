import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { Lang } from "../data/translations/dictionary";
import { type CityConfig, getCityById } from "../data/cities/cities";
import { TRAILS, type TrailConfig, getTrailById } from "../data/trails/trails";
import { useAppRouter } from "../router/RouterContext";
import { clearSubscriberToken, getSubscriberToken } from "../services/auth/sessionMemory";
import type { ServerAccountProfile, SubscriptionState } from "../services/bdapps/bdappsClient";
import {
  deleteServerAccount,
  fetchCurrentAccount,
  syncServerProgress,
  updateServerProfile,
} from "../services/account/accountService";
import type {
  SmsPreviewNotification,
  TokenTransaction,
  TokenWalletState,
} from "../services/tokens/TokenTransactionService";
import {
  clearCachedWallet,
  deductMistakeTokenOnServer,
  fetchWalletFromServer,
  readCachedWallet,
  unlockTrailOnServer,
  writeCachedWallet,
} from "../services/tokens/TokenWalletService";
import {
  claimWelcomeTokensOnce,
  registerDemoPreviewAccount,
} from "../services/tokens/RegistrationRewardHandler";
import { purchaseTokenPackage } from "../services/tokens/TokenShopService";
import {
  findFreeIntroTrail,
  isFreeIntroTrail,
  resolveTrailAccess,
  type TrailAccessResolution,
} from "../services/tokens/GameAccessService";
import {
  isMistakeTrackingEnabledForTrail,
  MistakeSessionTracker,
} from "../services/tokens/MistakeTracker";

export type GraphicsQuality = "high";
export type CityId = "chattogram" | "dhaka" | "sylhet";

export const VALID_TRAIL_IDS = new Set(TRAILS.map((t) => t.id));

export const DEV_TESTING_MODE = Boolean(import.meta.env.DEV);

interface PersistedState {
  lang: Lang;
  activeCityId: CityId;
  completedTrailIds: string[];
  localCertificateIds: string[];
}

const STORAGE_KEY = "robitrail_progress_v2";

function sanitizeTrailIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const unique: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && VALID_TRAIL_IDS.has(id) && !unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique.slice(0, TRAILS.length);
}

function sanitizeCertIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const unique: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && id.startsWith("RT-PROTO-") && !unique.includes(id)) {
      unique.push(id);
    }
  }
  return unique.slice(0, 20);
}

function normalizeDisplayName(raw?: string | null): string {
  const cleaned = (raw || "").trim().slice(0, 60);
  return cleaned.length > 0 ? cleaned : "RobiTrail Explorer";
}

function computeDefaultDistance(cityId: string): number {
  const city = getCityById(cityId);
  const [sx, sy, sz] = city.camera.startPos;
  const [tx, ty, tz] = city.camera.target;
  const dist = Math.round(Math.hypot(sx - tx, sy - ty, sz - tz));
  return Math.max(10, Math.min(42, dist));
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        lang: parsed.lang === "bn" ? "bn" : "en",
        activeCityId:
          parsed.activeCityId === "dhaka" || parsed.activeCityId === "sylhet"
            ? parsed.activeCityId
            : "chattogram",
        completedTrailIds: sanitizeTrailIds(parsed.completedTrailIds),
        localCertificateIds: sanitizeCertIds(parsed.localCertificateIds),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    lang: "en",
    activeCityId: "chattogram",
    completedTrailIds: [],
    localCertificateIds: [],
  };
}

export type TokenGateModalState =
  | null
  | { kind: "registration_invite"; trail: TrailConfig }
  | { kind: "unlock_confirm"; trail: TrailConfig; unlockCost: number }
  | { kind: "insufficient_tokens"; trail: TrailConfig; requiredTokens: number };

export interface TokenToastItem {
  id: string;
  tone: "reward" | "warning" | "penalty" | "info" | "error";
  titleEn: string;
  titleBn: string;
  detailEn?: string;
  detailBn?: string;
}

interface RobiTrailContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  activeCity: CityConfig;
  setActiveCityId: (cityId: CityId) => void;
  completedTrailIds: string[];
  localCertificateIds: string[];
  completeTrail: (trailId: string) => void;
  registerIssuedCertificate: (certificateId: string) => void;
  activeTrail: TrailConfig | null;
  openTrail: (trailId: string) => void;
  closeTrail: () => void;
  quality: GraphicsQuality;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  previewPassActive: boolean;
  setPreviewPassActive: (v: boolean) => void;
  devTestingMode: boolean;
  tokenPreviewMode: boolean;
  setTokenPreviewMode: (v: boolean) => void;
  getTrailAccess: (trailOrId: string | TrailConfig) => TrailAccessResolution;
  isTrailUnlocked: (trailOrId: string | TrailConfig) => boolean;
  activeHandbookTopicId: string | null;
  openHandbookTopic: (topicId: string | null) => void;
  getCityProgress: (cityId: string) => { completed: number; total: number };
  resetViewSignal: number;
  triggerResetView: () => void;
  cameraDistance: number;
  setCameraDistance: (dist: number) => void;
  focusTrailAnchor: [number, number, number] | null;
  setFocusTrailAnchor: (pos: [number, number, number] | null) => void;
  // Robi Mobile + OTP Account & Subscription Session
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  signedIn: boolean;
  accountProfile: ServerAccountProfile | null;
  subscriptionState: SubscriptionState | null;
  applyVerifiedSession: (
    account: ServerAccountProfile | null,
    subscription: SubscriptionState | null,
    wallet?: TokenWalletState | null,
    opts?: { welcomeGrantedNow?: boolean; smsPreview?: SmsPreviewNotification | null },
  ) => void;
  refreshAccountFromServer: () => Promise<void>;
  signOutAccount: () => void;
  updateDisplayName: (nextName: string) => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
  // RobiTrail Token Economy
  tokenWallet: TokenWalletState | null;
  tokenBusy: boolean;
  lastSmsPreview: SmsPreviewNotification | null;
  gateModalState: TokenGateModalState;
  closeGateModal: () => void;
  openGateModalForTrail: (trailOrId: string | TrailConfig) => void;
  tokenToasts: TokenToastItem[];
  dismissTokenToast: (id: string) => void;
  pushTokenToast: (toast: Omit<TokenToastItem, "id">) => void;
  refreshTokenWallet: () => Promise<void>;
  claimWelcomeReward: () => Promise<void>;
  demoRegisterAccount: (opts?: { displayName?: string; phoneNumber?: string }) => Promise<void>;
  unlockTrailWithTokens: (trailId: string) => Promise<boolean>;
  purchaseTokensFromShop: (
    packageId: string,
    simulateOutcome?: "success" | "failure",
  ) => Promise<{ ok: boolean; transaction: TokenTransaction | null }>;
  reportGameMistake: (trailId: string, actionKey: string) => void;
  resetMistakeSession: (trailId?: string) => void;
  mistakeCountInRun: number;
}

const RobiTrailContext = createContext<RobiTrailContextValue | null>(null);

export function RobiTrailProvider({ children }: { children: React.ReactNode }) {
  const { route, navigate } = useAppRouter();
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [previewPassActive, setPreviewPassActive] = useState(false);
  // Default muted on entry until user clicks sound toggle
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeHandbookTopicId, setActiveHandbookTopicId] = useState<string | null>(null);
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [cameraDistance, setCameraDistance] = useState<number>(() =>
    computeDefaultDistance(loadInitialState().activeCityId),
  );
  const [focusTrailAnchor, setFocusTrailAnchor] = useState<[number, number, number] | null>(null);

  // Robi Mobile + OTP Server Account State
  const [authReady] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<ServerAccountProfile | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);

  // RobiTrail Token Economy State
  const [tokenPreviewMode, setTokenPreviewMode] = useState(false);
  const [tokenWallet, setTokenWallet] = useState<TokenWalletState | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [lastSmsPreview, setLastSmsPreview] = useState<SmsPreviewNotification | null>(null);
  const [gateModalState, setGateModalState] = useState<TokenGateModalState>(null);
  const [tokenToasts, setTokenToasts] = useState<TokenToastItem[]>([]);
  const [mistakeCountInRun, setMistakeCountInRun] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const accountRef = useRef(accountProfile);
  accountRef.current = accountProfile;
  const walletRef = useRef(tokenWallet);
  walletRef.current = tokenWallet;
  const mistakeTrackerRef = useRef<{ trailId: string; tracker: MistakeSessionTracker } | null>(
    null,
  );

  const dismissTokenToast = useCallback((id: string) => {
    setTokenToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushTokenToast = useCallback((toast: Omit<TokenToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTokenToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setTokenToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write errors
    }
  }, [state]);

  // Keep activeCityId synced when navigating directly to /cities/:cityId or /games/:cityId(/...)
  useEffect(() => {
    if (
      (route.name === "cities" && route.cityId) ||
      (route.name === "games" && route.cityId) ||
      route.name === "game-session"
    ) {
      const targetCityId = route.cityId;
      if (targetCityId && targetCityId !== state.activeCityId) {
        setState((prev) => ({ ...prev, activeCityId: targetCityId }));
        setCameraDistance(computeDefaultDistance(targetCityId));
      }
    }
  }, [route, state.activeCityId]);

  const applyVerifiedSession = useCallback(
    (
      account: ServerAccountProfile | null,
      subscription: SubscriptionState | null,
      wallet?: TokenWalletState | null,
      opts?: { welcomeGrantedNow?: boolean; smsPreview?: SmsPreviewNotification | null },
    ) => {
      setAuthError(null);
      if (subscription) {
        setSubscriptionState(subscription);
        setPreviewPassActive(Boolean(subscription.entitlementActive));
      }
      if (account) {
        setAccountProfile(account);
        setState((prev) => ({
          ...prev,
          completedTrailIds: sanitizeTrailIds([
            ...prev.completedTrailIds,
            ...account.completedTrailIds,
          ]),
          localCertificateIds: sanitizeCertIds([
            ...prev.localCertificateIds,
            ...account.certificateIds,
          ]),
        }));
      }
      if (wallet) {
        setTokenWallet(wallet);
        writeCachedWallet(wallet);
      } else if (account && !walletRef.current) {
        const cached = readCachedWallet(account.accountId);
        if (cached) setTokenWallet(cached);
      }
      if (opts?.smsPreview) {
        setLastSmsPreview(opts.smsPreview);
      }
      if (opts?.welcomeGrantedNow) {
        pushTokenToast({
          tone: "reward",
          titleEn: "+10 Welcome Tokens",
          titleBn: "+১০টি স্বাগতম টোকেন",
          detailEn: "Credited to your Demo Wallet once for this account.",
          detailBn: "এই অ্যাকাউন্টের জন্য একবার ডেমো ওয়ালেটে যোগ হয়েছে।",
        });
      }
    },
    [pushTokenToast],
  );

  const refreshTokenWallet = useCallback(async () => {
    if (!getSubscriberToken()) return;
    try {
      const data = await fetchWalletFromServer();
      setTokenWallet(data.wallet);
    } catch {
      // Keep cached/current state on transient fetch failures
    }
  }, []);

  const refreshAccountFromServer = useCallback(async () => {
    if (!getSubscriberToken()) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      const data = await fetchCurrentAccount();
      applyVerifiedSession(data.account, data.subscription, data.wallet || null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to refresh account.");
    } finally {
      setAuthBusy(false);
    }
  }, [applyVerifiedSession]);

  const setLang = useCallback((lang: Lang) => {
    setState((prev) => ({ ...prev, lang }));
    if (getSubscriberToken() && accountRef.current) {
      updateServerProfile({ preferredLang: lang })
        .then((acc) => setAccountProfile(acc))
        .catch(() => undefined);
    }
  }, []);

  const setActiveCityId = useCallback((activeCityId: CityId) => {
    setState((prev) => ({ ...prev, activeCityId }));
    setFocusTrailAnchor(null);
    setCameraDistance(computeDefaultDistance(activeCityId));
    setResetViewSignal((n) => n + 1);
    if (getSubscriberToken() && accountRef.current) {
      updateServerProfile({ preferredCityId: activeCityId })
        .then((acc) => setAccountProfile(acc))
        .catch(() => undefined);
    }
  }, []);

  const completeTrail = useCallback((trailId: string) => {
    if (!VALID_TRAIL_IDS.has(trailId)) return;
    setState((prev) => {
      if (prev.completedTrailIds.includes(trailId)) return prev;
      const nextIds = sanitizeTrailIds([...prev.completedTrailIds, trailId]);
      if (getSubscriberToken() && accountRef.current) {
        syncServerProgress({
          completedTrailIds: nextIds,
          certificateIds: prev.localCertificateIds,
        })
          .then((acc) => setAccountProfile(acc))
          .catch(() => undefined);
      }
      return {
        ...prev,
        completedTrailIds: nextIds,
      };
    });
  }, []);

  const registerIssuedCertificate = useCallback((certificateId: string) => {
    if (!certificateId) return;
    setState((prev) => {
      const nextCerts = sanitizeCertIds([...prev.localCertificateIds, certificateId]);
      if (getSubscriberToken() && accountRef.current) {
        syncServerProgress({
          completedTrailIds: prev.completedTrailIds,
          certificateIds: nextCerts,
        })
          .then((acc) => setAccountProfile(acc))
          .catch(() => undefined);
      }
      return {
        ...prev,
        localCertificateIds: nextCerts,
      };
    });
  }, []);

  const signOutAccount = useCallback(() => {
    clearSubscriberToken();
    setAccountProfile(null);
    setSubscriptionState(null);
    setTokenWallet(null);
    setLastSmsPreview(null);
    setPreviewPassActive(false);
    setAuthError(null);
  }, []);

  const updateDisplayName = useCallback(async (nextName: string) => {
    if (!getSubscriberToken()) throw new Error("Must be signed in with mobile OTP.");
    const cleanName = normalizeDisplayName(nextName);
    setAuthError(null);
    setAuthBusy(true);
    try {
      const updated = await updateServerProfile({ displayName: cleanName });
      setAccountProfile(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save player name.";
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const deleteAccountAndData = useCallback(async () => {
    if (!getSubscriberToken()) throw new Error("No authenticated mobile session found.");
    const prevAccountId = accountRef.current?.accountId;
    setAuthError(null);
    setAuthBusy(true);
    try {
      await deleteServerAccount("DELETE");
      clearSubscriberToken();
      clearCachedWallet(prevAccountId);
      setAccountProfile(null);
      setSubscriptionState(null);
      setTokenWallet(null);
      setLastSmsPreview(null);
      setPreviewPassActive(false);
      setState({
        lang: stateRef.current.lang,
        activeCityId: "chattogram",
        completedTrailIds: [],
        localCertificateIds: [],
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account.";
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const getTrailAccess = useCallback(
    (trailOrId: string | TrailConfig): TrailAccessResolution => {
      const trail =
        typeof trailOrId === "string"
          ? getTrailById(trailOrId) || findFreeIntroTrail() || TRAILS[0]
          : trailOrId;
      return resolveTrailAccess({
        trail,
        signedIn: Boolean(accountProfile),
        devTestingMode: DEV_TESTING_MODE,
        tokenPreviewMode,
        unlockedTrailIds: tokenWallet?.unlockedTrailIds || [],
        completedTrailIds: state.completedTrailIds,
        subscriptionActive: false,
      });
    },
    [accountProfile, tokenPreviewMode, tokenWallet?.unlockedTrailIds, state.completedTrailIds],
  );

  const isTrailUnlocked = useCallback(
    (trailOrId: string | TrailConfig) => {
      const trail = typeof trailOrId === "string" ? getTrailById(trailOrId) : trailOrId;
      if (!trail) return false;
      return getTrailAccess(trail).accessible;
    },
    [getTrailAccess],
  );

  const closeGateModal = useCallback(() => {
    setGateModalState(null);
  }, []);

  const openGateModalForTrail = useCallback(
    (trailOrId: string | TrailConfig) => {
      const trail = typeof trailOrId === "string" ? getTrailById(trailOrId) : trailOrId;
      if (!trail) return;
      const access = getTrailAccess(trail);
      if (access.accessible) {
        setGateModalState(null);
        return;
      }
      if (access.requiresRegistration) {
        setGateModalState({ kind: "registration_invite", trail });
        return;
      }
      if (access.requiresTokenUnlock) {
        const balance = walletRef.current?.balance ?? 0;
        if (balance >= access.unlockCost) {
          setGateModalState({
            kind: "unlock_confirm",
            trail,
            unlockCost: access.unlockCost,
          });
        } else {
          setGateModalState({
            kind: "insufficient_tokens",
            trail,
            requiredTokens: access.unlockCost,
          });
        }
      }
    },
    [getTrailAccess],
  );

  const openTrail = useCallback(
    (trailId: string) => {
      const trail = getTrailById(trailId);
      if (!trail) return;
      const access = getTrailAccess(trail);
      if (!access.accessible) {
        openGateModalForTrail(trail);
        return;
      }
      setState((prev) =>
        prev.activeCityId === trail.cityId ? prev : { ...prev, activeCityId: trail.cityId },
      );
      navigate(`/games/${trail.cityId}/${trail.id}`);
    },
    [getTrailAccess, navigate, openGateModalForTrail],
  );

  const closeTrail = useCallback(() => {
    setFocusTrailAnchor(null);
    navigate(`/games/${state.activeCityId}`);
  }, [navigate, state.activeCityId]);

  const claimWelcomeReward = useCallback(async () => {
    if (!getSubscriberToken()) return;
    setTokenBusy(true);
    try {
      const res = await claimWelcomeTokensOnce();
      setTokenWallet(res.wallet);
      if (res.smsPreview) setLastSmsPreview(res.smsPreview);
      if (res.grantedNow) {
        pushTokenToast({
          tone: "reward",
          titleEn: "+10 Welcome Tokens",
          titleBn: "+১০টি স্বাগতম টোকেন",
          detailEn: "Added to your Demo Wallet.",
          detailBn: "আপনার ডেমো ওয়ালেটে যোগ হয়েছে।",
        });
      }
    } finally {
      setTokenBusy(false);
    }
  }, [pushTokenToast]);

  const demoRegisterAccount = useCallback(
    async (opts: { displayName?: string; phoneNumber?: string } = {}) => {
      setAuthError(null);
      setAuthBusy(true);
      try {
        const res = await registerDemoPreviewAccount({
          displayName: opts.displayName,
          phoneNumber: opts.phoneNumber,
          localCompletedTrailIds: stateRef.current.completedTrailIds,
          localCertificateIds: stateRef.current.localCertificateIds,
          preferredLang: stateRef.current.lang,
          preferredCityId: stateRef.current.activeCityId,
        });
        applyVerifiedSession(res.account, res.subscription, res.wallet, {
          welcomeGrantedNow: res.welcomeGrantedNow,
          smsPreview: res.smsPreview,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Demo registration failed.";
        setAuthError(msg);
        throw new Error(msg);
      } finally {
        setAuthBusy(false);
      }
    },
    [applyVerifiedSession],
  );

  const unlockTrailWithTokens = useCallback(
    async (trailId: string): Promise<boolean> => {
      const trail = getTrailById(trailId);
      if (!trail) return false;
      if (isFreeIntroTrail(trail)) {
        setGateModalState(null);
        navigate(`/games/${trail.cityId}/${trail.id}`);
        return true;
      }
      setTokenBusy(true);
      try {
        const res = await unlockTrailOnServer(trail.id, {
          titleEn: trail.title.en,
          titleBn: trail.title.bn,
        });
        setTokenWallet(res.wallet);
        setGateModalState(null);
        if (!res.alreadyUnlocked && res.deducted > 0) {
          pushTokenToast({
            tone: "info",
            titleEn: `-${res.deducted} Tokens · Mission Unlocked`,
            titleBn: `-${res.deducted} টোকেন · মিশন আনলক সম্পন্ন`,
            detailEn: trail.title.en,
            detailBn: trail.title.bn,
          });
        }
        setState((prev) =>
          prev.activeCityId === trail.cityId ? prev : { ...prev, activeCityId: trail.cityId },
        );
        navigate(`/games/${trail.cityId}/${trail.id}`);
        return true;
      } catch (err) {
        const insufficient = Boolean((err as { insufficientTokens?: boolean }).insufficientTokens);
        const updatedWallet = (err as { wallet?: TokenWalletState }).wallet;
        if (updatedWallet) setTokenWallet(updatedWallet);
        if (insufficient) {
          setGateModalState({
            kind: "insufficient_tokens",
            trail,
            requiredTokens: 2,
          });
        } else {
          pushTokenToast({
            tone: "error",
            titleEn: "Unable to Unlock",
            titleBn: "আনলক করা যায়নি",
            detailEn: err instanceof Error ? err.message : "Please try again.",
            detailBn: err instanceof Error ? err.message : "আবার চেষ্টা করুন।",
          });
        }
        return false;
      } finally {
        setTokenBusy(false);
      }
    },
    [navigate, pushTokenToast],
  );

  const purchaseTokensFromShop = useCallback(
    async (packageId: string, simulateOutcome: "success" | "failure" = "success") => {
      setTokenBusy(true);
      try {
        const res = await purchaseTokenPackage(packageId, { simulateOutcome });
        setTokenWallet(res.wallet);
        if (res.smsPreview) setLastSmsPreview(res.smsPreview);
        pushTokenToast({
          tone: "reward",
          titleEn: `+${res.transaction.amount} Tokens Purchased (Demo)`,
          titleBn: `+${res.transaction.amount}টি টোকেন যুক্ত হয়েছে (ডেমো)`,
          detailEn: "Payment simulation succeeded — zero real balance charged.",
          detailBn: "পেমেন্ট সিমুলেশন সফল — আসল কোনো টাকা কাটা হয়নি।",
        });
        return { ok: true, transaction: res.transaction };
      } catch (err) {
        const updatedWallet = (err as { wallet?: TokenWalletState }).wallet;
        const failedTx = (err as { transaction?: TokenTransaction }).transaction || null;
        if (updatedWallet) setTokenWallet(updatedWallet);
        pushTokenToast({
          tone: "error",
          titleEn: "Simulated Payment Failed",
          titleBn: "সিমুলেটেড পেমেন্ট ব্যর্থ হয়েছে",
          detailEn: "No tokens were added and no real balance was deducted.",
          detailBn: "কোনো টোকেন যোগ হয়নি এবং আসল ব্যালেন্স থেকেও টাকা কাটা হয়নি।",
        });
        return { ok: false, transaction: failedTx };
      } finally {
        setTokenBusy(false);
      }
    },
    [pushTokenToast],
  );

  const resetMistakeSession = useCallback((trailId?: string) => {
    if (trailId) {
      mistakeTrackerRef.current = {
        trailId,
        tracker: new MistakeSessionTracker(trailId),
      };
    } else {
      mistakeTrackerRef.current?.tracker.reset();
    }
    setMistakeCountInRun(0);
  }, []);

  const reportGameMistake = useCallback(
    (trailId: string, actionKey: string) => {
      const trail = getTrailById(trailId);
      if (!trail || !isMistakeTrackingEnabledForTrail(trail)) {
        return;
      }

      if (!mistakeTrackerRef.current || mistakeTrackerRef.current.trailId !== trailId) {
        mistakeTrackerRef.current = {
          trailId,
          tracker: new MistakeSessionTracker(trailId),
        };
      }

      const outcome = mistakeTrackerRef.current.tracker.recordMistake(actionKey);
      if (!outcome.counted) return;

      setMistakeCountInRun(outcome.mistakeCount);

      if (outcome.warningStage === "warn_next_costs_1") {
        pushTokenToast({
          tone: "warning",
          titleEn: "Try again! One more mistake will cost 1 token.",
          titleBn: "আবার চেষ্টা করুন! আর একটি ভুল হলে ১টি টোকেন কমবে।",
        });
        return;
      }

      if (outcome.warningStage === "deducted_1") {
        const hasSession = Boolean(getSubscriberToken() && accountRef.current);
        if (!hasSession) {
          pushTokenToast({
            tone: "info",
            titleEn: "2nd Mistake Recorded (Guest Mode)",
            titleBn: "২য় ভুল চিহ্নিত হয়েছে (গেস্ট মোড)",
            detailEn: "Create an account to link token balance & rewards.",
            detailBn: "টোকেন ব্যালেন্স ও পুরস্কার সংরক্ষণে অ্যাকাউন্ট তৈরি করুন।",
          });
          return;
        }

        const currentBalance = walletRef.current?.balance ?? 0;
        if (currentBalance <= 0) {
          pushTokenToast({
            tone: "info",
            titleEn: "0 Tokens — Free Practice Active",
            titleBn: "০ টোকেন — বিনামূল্যে অনুশীলন চালু আছে",
            detailEn: "Your progress is safe and balance never drops below 0.",
            detailBn: "আপনার অগ্রগতি সুরক্ষিত এবং ব্যালেন্স কখনো ঋণাত্মক হবে না।",
          });
          return;
        }

        const idempotencyKey = `mistake:${trailId}:${outcome.mistakeCount}:${Date.now()}`;
        deductMistakeTokenOnServer(trailId, {
          titleEn: trail.title.en,
          titleBn: trail.title.bn,
          idempotencyKey,
        })
          .then((res) => {
            setTokenWallet(res.wallet);
            if (res.deducted > 0) {
              pushTokenToast({
                tone: "penalty",
                titleEn: "-1 Token",
                titleBn: "-১ টোকেন",
                detailEn: `2 validated mistakes in ${trail.title.en}`,
                detailBn: `${trail.title.bn}-এ ২টি ভুলের কারণে`,
              });
            }
          })
          .catch(() => undefined);
      }
    },
    [pushTokenToast],
  );

  const getCityProgress = useCallback(
    (cityId: string) => {
      const cityTrails = TRAILS.filter((tr) => tr.cityId === cityId);
      const completed = cityTrails.filter((tr) => state.completedTrailIds.includes(tr.id)).length;
      return { completed, total: cityTrails.length };
    },
    [state.completedTrailIds],
  );

  const triggerResetView = useCallback(() => {
    setFocusTrailAnchor(null);
    setCameraDistance(computeDefaultDistance(state.activeCityId));
    setResetViewSignal((n) => n + 1);
  }, [state.activeCityId]);

  const activeCity = getCityById(state.activeCityId);
  const activeTrail = route.name === "game-session" ? getTrailById(route.gameId) || null : null;

  return (
    <RobiTrailContext.Provider
      value={{
        lang: state.lang,
        setLang,
        activeCity,
        setActiveCityId,
        completedTrailIds: state.completedTrailIds,
        localCertificateIds: state.localCertificateIds,
        completeTrail,
        registerIssuedCertificate,
        activeTrail,
        openTrail,
        closeTrail,
        quality: "high",
        soundEnabled,
        setSoundEnabled,
        previewPassActive,
        setPreviewPassActive,
        devTestingMode: DEV_TESTING_MODE,
        tokenPreviewMode,
        setTokenPreviewMode,
        getTrailAccess,
        isTrailUnlocked,
        activeHandbookTopicId,
        openHandbookTopic: setActiveHandbookTopicId,
        getCityProgress,
        resetViewSignal,
        triggerResetView,
        cameraDistance,
        setCameraDistance,
        focusTrailAnchor,
        setFocusTrailAnchor,
        authReady,
        authBusy,
        authError,
        signedIn: Boolean(accountProfile),
        accountProfile,
        subscriptionState,
        applyVerifiedSession,
        refreshAccountFromServer,
        signOutAccount,
        updateDisplayName,
        deleteAccountAndData,
        tokenWallet,
        tokenBusy,
        lastSmsPreview,
        gateModalState,
        closeGateModal,
        openGateModalForTrail,
        tokenToasts,
        dismissTokenToast,
        pushTokenToast,
        refreshTokenWallet,
        claimWelcomeReward,
        demoRegisterAccount,
        unlockTrailWithTokens,
        purchaseTokensFromShop,
        reportGameMistake,
        resetMistakeSession,
        mistakeCountInRun,
      }}
    >
      {children}
    </RobiTrailContext.Provider>
  );
}

export function useRobiTrail() {
  const ctx = useContext(RobiTrailContext);
  if (!ctx) throw new Error("useRobiTrail must be used inside RobiTrailProvider");
  return ctx;
}
