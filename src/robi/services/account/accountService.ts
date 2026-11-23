import { getSubscriberToken } from "../auth/sessionMemory";
import type { CityId } from "../../context/RobiTrailContext";
import type { Lang } from "../../data/translations/dictionary";
import type { ServerAccountProfile, SubscriptionState } from "../bdapps/bdappsClient";
import type { TokenWalletState } from "../tokens/TokenTransactionService";

export async function fetchCurrentAccount(): Promise<{
  mode: "preview" | "production";
  account: ServerAccountProfile;
  subscription: SubscriptionState;
  wallet?: TokenWalletState;
}> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch("/api/account/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    mode: "preview" | "production";
    account: ServerAccountProfile;
    subscription: SubscriptionState;
    wallet?: TokenWalletState;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Unable to load account");
  return data;
}

export async function updateServerProfile(patch: {
  displayName?: string;
  preferredLang?: Lang;
  preferredCityId?: CityId;
}): Promise<ServerAccountProfile> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Please sign in first.");
  const res = await fetch("/api/account/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as { account: ServerAccountProfile; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to save profile");
  return data.account;
}

export async function syncServerProgress(payload: {
  completedTrailIds: string[];
  certificateIds: string[];
}): Promise<ServerAccountProfile> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch("/api/account/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { account: ServerAccountProfile; error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to sync progress");
  return data.account;
}

export async function deleteServerAccount(confirmDelete: string): Promise<void> {
  const token = getSubscriberToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch("/api/account/me", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirmDelete }),
  });
  const data = (await res.json()) as { deleted?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error || "Account deletion failed");
}
