import crypto from "node:crypto";

export interface PhpGatewayConfig {
  phpBaseUrl: string;
  sharedSecret: string;
  callbackSharedSecret: string;
  appId: string;
  mode: "preview" | "production";
  liveChargingEnabled: boolean;
  subscriptionEnabled: boolean;
  configured: boolean;
}

export function getPhpGatewayConfig(): PhpGatewayConfig {
  const env = process.env as Record<string, string | undefined>;
  const phpBaseUrl = (env.BDAPPS_PHP_BASE_URL || "").trim().replace(/\/+$/, "");
  const sharedSecret = (env.PHP_GATEWAY_SHARED_SECRET || "").trim();
  const callbackSharedSecret = (env.NODE_CALLBACK_SHARED_SECRET || sharedSecret).trim();
  const appId = (env.BDAPPS_APP_ID || "APP_140847").trim();
  const mode: "preview" | "production" =
    env.BDAPPS_MODE === "production" ? "production" : "preview";
  const liveChargingEnabled = env.BDAPPS_LIVE_CHARGING_ENABLED === "true";
  const subscriptionEnabled = env.BDAPPS_SUBSCRIPTION_ENABLED === "true";

  const configured =
    Boolean(phpBaseUrl) &&
    Boolean(sharedSecret) &&
    !sharedSecret.startsWith("REPLACE_WITH_") &&
    isAllowedGatewayBaseUrl(phpBaseUrl);

  return {
    phpBaseUrl,
    sharedSecret,
    callbackSharedSecret,
    appId,
    mode,
    liveChargingEnabled,
    subscriptionEnabled,
    configured,
  };
}

export function isAllowedGatewayBaseUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  rawBody: string,
): string {
  const canonical = `${timestamp}.${method.toUpperCase()}.${requestPath}.${rawBody}`;
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

export function signPhpGatewayHeaders(
  secret: string,
  method: string,
  requestPath: string,
  rawBody: string,
  timestampSeconds = Math.floor(Date.now() / 1000),
): Record<string, string> {
  const ts = String(timestampSeconds);
  const sig = buildHmacSignature(secret, ts, method, requestPath, rawBody);
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-RobiTrail-Timestamp": ts,
    "X-RobiTrail-Signature": sig,
  };
}

export function verifyPhpCallbackSignature(
  headers: Record<string, string | undefined>,
  method: string,
  requestPath: string,
  rawBody: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string } {
  const cfg = getPhpGatewayConfig();
  const secret = cfg.callbackSharedSecret;
  if (!secret || secret.startsWith("REPLACE_WITH_")) {
    return { ok: false, reason: "Callback shared secret is not configured on Node.js backend." };
  }

  const ts = (headers["x-robitrail-timestamp"] || headers["X-RobiTrail-Timestamp"] || "").trim();
  const sig = (headers["x-robitrail-signature"] || headers["X-RobiTrail-Signature"] || "").trim();

  if (!ts || !sig || !/^\d+$/.test(ts)) {
    return { ok: false, reason: "Missing or malformed X-RobiTrail-Timestamp / Signature." };
  }

  const tsInt = Number(ts);
  const nowSec = Math.floor(nowMs / 1000);
  if (Math.abs(nowSec - tsInt) > 300) {
    return { ok: false, reason: "Callback timestamp outside replay protection window." };
  }

  const expected = buildHmacSignature(secret, ts, method, requestPath, rawBody);
  const a = Buffer.from(expected.toLowerCase(), "utf8");
  const b = Buffer.from(sig.toLowerCase(), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "Invalid callback HMAC signature." };
  }

  return { ok: true };
}

export interface PhpGatewayResponse<T = Record<string, unknown>> {
  ok: boolean;
  httpStatus: number;
  data: T;
  error?: string;
}

export async function callPhpGateway<T extends Record<string, unknown>>(
  endpointFile: string,
  payload: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<PhpGatewayResponse<T>> {
  const cfg = getPhpGatewayConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      httpStatus: 503,
      data: { errorCode: "PHP_GATEWAY_NOT_CONFIGURED" } as unknown as T,
      error: "BDAPPS_PHP_BASE_URL or PHP_GATEWAY_SHARED_SECRET is not configured.",
    };
  }

  const targetUrl = new URL(`${cfg.phpBaseUrl}/${endpointFile.replace(/^\/+/, "")}`);
  const rawBody = JSON.stringify(payload);
  const headers = signPhpGatewayHeaders(cfg.sharedSecret, "POST", targetUrl.pathname, rawBody);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetcher(targetUrl.toString(), {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      return {
        ok: false,
        httpStatus: 502,
        data: {} as T,
        error: "PHP gateway returned non-JSON response.",
      };
    }
    return {
      ok: res.ok && Boolean(parsed.ok ?? res.ok),
      httpStatus: res.status,
      data: parsed,
      error:
        typeof parsed.error === "string"
          ? parsed.error
          : typeof parsed.statusDetail === "string" && !res.ok
            ? parsed.statusDetail
            : undefined,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      httpStatus: 502,
      data: {} as T,
      error: isAbort
        ? "PHP gateway request timed out."
        : "Network failure communicating with PHP gateway.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendSmsViaPhpGateway(
  msisdn: string,
  message: string,
  fetcher?: typeof fetch,
) {
  return callPhpGateway<{
    ok?: boolean;
    statusCode?: string;
    statusDetail?: string;
    deliveredLive?: boolean;
  }>("sms_send.php", { msisdn, message }, fetcher);
}

export async function requestOtpViaPhpGateway(
  msisdn: string,
  referenceNo: string,
  intent: "register" | "login" = "register",
  fetcher?: typeof fetch,
) {
  return callPhpGateway<{
    ok?: boolean;
    statusCode?: string;
    statusDetail?: string;
    referenceNo?: string;
    subscriptionActivated?: boolean;
  }>("otp_request.php", { msisdn, referenceNo, intent }, fetcher);
}

export async function verifyOtpViaPhpGateway(
  msisdn: string,
  referenceNo: string,
  otp: string,
  fetcher?: typeof fetch,
) {
  return callPhpGateway<{
    ok?: boolean;
    verified?: boolean;
    statusCode?: string;
    statusDetail?: string;
    subscriptionActivated?: boolean;
  }>("otp_verify.php", { msisdn, referenceNo, otp }, fetcher);
}

export async function chargeCaasViaPhpGateway(
  params: {
    msisdn: string;
    packageId: string;
    tokens: number;
    priceBdt: number;
    externalTrxId: string;
    userConfirmed: boolean;
  },
  fetcher?: typeof fetch,
) {
  return callPhpGateway<{
    ok?: boolean;
    blocked?: boolean;
    txState?: "pending" | "confirmed" | "failed";
    externalTrxId?: string;
    statusCode?: string;
    statusDetail?: string;
    error?: string;
  }>("caas_charge.php", params, fetcher);
}

export async function getSubscriptionStatusViaPhpGateway(msisdn: string, fetcher?: typeof fetch) {
  return callPhpGateway<{
    ok?: boolean;
    statusCode?: string;
    statusDetail?: string;
    subscriptionStatus?: string;
  }>("subscription_status.php", { msisdn }, fetcher);
}

export async function subscribeViaPhpGateway(
  msisdn: string,
  consentAccepted: boolean,
  fetcher?: typeof fetch,
) {
  return callPhpGateway<{
    ok?: boolean;
    blocked?: boolean;
    statusCode?: string;
    statusDetail?: string;
  }>("subscription_subscribe.php", { msisdn, consentAccepted }, fetcher);
}

export async function unsubscribeViaPhpGateway(msisdn: string, fetcher?: typeof fetch) {
  return callPhpGateway<{
    ok?: boolean;
    statusCode?: string;
    statusDetail?: string;
  }>("subscription_unsubscribe.php", { msisdn }, fetcher);
}
