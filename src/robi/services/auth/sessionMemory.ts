// In-memory session token store (never persisted to localStorage or sessionStorage)
let inMemorySubscriberToken: string | null = null;

export function setSubscriberToken(token: string | null) {
  inMemorySubscriberToken = token;
}

export function getSubscriberToken(): string | null {
  return inMemorySubscriberToken;
}

export function clearSubscriberToken() {
  inMemorySubscriberToken = null;
}
