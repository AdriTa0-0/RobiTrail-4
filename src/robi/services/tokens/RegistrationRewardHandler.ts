import { getSubscriberToken, setSubscriberToken } from "../auth/sessionMemory";
import type { CityId } from "../../context/RobiTrailContext";
import type { Lang } from "../../data/translations/dictionary";
import type {
  PersistenceBackend,
  ServerAccountProfile,
  SubscriptionState,
} from "../bdapps/bdappsClient";
import type {
  SmsPreviewNotification,
  TokenTransaction,
  TokenWalletState,
} from "./TokenTransactionService";
import { writeCachedWallet } from "./TokenWalletService";

export async function claimWelcomeTokensOnce(): Promise<{
  grantedNow: boolean;
  wallet: TokenWalletState;
  transaction: TokenTransaction | null;
  smsPreview: SmsPreviewNotification | null;
}> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Authentication required");
  const res = await fetch("/api/tokens/claim-welcome", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json()) as {
    grantedNow: boolean;
    wallet: TokenWalletState;
    transaction: TokenTransaction | null;
    smsPreview: SmsPreviewNotification | null;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Unable to claim welcome tokens");
  writeCachedWallet(data.wallet);
  return data;
}

export async function registerDemoPreviewAccount(
  opts: {
    phoneNumber?: string;
    displayName?: string;
    localCompletedTrailIds?: string[];
    localCertificateIds?: string[];
    preferredLang?: Lang;
    preferredCityId?: CityId;
  } = {},
): Promise<{
  verified: boolean;
  mode: "preview";
  persistenceBackend?: PersistenceBackend;
  persistedToFirestore?: boolean;
  token: string;
  maskedNumber: string;
  accountActivated: boolean;
  account: ServerAccountProfile;
  subscription: SubscriptionState;
  wallet: TokenWalletState;
  welcomeGrantedNow: boolean;
  smsPreview: SmsPreviewNotification | null;
  notice?: string;
}> {
  const res = await fetch("/api/account/demo-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = (await res.json()) as {
    verified: boolean;
    mode: "preview";
    persistenceBackend?: PersistenceBackend;
    persistedToFirestore?: boolean;
    token: string;
    maskedNumber: string;
    accountActivated: boolean;
    account: ServerAccountProfile;
    subscription: SubscriptionState;
    wallet: TokenWalletState;
    welcomeGrantedNow: boolean;
    smsPreview: SmsPreviewNotification | null;
    notice?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Demo registration failed");
  setSubscriberToken(data.token);
  if (data.wallet) {
    writeCachedWallet(data.wallet);
  }
  return data;
}
