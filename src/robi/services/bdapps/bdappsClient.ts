import { getSubscriberToken, setSubscriberToken } from "../auth/sessionMemory";
import type { CityId } from "../../context/RobiTrailContext";
import type { Lang } from "../../data/translations/dictionary";
import type { SmsPreviewNotification, TokenWalletState } from "../tokens/TokenTransactionService";

export interface SubscriptionTerms {
  planName: string;
  priceLabel: string;
  billingFrequency: string;
  renewalTerms: string;
  cancellationMethod: string;
  shortCode: string;
}

export interface EligibilityResponse {
  mode: "preview" | "production";
  maskedNumber: string;
  accountExists?: boolean;
  formatValid?: boolean;
  operatorVerified: boolean;
  eligibleForPreviewFlow?: boolean;
  terms: SubscriptionTerms;
  limitationNote: string | null;
}

export interface OtpRequestResponse {
  mode: "preview" | "production";
  referenceNo: string;
  maskedNumber: string;
  expiresInSeconds: number;
  previewOnlyOtp?: string;
  notice?: string;
}

export interface SubscriptionState {
  msisdn: string;
  status: "inactive" | "active_preview" | "active_production" | "unsubscribed";
  mode: "preview" | "production";
  planName?: string;
  priceLabel?: string;
  billingFrequency?: string;
  renewalTerms?: string;
  cancellationMethod?: string;
  consentTimestamp: string | null;
  nextRenewalAt?: string | null;
  entitlementActive: boolean;
  updatedAt?: string;
}

export interface PlayerAchievementRecord {
  id: string;
  cityId: "chattogram" | "dhaka" | "sylhet" | "national";
  titleEn: string;
  titleBn: string;
  unlockedAt: string;
}

export interface SavedCertificateSummary {
  certificateId: string;
  learnerName: string;
  completedTrailIds: string[];
  scorePercent: number;
  passed: boolean;
  issuedAt: string;
  prototypeLabel: string;
}

export type PersistenceBackend = "memory_preview" | "firestore" | "firestore_unconfigured";

export interface ServerAccountProfile {
  accountId: string;
  maskedPhone: string;
  displayName: string;
  authMethod?: "robi_direct" | "otp" | "demo";
  completedTrailIds: string[];
  achievements: PlayerAchievementRecord[];
  certificateIds: string[];
  certificates: SavedCertificateSummary[];
  preferredLang: Lang;
  preferredCityId: CityId;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface OtpVerifyResponse {
  verified: boolean;
  authMethod?: "robi_direct" | "otp" | "demo";
  mode: "preview" | "production";
  persistenceBackend?: PersistenceBackend;
  persistedToFirestore?: boolean;
  token: string;
  maskedNumber: string;
  accountActivated: boolean;
  account: ServerAccountProfile | null;
  subscription: SubscriptionState;
  wallet?: TokenWalletState | null;
  welcomeGrantedNow?: boolean;
  smsPreview?: SmsPreviewNotification | null;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
  withAuth = false,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = getSubscriberToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function checkOperatorEligibility(phoneNumber: string): Promise<EligibilityResponse> {
  return postJson<EligibilityResponse>("/api/bdapps/eligibility", { phoneNumber });
}

export async function requestBdappsOtp(
  phoneNumber: string,
  opts: { intent?: "login" | "register" | "subscribe"; consentAccepted?: boolean } = {},
): Promise<OtpRequestResponse> {
  return postJson<OtpRequestResponse>("/api/bdapps/otp/request", {
    phoneNumber,
    intent: opts.intent || "register",
    consentAccepted: Boolean(opts.consentAccepted),
  });
}

export async function verifyBdappsOtp(
  referenceNo: string,
  otp: string,
  opts: {
    intent?: "login" | "register" | "subscribe";
    displayName?: string;
    localCompletedTrailIds?: string[];
    localCertificateIds?: string[];
    preferredLang?: Lang;
    preferredCityId?: CityId;
  } = {},
): Promise<OtpVerifyResponse> {
  const result = await postJson<OtpVerifyResponse>("/api/bdapps/otp/verify", {
    referenceNo,
    otp,
    intent: opts.intent || "register",
    displayName: opts.displayName,
    localCompletedTrailIds: opts.localCompletedTrailIds || [],
    localCertificateIds: opts.localCertificateIds || [],
    preferredLang: opts.preferredLang || "en",
    preferredCityId: opts.preferredCityId || "chattogram",
  });
  setSubscriberToken(result.token);
  return result;
}

export function inspectRobiPhoneNumber(raw: string): {
  cleaned: string;
  validBdFormat: boolean;
  isRobiPrefix: boolean;
  prefix: string | null;
} {
  const cleaned = raw.replace(/^tel:/i, "").replace(/[\s-]/g, "");
  const localMatch = cleaned.match(/^(?:\+?88)?(01[3-9]\d{0,8})$/);
  const localDigits = localMatch ? localMatch[1] : null;
  const prefix = localDigits && localDigits.length >= 3 ? localDigits.slice(0, 3) : null;
  const validBdFormat = Boolean(localDigits && /^01[3-9]\d{8}$/.test(localDigits));
  const isRobiPrefix = Boolean(localDigits && /^01[68]\d{8}$/.test(localDigits));
  return {
    cleaned,
    validBdFormat,
    isRobiPrefix,
    prefix,
  };
}

export async function directRobiAuth(
  phoneNumber: string,
  opts: {
    intent?: "login" | "register";
    displayName?: string;
    localCompletedTrailIds?: string[];
    localCertificateIds?: string[];
    preferredLang?: Lang;
    preferredCityId?: CityId;
  } = {},
): Promise<OtpVerifyResponse & { authMethod?: "robi_direct" }> {
  const result = await postJson<OtpVerifyResponse & { authMethod?: "robi_direct" }>(
    "/api/account/robi-direct",
    {
      phoneNumber,
      intent: opts.intent || "register",
      displayName: opts.displayName,
      localCompletedTrailIds: opts.localCompletedTrailIds || [],
      localCertificateIds: opts.localCertificateIds || [],
      preferredLang: opts.preferredLang || "en",
      preferredCityId: opts.preferredCityId || "chattogram",
    },
  );
  setSubscriberToken(result.token);
  return result;
}
