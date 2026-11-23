import { getSubscriberToken } from "../auth/sessionMemory";
import type { CityId } from "../../context/RobiTrailContext";
import type { Lang } from "../../data/translations/dictionary";
import type { ServerAccountProfile, SubscriptionState } from "../bdapps/bdappsClient";
import type { SmsPreviewNotification, TokenWalletState } from "../tokens/TokenTransactionService";

export interface SubscribeResponse {
  mode: "preview" | "production";
  entitlementActive: boolean;
  productionEntitlement: boolean;
  notice?: string;
  account: ServerAccountProfile;
  subscription: SubscriptionState;
  wallet?: TokenWalletState;
  welcomeGrantedNow?: boolean;
  smsPreview?: SmsPreviewNotification | null;
}

export async function activateTrailPassSubscription(
  consentAccepted: boolean,
  opts: {
    displayName?: string;
    localCompletedTrailIds?: string[];
    localCertificateIds?: string[];
    preferredLang?: Lang;
    preferredCityId?: CityId;
  } = {},
): Promise<SubscribeResponse> {
  const token = getSubscriberToken();
  const res = await fetch("/api/bdapps/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      consentAccepted,
      displayName: opts.displayName,
      localCompletedTrailIds: opts.localCompletedTrailIds || [],
      localCertificateIds: opts.localCertificateIds || [],
      preferredLang: opts.preferredLang || "en",
      preferredCityId: opts.preferredCityId || "chattogram",
    }),
  });
  const data = (await res.json()) as SubscribeResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "Subscription request failed");
  return data;
}

export async function unsubscribeTrailPass(): Promise<{
  unsubscribed: boolean;
  subscription: SubscriptionState;
}> {
  const token = getSubscriberToken();
  const res = await fetch("/api/bdapps/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json()) as {
    unsubscribed: boolean;
    subscription: SubscriptionState;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Unsubscribe request failed");
  return data;
}

export async function fetchSubscriptionStatus(): Promise<{
  mode: "preview" | "production";
  subscription: SubscriptionState;
}> {
  const token = getSubscriberToken();
  const res = await fetch("/api/bdapps/status", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = (await res.json()) as {
    mode: "preview" | "production";
    subscription: SubscriptionState;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Status check failed");
  return data;
}
