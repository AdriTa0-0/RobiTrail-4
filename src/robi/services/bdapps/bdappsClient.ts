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

export interface ServerAccountProfile {
  accountId: string;
  maskedPhone: string;
  displayName: string;
  completedTrailIds: string[];
  achievements: PlayerAchievementRecord[];
  certificateIds: string[];
  certificates: SavedCertificateSummary[];
  preferredLang: Lang;
  preferredCityId: CityId;
  createdAt: string;
  updatedAt: string;
}

export interface OtpVerifyResponse {
  verified: boolean;
  mode: "preview" | "production";
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
