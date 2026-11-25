const SUBSCRIBER_TOKEN_STORAGE_KEY = "robitrail_subscriber_token_v1";

let inMemorySubscriberToken: string | null = null;

function readStoredToken(): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(SUBSCRIBER_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function setSubscriberToken(token: string | null) {
  inMemorySubscriberToken = token;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) {
        window.localStorage.setItem(SUBSCRIBER_TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(SUBSCRIBER_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage write errors
  }
}

export function getSubscriberToken(): string | null {
  if (!inMemorySubscriberToken) {
    inMemorySubscriberToken = readStoredToken();
  }
  return inMemorySubscriberToken;
}

export function clearSubscriberToken() {
  inMemorySubscriberToken = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(SUBSCRIBER_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
}
