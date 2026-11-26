import crypto from "node:crypto";
import {
  sanitizePublicAccount,
  sanitizeTrailIds,
  type CertificateRecord,
  type SubscriptionRecord,
} from "./dbStore";
import {
  buildSmsNotificationPreview,
  dispatchBdappsSmsNotification,
  executeBdappsSubscriptionPurchase,
  getBdappsRuntimeConfig,
  getTokenPackageById,
  normalizeBdappsSubscriptionStatus,
  TOKEN_SHOP_PACKAGES,
} from "./bdappsIntegration";
import {
  getSubscriptionStatusViaPhpGateway,
  chargeCaasViaPhpGateway,
  queryCaasBalanceViaPhpGateway,
  subscribeViaPhpGateway,
  unsubscribeViaPhpGateway,
  verifyPhpCallbackSignature,
  requestOtpViaPhpGateway,
  verifyOtpViaPhpGateway,
} from "./phpGatewayClient";
import {
  createLivePendingPurchase,
  deleteAccountData,
  getLiveChargingGateStatus,
  getLivePurchaseOrder,
  getLiveSubscriptionGateStatus,
  getPersistenceBackend,
  grantWelcomeTokensIdempotent,
  loadAccount,
  loadCertificate,
  persistCertificate,
  loadOrInitWallet,
  loadSubscription,
  persistSubscription,
  recordMistakePenaltyIdempotent,
  saveOrUpdateAccount,
  settleLivePurchase,
  settlePendingSubscriptionPurchaseForMsisdn,
  shouldUseFirestorePersistence,
  unlockTrailWithTokensIdempotent,
} from "./walletPersistence";
import {
  fsCreateLoginOtp,
  fsMarkLoginOtpSent,
  isFirestorePersistenceConfigured,
} from "./firestoreWalletStore";
import { createMiniApp, type Request, type Response, type NextFunction } from "./miniApp";

const app = createMiniApp();

// Ephemeral in-memory fallback signing key when SESSION_SIGNING_KEY is not configured
let cachedKey: string | null = null;
function getSigningKey(): string {
  if (!cachedKey) {
    const env = process.env as Record<string, string | undefined>;
    if (env.BDAPPS_MODE === "production" && !env.SESSION_SIGNING_KEY) {
      throw new Error("SESSION_SIGNING_KEY must be configured for production sessions.");
    }
    cachedKey = env.SESSION_SIGNING_KEY || crypto.randomBytes(32).toString("hex");
  }
  return cachedKey;
}

function getRuntimeSettings() {
  const cfg = getBdappsRuntimeConfig();
  return {
    mode: cfg.mode,
    shortCode: cfg.shortCode,
    appId: cfg.appId,
    credentialsConfigured: cfg.apiSecretConfigured,
    phpGatewayConfigured: cfg.phpGatewayConfigured,
    liveChargingEnabled: cfg.liveChargingEnabled,
    subscriptionEnabled: cfg.subscriptionEnabled,
  };
}

// Separate bdapps approval gate for CaaS checkout. OTP verification may activate
// a subscription, so both subscription consent and one-time charging approval
// must be configured before requesting a token-purchase OTP.
function tokenCheckoutGate(): { allowed: boolean; reason: string | null } {
  const sub = getLiveSubscriptionGateStatus();
  const charge = getLiveChargingGateStatus();
  if (!sub.allowed) return sub;
  if (!charge.allowed) return charge;
  if (process.env.ROBITRAIL_CARRIER_CHECKOUT_APPROVED !== "true" ||
      !(process.env.ROBITRAIL_SUBSCRIPTION_TERMS_TEXT || "").trim()) {
    return { allowed: false, reason: "Checkout requires explicit bdapps approval and the approved subscription disclosure text." };
  }
  return { allowed: true, reason: null };
}

function buildSubscriptionDisclosure(mode: "preview" | "production", shortCode: string) {
  return {
    planName: "RobiTrail Free Subscription",
    priceLabel: mode === "production" ? "Free (BDT 0)" : "Gateway Configuration Required",
    billingFrequency: "No subscription fee",
    renewalTerms:
      "No subscription charge is configured. Optional token purchases are separate and require their own approved payment confirmation.",
    cancellationMethod: "Use the in-app unsubscribe control to cancel this subscription.",
    shortCode,
  };
}

function normalizeMsisdn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/^tel:/i, "").replace(/[\s-]/g, "");
  const match = cleaned.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  if (!match) return null;
  return `88${match[1]}`;
}

function isRobiOperatorMsisdn(msisdn: string): boolean {
  return /^8801[68]\d{8}$/.test(msisdn);
}

function maskMsisdn(msisdn: string): string {
  if (msisdn.length < 7) return "***";
  return `${msisdn.slice(0, 5)}****${msisdn.slice(-3)}`;
}

function signToken(payload: {
  msisdn: string;
  mode: "preview" | "production";
  exp: number;
  providerVerifiedUntil?: number;
}): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(
  token: string,
): { msisdn: string; mode: "preview" | "production"; exp: number; providerVerifiedUntil?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSigningKey()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      msisdn: string;
      mode: "preview" | "production";
      exp: number;
      providerVerifiedUntil?: number;
    };
    if (!parsed.msisdn || typeof parsed.exp !== "number" || Date.now() > parsed.exp ||
        (parsed.providerVerifiedUntil !== undefined &&
         (typeof parsed.providerVerifiedUntil !== "number" || !Number.isFinite(parsed.providerVerifiedUntil) ||
          parsed.providerVerifiedUntil > parsed.exp))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  subscriberSession?: { msisdn: string; mode: "preview" | "production"; exp: number; providerVerifiedUntil?: number };
}

function extractOptionalSession(
  req: Request,
): { msisdn: string; mode: "preview" | "production"; exp: number; providerVerifiedUntil?: number } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7).trim());
}

function requireSubscriberAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const decoded = extractOptionalSession(req);
  if (!decoded) {
    res.status(401).json({
      error: "Authentication required or session expired. Please log in to your RobiTrail account.",
    });
    return;
  }
  if (decoded.mode !== getRuntimeSettings().mode || !normalizeMsisdn(decoded.msisdn)) {
    res.status(401).json({ error: "Session is not valid for this deployment mode." });
    return;
  }
  req.subscriberSession = decoded;
  next();
}

// Phone-only sessions are NOT proof of subscriber ownership. Never allow
// carrier billing or unsubscription without recent bdapps OTP verification.
function requireVerifiedCarrierSubscriber(req: AuthedRequest, res: Response, next: NextFunction) {
  if (getRuntimeSettings().mode !== "production") {
    next();
    return;
  }
  if (!req.subscriberSession?.providerVerifiedUntil ||
      Date.now() >= req.subscriberSession.providerVerifiedUntil) {
    res.status(403).json({
      error: "This carrier operation requires subscriber ownership verified with bdapps OTP.",
    });
    return;
  }
  next();
}

function defaultSubscriptionView(
  msisdn: string,
  mode: "preview" | "production",
  shortCode: string,
): Omit<SubscriptionRecord, "msisdn"> & { msisdn: string } {
  const disclosure = buildSubscriptionDisclosure(mode, shortCode);
  return {
    msisdn: maskMsisdn(msisdn),
    status: "inactive",
    mode,
    planName: disclosure.planName,
    priceLabel: disclosure.priceLabel,
    billingFrequency: disclosure.billingFrequency,
    renewalTerms: disclosure.renewalTerms,
    cancellationMethod: disclosure.cancellationMethod,
    consentTimestamp: null,
    nextRenewalAt: null,
    entitlementActive: false,
    subscriberId: maskMsisdn(msisdn),
    updatedAt: new Date().toISOString(),
  };
}

function formatPublicSubscription(
  msisdn: string,
  sub: SubscriptionRecord | null,
  mode: "preview" | "production",
  shortCode: string,
) {
  if (!sub) return defaultSubscriptionView(msisdn, mode, shortCode);
  return {
    ...sub,
    msisdn: maskMsisdn(msisdn),
  };
}

app.get("/api/health", (_req, res) => {
  const cfg = getBdappsRuntimeConfig();
  res.json({
    ok: true,
    bdappsMode: cfg.mode,
    credentialsConfigured: cfg.apiSecretConfigured,
    phpGatewayConfigured: cfg.phpGatewayConfigured,
    liveChargingEnabled: cfg.liveChargingEnabled,
    liveChargingBlockedReason: cfg.liveChargingBlockedReason,
    subscriptionEnabled: cfg.subscriptionEnabled,
    persistenceBackend: getPersistenceBackend(),
    smsLoginConfigured: false,
    providerSubscriptionOtpConfigured:
      cfg.mode === "production" &&
      cfg.subscriptionGateAllowed &&
      cfg.phpGatewayConfigured &&
      isFirestorePersistenceConfigured(),
  });
});

/** Enrich saved certificates from Firestore before sending profiles to clients. */
async function toPublicAccount(account: Parameters<typeof sanitizePublicAccount>[0]) {
  const publicAccount = sanitizePublicAccount(account);
  if (!shouldUseFirestorePersistence()) return publicAccount;
  const records = await Promise.all(
    account.certificateIds.slice(0, 100).map((id) => loadCertificate(id)),
  );
  return {
    ...publicAccount,
    certificates: records.filter(
      (c): c is CertificateRecord => c !== null && c.ownerAccountId === account.accountId,
    ),
  };
}

// 1. Robi Operator Eligibility Check (routed through PHP gateway in production)
app.post("/api/bdapps/eligibility", async (req, res) => {
  const msisdn = normalizeMsisdn(req.body?.phoneNumber);
  if (!msisdn) {
    res.status(400).json({
      error: "Enter a valid Bangladesh 11-digit mobile number (e.g. 018XXXXXXXX).",
    });
    return;
  }

  const runtime = getRuntimeSettings();
  const terms = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);
  const existingAccount = await loadAccount(msisdn).catch(() => null);

  if (runtime.mode === "production") {
    res.json({
      mode: "production",
      maskedNumber: maskMsisdn(msisdn),
      accountExists: Boolean(existingAccount),
      providerChecked: false,
      operatorVerified: false,
      terms,
      limitationNote:
        "The number format is valid. Actual operator and SMS eligibility are confirmed by the provider when sending your code; MNP means prefixes cannot prove carrier ownership.",
    });
    return;
  }

  res.json({
    mode: "preview",
    maskedNumber: maskMsisdn(msisdn),
    accountExists: Boolean(existingAccount),
    formatValid: true,
    operatorVerified: false,
    eligibleForPreviewFlow: true,
    terms,
    limitationNote:
      "Preview Mode: Number prefix (such as 018 or 016) is never treated as proof of a Robi SIM because of Mobile Number Portability (MNP). Live carrier eligibility and SMS OTP delivery require approved bdapps credentials.",
  });
});

// 2. Free account registration remains direct phone login, with NO OTP.
// Legacy custom login OTP routes are intentionally retired; they never generate a code.
app.post("/api/bdapps/otp/request", (_req, res) => {
  res.status(409).json({
    error: "Phone-only signup is enabled. bdapps-issued OTP is available only with explicit subscription consent.",
  });
});
app.post("/api/bdapps/otp/verify", (_req, res) => {
  res.status(409).json({
    error: "Legacy custom login OTP was retired. Use bdapps subscription OTP verification for a subscription.",
  });
});

interface ProviderOtpChallenge {
  scope: "subscription-provider-otp";
  msisdn: string;
  providerReferenceNo: string;
  exp: number;
}

/** Signed challenge binds the bdapps reference to the CURRENT phone session. */
function createProviderOtpChallenge(msisdn: string, providerReferenceNo: string): string {
  const challenge: ProviderOtpChallenge = {
    scope: "subscription-provider-otp",
    msisdn,
    providerReferenceNo,
    exp: Date.now() + 5 * 60_000, // RobiTrail challenge lifetime, not claimed carrier OTP expiry.
  };
  const body = Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", getSigningKey())
    .update(`RobiTrail/subscription-provider-otp/v1:${body}`)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verifyProviderOtpChallenge(token: unknown, sessionMsisdn: string): ProviderOtpChallenge | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = crypto.createHmac("sha256", getSigningKey())
    .update(`RobiTrail/subscription-provider-otp/v1:${body}`)
    .digest("base64url");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProviderOtpChallenge;
    if (
      parsed.scope !== "subscription-provider-otp" ||
      parsed.msisdn !== sessionMsisdn ||
      typeof parsed.providerReferenceNo !== "string" ||
      parsed.providerReferenceNo.length < 1 || parsed.providerReferenceNo.length > 200 ||
      typeof parsed.exp !== "number" || Date.now() > parsed.exp
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 3. Request real OTP FROM bdapps for subscription only. No OTP generated by RobiTrail.
app.post("/api/bdapps/subscription/otp/request", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const runtime = getRuntimeSettings();
  const gate = getLiveSubscriptionGateStatus();
  if (runtime.mode !== "production" || !gate.allowed) {
    res.status(503).json({ error: gate.reason || "Subscription OTP is not configured." });
    return;
  }
  // Requesting an OTP can be separated from unapproved one-time CaaS debit.
  // Without approved terms we permit only the OTP delivery stage, NEVER verification/charging.
  const deliveryOnly = req.body?.purpose === "token_purchase" && req.body?.deliveryOnly === true;
  if (req.body?.consentAccepted !== true || (!deliveryOnly && req.body?.termsAccepted !== true)) {
    res.status(400).json({ error: "Explicit consent is required for a bdapps subscription OTP request." });
    return;
  }
  const session = req.subscriberSession!;
  if (req.body?.purpose === "token_purchase") {
    if (!deliveryOnly) {
      res.status(400).json({ error: "Unapproved token checkout can only request an OTP, not verify or charge." });
      return;
    }
    if (normalizeMsisdn(req.body?.phoneNumber) !== session.msisdn) {
      res.status(400).json({ error: "OTP phone number must match the signed-in account." });
      return;
    }
  }
  // Reuse the EXISTING Firestore OTP-rate collection for durable request limits.
  // PROVREF is just an internal reservation ID; this code creates no OTP.
  const reservationId = `PROV-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  try {
    const limit = await fsCreateLoginOtp(reservationId, session.msisdn, "PROVIDER_MANAGED_NO_OTP_HASH");
    if (!limit.allowed) {
      res.status(429).json({
        error: "Please wait before requesting another provider OTP.",
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }
    const sent = await requestOtpViaPhpGateway(session.msisdn);
    const providerReference = String(sent.data?.referenceNo || "").trim();
    const accepted = sent.ok && sent.data?.statusCode === "S1000" && providerReference.length > 0;
    await fsMarkLoginOtpSent(reservationId, accepted);
    if (!accepted) {
      console.error("[RobiTrail bdapps provider OTP request rejected]", {
        statusCode: sent.data?.statusCode || "UNKNOWN",
        httpStatus: sent.httpStatus,
        // The PHP gateway records sanitized provider detail; do not log OTP/reference/phone.
      });
      res.status(sent.httpStatus === 503 ? 503 : 502).json({
        error: "bdapps did not accept the subscription OTP request.",
        statusCode: sent.data?.statusCode || "UNKNOWN",
      });
      return;
    }
    res.json({
      ok: true,
      provider: "bdapps",
      referenceNo: createProviderOtpChallenge(session.msisdn, providerReference),
      maskedNumber: maskMsisdn(session.msisdn),
      expiresInSeconds: 300,
      notice: deliveryOnly
        ? "bdapps accepted the subscription OTP request. Verification and payment are unavailable until approved terms and billing permissions are configured. SMS delivery is not guaranteed."
        : "bdapps accepted the OTP request. SMS delivery is not guaranteed.",
    });
  } catch {
    res.status(503).json({ error: "Provider OTP request could not be completed." });
  }
});

// 3B. bdapps verifies the OTP, and the provider's status confirms subscription.
app.post("/api/bdapps/subscription/otp/verify", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const runtime = getRuntimeSettings();
  const gate = getLiveSubscriptionGateStatus();
  if (runtime.mode !== "production" || !gate.allowed) {
    res.status(503).json({ error: gate.reason || "Subscription OTP is not configured." });
    return;
  }
  if (req.body?.consentAccepted !== true || req.body?.termsAccepted !== true ||
      !(process.env.ROBITRAIL_SUBSCRIPTION_TERMS_TEXT || "").trim()) {
    res.status(400).json({ error: "Verified subscription terms and explicit consent are required before activating bdapps subscription." });
    return;
  }
  const session = req.subscriberSession!;
  if (req.body?.purpose === "token_purchase") {
    const checkoutGate = tokenCheckoutGate();
    if (!checkoutGate.allowed) {
      res.status(503).json({ error: checkoutGate.reason || "Carrier checkout unavailable." });
      return;
    }
  }
  if (req.body?.purpose !== "free_subscription" && req.body?.purpose !== "token_purchase") {
    res.status(400).json({ error: "An explicit subscription verification purpose is required." });
    return;
  }
  const challenge = verifyProviderOtpChallenge(req.body?.referenceNo, session.msisdn);
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  if (!challenge || !/^\d{4,8}$/.test(otp)) {
    res.status(400).json({ error: "Invalid or expired provider OTP reference/code." });
    return;
  }
  try {
    const result = await verifyOtpViaPhpGateway(session.msisdn, challenge.providerReferenceNo, otp);
    if (!result.ok || result.data?.verified !== true) {
      res.status(400).json({
        verified: false,
        error: "bdapps declined OTP verification.",
        statusCode: result.data?.statusCode || "UNKNOWN",
      });
      return;
    }
    const status = await getSubscriptionStatusViaPhpGateway(session.msisdn);
    const confirmed = status.ok && normalizeBdappsSubscriptionStatus(status.data?.subscriptionStatus) === "REGISTERED";
    // Never mark a subscription active from OTP transport success alone.
    if (confirmed) {
      const now = new Date().toISOString();
      const disclosure = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);
      await persistSubscription({
        msisdn: session.msisdn,
        status: "active_production",
        mode: runtime.mode,
        planName: disclosure.planName,
        priceLabel: disclosure.priceLabel,
        billingFrequency: disclosure.billingFrequency,
        renewalTerms: disclosure.renewalTerms,
        cancellationMethod: disclosure.cancellationMethod,
        consentTimestamp: now,
        nextRenewalAt: null,
        entitlementActive: true,
        subscriberId: maskMsisdn(session.msisdn),
        updatedAt: now,
      });
    }
    const now = Date.now();
    const upgradedToken = signToken({
      msisdn: session.msisdn,
      mode: runtime.mode,
      exp: now + 24 * 60 * 60_000,
      providerVerifiedUntil: now + 24 * 60 * 60_000,
    });
    res.status(confirmed ? 200 : 202).json({
      verified: true,
      token: upgradedToken, // Client must replace its bearer token before any sensitive carrier action.
      subscriptionActive: confirmed,
      subscriptionStatus: confirmed ? "REGISTERED" : "PENDING",
      notice: confirmed
        ? "bdapps verified OTP and confirmed subscription."
        : "bdapps verified OTP, but subscription status is not yet confirmed.",
    });
  } catch {
    res.status(503).json({ error: "Provider OTP verification could not be completed." });
  }
});

// 4. Subscription Activation (Integration Preparation Only — Locked unless BDAPPS_SUBSCRIPTION_ENABLED=true)
app.post("/api/bdapps/subscribe", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const runtime = getRuntimeSettings();
  if (!runtime.subscriptionEnabled) {
    res.status(503).json({
      error:
        "Paid subscriptions are disabled. Subscription endpoints are preparation-only and require an approved product plan.",
    });
    return;
  }

  const consentAccepted = req.body?.consentAccepted === true;
  if (!consentAccepted) {
    res.status(400).json({
      error: "Explicit consent is required before initiating subscription activation.",
    });
    return;
  }

  if (["production"].includes(runtime.mode)) {
    res.status(409).json({
      error: "Complete the bdapps subscription OTP request/verify journey before activating a subscription.",
    });
    return;
  }

  const session = req.subscriberSession!;
  const masked = maskMsisdn(session.msisdn);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const disclosure = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);

  let carrierSubscriptionConfirmed = runtime.mode !== "production";
  if (runtime.mode === "production") {
    const gwRes = await subscribeViaPhpGateway(session.msisdn, true);
    if (!gwRes.ok) {
      res.status(gwRes.httpStatus === 503 ? 503 : 400).json({
        error: gwRes.error || gwRes.data?.statusDetail || "Subscription activation declined.",
      });
      return;
    }
    const status = await getSubscriptionStatusViaPhpGateway(session.msisdn);
    carrierSubscriptionConfirmed =
      status.ok &&
      String(status.data?.subscriptionStatus || "")
        .replace(/[. ]+$/g, "")
        .toUpperCase() === "REGISTERED";
  }

  const subRecord = await persistSubscription({
    msisdn: session.msisdn,
    status:
      runtime.mode === "production"
        ? carrierSubscriptionConfirmed
          ? "active_production"
          : "inactive"
        : "active_preview",
    mode: runtime.mode,
    planName: disclosure.planName,
    priceLabel: disclosure.priceLabel,
    billingFrequency: disclosure.billingFrequency,
    renewalTerms: disclosure.renewalTerms,
    cancellationMethod: disclosure.cancellationMethod,
    consentTimestamp: now,
    nextRenewalAt: null,
    entitlementActive: carrierSubscriptionConfirmed,
    subscriberId: masked,
    updatedAt: now,
  });

  res.status(carrierSubscriptionConfirmed ? 200 : 202).json({
    mode: runtime.mode,
    entitlementActive: carrierSubscriptionConfirmed,
    pendingCarrierConfirmation: !carrierSubscriptionConfirmed,
    subscription: formatPublicSubscription(
      session.msisdn,
      subRecord,
      runtime.mode,
      runtime.shortCode,
    ),
  });
});

// 5. Subscription Status
app.get("/api/bdapps/status", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const runtime = getRuntimeSettings();
  let record = await loadSubscription(session.msisdn).catch(() => null);
  if (runtime.mode === "production" && runtime.subscriptionEnabled && record?.consentTimestamp) {
    const status = await getSubscriptionStatusViaPhpGateway(session.msisdn);
    const registered =
      status.ok &&
      String(status.data?.subscriptionStatus || "")
        .replace(/[. ]+$/g, "")
        .toUpperCase() === "REGISTERED";
    if (status.ok && registered && !record.entitlementActive) {
      record = await persistSubscription({
        ...record,
        status: "active_production",
        entitlementActive: true,
        updatedAt: new Date().toISOString(),
      });
    } else if (status.ok && !registered && record.entitlementActive) {
      record = await persistSubscription({
        ...record,
        status: "unsubscribed",
        entitlementActive: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  res.json({
    mode: runtime.mode,
    subscription: formatPublicSubscription(session.msisdn, record, runtime.mode, runtime.shortCode),
  });
});

// 6. Unsubscribe / Cancellation (routed via PHP gateway in production)
app.post("/api/bdapps/unsubscribe", requireSubscriberAuth, requireVerifiedCarrierSubscriber, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const runtime = getRuntimeSettings();
  const masked = maskMsisdn(session.msisdn);
  const now = new Date().toISOString();
  const disclosure = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);

  if (runtime.mode === "production" && session.mode === "production") {
    const gwRes = await unsubscribeViaPhpGateway(session.msisdn);
    if (!gwRes.ok) {
      res.status(502).json({
        error: gwRes.error || "PHP bdapps unsubscribe request failed.",
      });
      return;
    }
  }

  const record = await persistSubscription({
    msisdn: session.msisdn,
    status: "unsubscribed",
    mode: session.mode,
    planName: disclosure.planName,
    priceLabel: disclosure.priceLabel,
    billingFrequency: disclosure.billingFrequency,
    renewalTerms: disclosure.renewalTerms,
    cancellationMethod: disclosure.cancellationMethod,
    consentTimestamp: null,
    nextRenewalAt: null,
    entitlementActive: false,
    subscriberId: masked,
    updatedAt: now,
  });

  res.json({
    unsubscribed: true,
    mode: session.mode,
    subscription: formatPublicSubscription(session.msisdn, record, runtime.mode, runtime.shortCode),
  });
});

// 7. Player Account Read, Update, Progress Sync, and Permanent Deletion
app.get("/api/account/me", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const runtime = getRuntimeSettings();
  try {
    const account = await loadAccount(session.msisdn);
    const sub = await loadSubscription(session.msisdn);
    if (!account) {
      res.status(404).json({
        error: "No activated RobiTrail account found for this mobile session.",
        subscription: formatPublicSubscription(
          session.msisdn,
          sub,
          runtime.mode,
          runtime.shortCode,
        ),
      });
      return;
    }
    const wallet = await loadOrInitWallet(session.msisdn, account.accountId);
    const persistenceBackend = getPersistenceBackend();
    res.json({
      mode: runtime.mode,
      persistenceBackend,
      persistedToFirestore: persistenceBackend === "firestore",
      account: await toPublicAccount(account),
      subscription: formatPublicSubscription(session.msisdn, sub, runtime.mode, runtime.shortCode),
      wallet,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Unable to load account persistence.",
    });
  }
});

// Demo Registration Helper (available strictly in Preview Mode for fast token-economy QA)
app.post("/api/account/demo-register", async (req, res) => {
  const runtime = getRuntimeSettings();
  if (runtime.mode === "production") {
    res.status(403).json({ error: "Demo registration is disabled in production mode." });
    return;
  }

  const rawPhone =
    typeof req.body?.phoneNumber === "string" && req.body.phoneNumber.trim()
      ? req.body.phoneNumber.trim()
      : "01811000001";
  const msisdn = normalizeMsisdn(rawPhone);
  if (!msisdn) {
    res.status(400).json({ error: "Invalid Bangladesh mobile number format for demo signup." });
    return;
  }

  const masked = maskMsisdn(msisdn);
  const displayName =
    typeof req.body?.displayName === "string" && req.body.displayName.trim().length > 0
      ? req.body.displayName.trim().slice(0, 60)
      : "Demo Explorer";
  const localTrailIds = sanitizeTrailIds(req.body?.localCompletedTrailIds);
  const localCertificateIds = Array.isArray(req.body?.localCertificateIds)
    ? req.body.localCertificateIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const preferredLang = req.body?.preferredLang === "bn" ? "bn" : "en";
  const preferredCityId =
    req.body?.preferredCityId === "dhaka" || req.body?.preferredCityId === "sylhet"
      ? req.body.preferredCityId
      : "chattogram";

  try {
    const account = await saveOrUpdateAccount(msisdn, masked, {
      displayName,
      completedTrailIds: localTrailIds,
      certificateIds: localCertificateIds,
      preferredLang,
      preferredCityId,
      authMethod: "demo",
      recordLogin: true,
    });

    const sub = await loadSubscription(msisdn);
    const rewardResult = await grantWelcomeTokensIdempotent(msisdn, account.accountId);
    const persistenceBackend = getPersistenceBackend();
    const token = signToken({
      msisdn,
      mode: "preview",
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });
    const smsPreview = rewardResult.grantedNow
      ? await dispatchBdappsSmsNotification(msisdn, masked, "welcome_tokens_reward", {
          tokens: 10,
          balanceAfter: rewardResult.wallet.balance,
        })
      : await dispatchBdappsSmsNotification(msisdn, masked, "registration_confirmation");

    res.json({
      verified: true,
      authMethod: "demo",
      mode: "preview",
      persistenceBackend,
      persistedToFirestore: persistenceBackend === "firestore",
      token,
      maskedNumber: masked,
      accountActivated: true,
      account: await toPublicAccount(account),
      subscription: formatPublicSubscription(msisdn, sub, "preview", runtime.shortCode),
      wallet: rewardResult.wallet,
      welcomeGrantedNow: rewardResult.grantedNow,
      smsPreview,
      notice: rewardResult.grantedNow
        ? "Demo Preview Account Created: +10 Welcome Tokens credited once for this demo profile."
        : "Signed back into existing Demo Preview Account: Welcome reward was already granted previously.",
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Persistence error while creating demo account.",
    });
  }
});

// Direct Robi / Airtel (018 / 016) Registration & Login (works when SMS OTP API is unavailable)
app.post("/api/account/robi-direct", async (req, res) => {
  const msisdn = normalizeMsisdn(req.body?.phoneNumber);
  if (!msisdn) {
    res.status(400).json({
      error: "Enter a valid Bangladesh 11-digit mobile number (e.g. 018XXXXXXXX or 016XXXXXXXX).",
    });
    return;
  }

  if (!isRobiOperatorMsisdn(msisdn)) {
    res.status(400).json({
      error:
        "Direct registration and login is only available for Robi/Airtel numbers starting with 018 or 016. Use the SMS OTP alternative for other operators.",
      code: "ROBI_PREFIX_REQUIRED",
    });
    return;
  }

  const runtime = getRuntimeSettings();
  const intent: "login" | "register" = req.body?.intent === "login" ? "login" : "register";
  const masked = maskMsisdn(msisdn);
  const localTrailIds = sanitizeTrailIds(req.body?.localCompletedTrailIds);
  const localCertificateIds =
    runtime.mode === "production"
      ? []
      : Array.isArray(req.body?.localCertificateIds)
        ? req.body.localCertificateIds.filter((id: unknown): id is string => typeof id === "string")
        : [];

  try {
    const existingAccount = await loadAccount(msisdn);
    if (intent === "login" && !existingAccount) {
      res.status(404).json({
        error:
          "No RobiTrail account found for this Robi number yet. Switch to Create Account to register and claim +10 Welcome Tokens.",
        code: "ACCOUNT_NOT_FOUND",
      });
      return;
    }

    const displayName =
      intent === "register" &&
      typeof req.body?.displayName === "string" &&
      req.body.displayName.trim().length > 0
        ? req.body.displayName.trim().slice(0, 60)
        : undefined;
    const preferredLang =
      intent === "register" &&
      (req.body?.preferredLang === "bn" || req.body?.preferredLang === "en")
        ? req.body.preferredLang
        : undefined;
    const preferredCityId =
      intent === "register" &&
      (req.body?.preferredCityId === "chattogram" ||
        req.body?.preferredCityId === "dhaka" ||
        req.body?.preferredCityId === "sylhet")
        ? req.body.preferredCityId
        : undefined;

    const accountRecord = await saveOrUpdateAccount(msisdn, masked, {
      displayName,
      completedTrailIds: localTrailIds,
      certificateIds: localCertificateIds,
      preferredLang,
      preferredCityId,
      authMethod: "robi_direct",
      recordLogin: true,
    });

    const sub = await loadSubscription(msisdn);
    const rewardResult = await grantWelcomeTokensIdempotent(msisdn, accountRecord.accountId);
    const persistenceBackend = getPersistenceBackend();
    const token = signToken({
      msisdn,
      mode: runtime.mode,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    const smsPreview = rewardResult.grantedNow
      ? buildSmsNotificationPreview("welcome_tokens_reward", masked, {
          tokens: 10,
          balanceAfter: rewardResult.wallet.balance,
        })
      : buildSmsNotificationPreview("registration_confirmation", masked);

    res.json({
      verified: true,
      authMethod: "robi_direct",
      mode: runtime.mode,
      persistenceBackend,
      persistedToFirestore: persistenceBackend === "firestore",
      token,
      maskedNumber: masked,
      accountActivated: true,
      account: await toPublicAccount(accountRecord),
      subscription: formatPublicSubscription(msisdn, sub, runtime.mode, runtime.shortCode),
      wallet: rewardResult.wallet,
      welcomeGrantedNow: rewardResult.grantedNow,
      smsPreview,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Persistence error while accessing account.",
    });
  }
});

// 7B. RobiTrail Token Wallet, Game Unlock, Mistake Penalty & Token Shop Routes
app.get("/api/tokens/packages", (_req, res) => {
  const runtime = getRuntimeSettings();
  const gate = tokenCheckoutGate();
  const otpGate = getLiveSubscriptionGateStatus();
  res.json({
    mode: runtime.mode === "production" ? "live_bdapps" : "demo",
    billingChannel: "caas",
    subscriptionEnabled: runtime.subscriptionEnabled,
    subscriptionTermsText: (process.env.ROBITRAIL_SUBSCRIPTION_TERMS_TEXT || "").trim(),
    phpGatewayConfigured: runtime.phpGatewayConfigured,
    gatewayReady: gate.allowed,
    gatewayBlockedReason: gate.reason,
    otpRequestReady: runtime.mode === "production" && otpGate.allowed,
    otpBlockedReason: otpGate.reason,
    freeSubscriptionVerifyReady: otpGate.allowed && runtime.subscriptionEnabled &&
      Boolean((process.env.ROBITRAIL_SUBSCRIPTION_TERMS_TEXT || "").trim()),
    packages: TOKEN_SHOP_PACKAGES,
  });
});

app.get("/api/tokens/wallet", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const runtime = getRuntimeSettings();
  try {
    const account = await loadAccount(session.msisdn);
    if (!account) {
      res.status(404).json({ error: "Account must be activated before accessing Token Wallet." });
      return;
    }
    const wallet = await loadOrInitWallet(session.msisdn, account.accountId);
    res.json({
      mode: runtime.mode === "production" ? "live_bdapps" : "demo",
      wallet,
      packages: TOKEN_SHOP_PACKAGES,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Token wallet persistence unavailable.",
    });
  }
});

app.post("/api/tokens/claim-welcome", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  try {
    const account = await loadAccount(session.msisdn);
    if (!account) {
      res.status(404).json({ error: "Account must be verified first." });
      return;
    }
    const result = await grantWelcomeTokensIdempotent(session.msisdn, account.accountId);
    const smsPreview = result.grantedNow
      ? await dispatchBdappsSmsNotification(
          session.msisdn,
          maskMsisdn(session.msisdn),
          "welcome_tokens_reward",
          {
            tokens: 10,
            balanceAfter: result.wallet.balance,
          },
        )
      : null;
    res.json({
      grantedNow: result.grantedNow,
      wallet: result.wallet,
      transaction: result.transaction,
      smsPreview,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Unable to claim welcome tokens.",
    });
  }
});

app.post("/api/tokens/unlock", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  try {
    const account = await loadAccount(session.msisdn);
    if (!account) {
      res.status(404).json({ error: "Account must be verified before unlocking missions." });
      return;
    }
    const trailId = typeof req.body?.trailId === "string" ? req.body.trailId.trim() : "";
    const trailTitleEn =
      typeof req.body?.trailTitleEn === "string"
        ? req.body.trailTitleEn.trim().slice(0, 80)
        : undefined;
    const trailTitleBn =
      typeof req.body?.trailTitleBn === "string"
        ? req.body.trailTitleBn.trim().slice(0, 80)
        : undefined;
    const idempotencyKey =
      typeof req.body?.idempotencyKey === "string"
        ? req.body.idempotencyKey.trim().slice(0, 100)
        : undefined;

    const result = await unlockTrailWithTokensIdempotent(
      session.msisdn,
      account.accountId,
      trailId,
      {
        cost: 2,
        trailTitleEn,
        trailTitleBn,
        idempotencyKey,
      },
    );

    if (!result.ok && result.insufficientTokens) {
      res.status(402).json({
        error: "Not enough tokens. You need 2 tokens to unlock this adventure.",
        insufficientTokens: true,
        wallet: result.wallet,
      });
      return;
    }
    if (!result.ok) {
      res.status(400).json({ error: "Invalid game identifier for token unlock." });
      return;
    }

    res.json({
      unlocked: true,
      alreadyUnlocked: result.alreadyUnlocked,
      deducted: result.deducted,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Unable to unlock trail.",
    });
  }
});

app.post("/api/tokens/mistake", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  try {
    const account = await loadAccount(session.msisdn);
    if (!account) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    const trailId = typeof req.body?.trailId === "string" ? req.body.trailId.trim() : "";
    if (!trailId) {
      res.status(400).json({ error: "trailId is required." });
      return;
    }
    const trailTitleEn =
      typeof req.body?.trailTitleEn === "string"
        ? req.body.trailTitleEn.trim().slice(0, 80)
        : undefined;
    const trailTitleBn =
      typeof req.body?.trailTitleBn === "string"
        ? req.body.trailTitleBn.trim().slice(0, 80)
        : undefined;
    const idempotencyKey =
      typeof req.body?.idempotencyKey === "string"
        ? req.body.idempotencyKey.trim().slice(0, 100)
        : undefined;

    const result = await recordMistakePenaltyIdempotent(
      session.msisdn,
      account.accountId,
      trailId,
      {
        cost: 1,
        trailTitleEn,
        trailTitleBn,
        idempotencyKey,
      },
    );

    res.json({
      deducted: result.deducted,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Unable to record mistake penalty.",
    });
  }
});

// Real one-time token payment via bdapps CaaS; provider-verified OTP required.
// The OTP endpoint is separate and may activate a bdapps subscription.
app.post("/api/tokens/shop/purchase", requireSubscriberAuth, requireVerifiedCarrierSubscriber, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const gate = tokenCheckoutGate();
  if (!gate.allowed) {
    res.status(503).json({ ok: false, blocked: true, billingChannel: "caas",
      error: gate.reason || "Live bdapps CaaS checkout is not approved." });
    return;
  }
  if (req.body?.consentAccepted !== true || req.body?.userConfirmed !== true) {
    res.status(400).json({ ok: false, error: "Explicit confirmation of the one-time charge is required." });
    return;
  }
  const packageId = typeof req.body?.packageId === "string" ? req.body.packageId.trim() : "";
  const pkg = getTokenPackageById(packageId);
  if (!pkg) { res.status(400).json({ ok: false, error: "Invalid package." }); return; }
  const key = typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey : "";
  if (!/^[A-Za-z0-9:_-]{8,100}$/.test(key)) {
    res.status(400).json({ ok: false, error: "Valid idempotencyKey required." });
    return;
  }
  const externalTrxId = `RT-${crypto.createHmac("sha256", getSigningKey())
    .update(`${session.msisdn}:${pkg.packageId}:${key}`).digest("hex").slice(0, 40)}`;
  try {
    const account = await loadAccount(session.msisdn);
    if (!account) { res.status(404).json({ ok: false, error: "Account not found." }); return; }
    const pending = await createLivePendingPurchase(session.msisdn, account.accountId, {
      externalTrxId, packageId: pkg.packageId, tokens: pkg.tokens,
      priceBdt: pkg.priceBdt, billingChannel: "caas",
    });
    if (pending.duplicate) {
      const state = pending.purchase.status;
      res.status(state === "pending" ? 202 : state === "failed" ? 402 : 200).json({
        ok: state !== "failed", duplicate: true, status: state,
        pendingConfirmation: state === "pending", externalTrxId,
        wallet: pending.wallet, billingChannel: "caas", mode: "live_bdapps",
        notice: "Existing transaction returned. No second carrier charge was requested.",
      });
      return;
    }
    const charged = await chargeCaasViaPhpGateway({
      msisdn: session.msisdn, packageId: pkg.packageId, tokens: pkg.tokens,
      priceBdt: pkg.priceBdt, externalTrxId, userConfirmed: true,
    });
    const code = String(charged.data?.statusCode || "UNKNOWN");
    // Ambiguous provider/network errors must remain PENDING: avoid retrying a possible debit.
    if (charged.data?.txState === "failed" && charged.httpStatus < 500 &&
        charged.data?.blocked !== true && !charged.error) {
      const failed = await settleLivePurchase(externalTrxId, "failed", {
        providerStatusCode: code,
        providerStatusDetail: "Provider explicitly rejected direct debit.",
      });
      res.status(402).json({ ok: false, status: "failed", pendingConfirmation: false,
        error: "Carrier rejected the charge; no tokens credited.", externalTrxId,
        wallet: failed.wallet || pending.wallet, billingChannel: "caas", mode: "live_bdapps" });
      return;
    }
    // Even HTTP 200 is not treated as a successful debit until a validated payment callback
    // settles this specific Firestore order. Never issue another debit with a different key.
    res.status(202).json({ ok: true, status: "pending", pendingConfirmation: true,
      externalTrxId, wallet: pending.wallet, billingChannel: "caas", mode: "live_bdapps",
      notice: charged.data?.txState === "pending"
        ? "CaaS request accepted; awaiting verified charge confirmation. No tokens credited yet."
        : "Carrier response uncertain; do not retry payment. Check this order status or contact support." });
  } catch (err) {
    // Preserve existing pending order when outcome is unknown.
    console.error("[RobiTrail CaaS purchase error]", { message: err instanceof Error ? err.message : "Unknown" });
    res.status(503).json({ ok: false, pendingConfirmation: true,
      externalTrxId, error: "Checkout status uncertain. Do not initiate another payment; check transaction status." });
  }
});

// CaaS settlement is confirmed only via verified provider charging callback,
// NEVER from subscription REGISTERED status.
app.get("/api/tokens/shop/status", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const externalTrxId = typeof req.query?.externalTrxId === "string" ? req.query.externalTrxId.trim() : "";
  if (!externalTrxId) {
    res.status(400).json({ error: "externalTrxId is required." }); return;
  }
  try {
    const result = await getLivePurchaseOrder(externalTrxId);
    const order = result.purchase;
    if (!order || order.msisdn !== session.msisdn || order.billingChannel !== "caas") {
      res.status(404).json({ error: "CaaS purchase order not found." }); return;
    }
    res.status(order.status === "pending" ? 202 : order.status === "failed" ? 402 : 200).json({
      ok: order.status !== "failed", status: order.status,
      pendingConfirmation: order.status === "pending", externalTrxId,
      wallet: result.wallet, transaction: result.transaction,
      billingChannel: "caas", mode: "live_bdapps",
      notice: order.status === "confirmed" ? "Carrier confirmed payment; tokens credited once."
        : order.status === "pending" ? "Awaiting verified bdapps charging notification. Do not pay again."
        : "Carrier payment failed; no tokens credited.",
    });
  } catch {
    res.status(503).json({ error: "Unable to load charging status. Do not retry the debit." });
  }
});

// Read-only balance query using the official bdapps CaaS endpoint.
// Requires an authenticated player, but never initiates a direct debit.
app.post("/api/bdapps/balance", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  if (getRuntimeSettings().mode !== "production") {
    res.status(503).json({ error: "Balance query requires real provider access." });
    return;
  }
  const result = await queryCaasBalanceViaPhpGateway(req.subscriberSession!.msisdn);
  if (!result.ok || result.data?.statusCode !== "S1000") {
    res.status(502).json({
      error: "Provider balance query unavailable.",
      statusCode: result.data?.statusCode || "PROVIDER_UNAVAILABLE",
    });
    return;
  }
  res.json({
    ok: true,
    currency: "BDT",
    accountType: result.data.accountType,
    accountStatus: result.data.accountStatus,
    chargeableBalance: result.data.chargeableBalance ?? null,
  });
});

// 7C. Internal Signed Webhook Callback from PHP Gateway (charging / subscription / consent)
app.post("/api/internal/bdapps/callback", async (req, res) => {
  const rawBody =
    typeof req.rawBody === "string" && req.rawBody.length > 0
      ? req.rawBody
      : JSON.stringify(req.body);
  const auth = verifyPhpCallbackSignature(
    req.headers,
    "POST",
    "/api/internal/bdapps/callback",
    rawBody,
  );
  if (!auth.ok) {
    res.status(401).json({ ok: false, error: auth.reason || "Unauthorized internal callback." });
    return;
  }

  const event = typeof req.body?.event === "string" ? req.body.event.trim() : "";
  const payload =
    req.body?.payload && typeof req.body.payload === "object"
      ? (req.body.payload as Record<string, unknown>)
      : {};

  if (event === "charging_notification") {
    if (!getLiveChargingGateStatus().allowed) {
      res.status(503).json({ ok: false, error: "Carrier billing settlement disabled." });
      return;
    }
    const externalTrxId =
      typeof payload.externalTrxId === "string" ? payload.externalTrxId.trim() : "";
    if (payload.outcome !== "confirmed" && payload.outcome !== "failed") {
      res.status(400).json({ ok: false, error: "Unrecognized charging outcome." });
      return;
    }
    const outcome = payload.outcome;
    if (!externalTrxId) {
      res.status(400).json({ ok: false, error: "Missing externalTrxId in charging_notification." });
      return;
    }

    try {
      const settled = await settleLivePurchase(externalTrxId, outcome, {
        providerStatusCode:
          typeof payload.providerStatusCode === "string" ? payload.providerStatusCode : undefined,
        providerStatusDetail:
          typeof payload.providerStatusDetail === "string"
            ? payload.providerStatusDetail
            : undefined,
        callbackMsisdn: normalizeMsisdn(payload.msisdn) || undefined,
        callbackAmountBdt: typeof payload.amount === "string" ? payload.amount : undefined,
        callbackCurrency: typeof payload.currency === "string" ? payload.currency : undefined,
      });

      if (!settled.found) {
        res.status(404).json({ ok: false, error: "Unknown externalTrxId." });
        return;
      }

      res.json({
        ok: true,
        event,
        externalTrxId,
        status: settled.purchase?.status,
        alreadySettled: settled.alreadySettled,
        walletBalance: settled.wallet?.balance ?? null,
      });
      return;
    } catch (err) {
      res.status(503).json({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to settle charging callback.",
      });
      return;
    }
  }

  if (event === "subscription_notification") {
    const msisdn = normalizeMsisdn(payload.msisdn);
    if (!msisdn) {
      res.status(400).json({ ok: false, error: "Invalid msisdn in subscription_notification." });
      return;
    }
    const runtime = getRuntimeSettings();
    const disclosure = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);
    const providerStatus = typeof payload.status === "string" ? payload.status.toUpperCase() : "";
    const registered = providerStatus === "REGISTERED";
    const now = new Date().toISOString();

    try {
      await persistSubscription({
        msisdn,
        status: registered && runtime.subscriptionEnabled ? "active_production" : "unsubscribed",
        mode: runtime.mode,
        planName: disclosure.planName,
        priceLabel: disclosure.priceLabel,
        billingFrequency: disclosure.billingFrequency,
        renewalTerms: disclosure.renewalTerms,
        cancellationMethod: disclosure.cancellationMethod,
        consentTimestamp: registered ? now : null,
        nextRenewalAt: null,
        entitlementActive: Boolean(registered && runtime.subscriptionEnabled),
        subscriberId: maskMsisdn(msisdn),
        updatedAt: now,
      });

      let settledPurchase: {
        settled: boolean;
        status: string | null;
        walletBalance: number | null;
      } | null = null;

      if (getLiveSubscriptionGateStatus().allowed &&
          process.env.ROBITRAIL_CARRIER_CHECKOUT_APPROVED === "true" &&
          getLiveChargingGateStatus().allowed) {
        if (registered) {
          const settled = await settlePendingSubscriptionPurchaseForMsisdn(msisdn, "confirmed", {
            providerStatusCode: "S1000",
            providerStatusDetail: "Confirmed via bdapps subscription_notification webhook.",
          });
          if (settled.found) {
            settledPurchase = {
              settled: !settled.alreadySettled,
              status: settled.purchase?.status || "confirmed",
              walletBalance: settled.wallet?.balance ?? null,
            };
          }
        } else if (
          providerStatus === "UNREGISTERED" ||
          providerStatus === "CANCELLED" ||
          providerStatus === "FAILED"
        ) {
          const settled = await settlePendingSubscriptionPurchaseForMsisdn(msisdn, "failed", {
            providerStatusCode: providerStatus,
            providerStatusDetail:
              "bdapps subscription notification reported non-registered status.",
          });
          if (settled.found) {
            settledPurchase = {
              settled: !settled.alreadySettled,
              status: settled.purchase?.status || "failed",
              walletBalance: settled.wallet?.balance ?? null,
            };
          }
        }
      }

      res.json({ ok: true, event, recorded: true, settledPurchase });
      return;
    } catch (err) {
      res.status(503).json({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to persist subscription callback.",
      });
      return;
    }
  }

  if (event === "consent_notification") {
    res.json({
      ok: true,
      event,
      recorded: true,
      requestId: typeof payload.requestId === "string" ? payload.requestId : null,
    });
    return;
  }

  res.status(400).json({ ok: false, error: "Unsupported internal callback event type." });
});

app.patch("/api/account/profile", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const masked = maskMsisdn(session.msisdn);
  try {
    const existing = await loadAccount(session.msisdn);
    if (!existing) {
      res.status(404).json({ error: "Account must be activated before updating profile." });
      return;
    }
    const displayName =
      typeof req.body?.displayName === "string" && req.body.displayName.trim().length > 0
        ? req.body.displayName.trim().slice(0, 60)
        : existing.displayName;
    const preferredLang =
      req.body?.preferredLang === "bn" || req.body?.preferredLang === "en"
        ? req.body.preferredLang
        : existing.preferredLang;
    const preferredCityId =
      req.body?.preferredCityId === "chattogram" ||
      req.body?.preferredCityId === "dhaka" ||
      req.body?.preferredCityId === "sylhet"
        ? req.body.preferredCityId
        : existing.preferredCityId;

    const updated = await saveOrUpdateAccount(session.msisdn, masked, {
      displayName,
      preferredLang,
      preferredCityId,
    });
    res.json({ account: await toPublicAccount(updated) });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Profile update failed." });
  }
});

app.post("/api/account/progress", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const masked = maskMsisdn(session.msisdn);
  try {
    const existing = await loadAccount(session.msisdn);
    if (!existing) {
      res.status(404).json({ error: "Account must be activated before syncing progress." });
      return;
    }

    const incomingTrails = sanitizeTrailIds(req.body?.completedTrailIds);
    const incomingCertIds =
      getRuntimeSettings().mode === "production"
        ? []
        : Array.isArray(req.body?.certificateIds)
          ? req.body.certificateIds.filter((id: unknown): id is string => typeof id === "string")
          : [];

    const updated = await saveOrUpdateAccount(session.msisdn, masked, {
      completedTrailIds: incomingTrails,
      certificateIds: incomingCertIds,
    });
    res.json({ account: await toPublicAccount(updated) });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Progress sync failed." });
  }
});

app.delete("/api/account/me", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const confirm =
    typeof req.body?.confirmDelete === "string" ? req.body.confirmDelete.trim().toUpperCase() : "";
  if (confirm !== "DELETE") {
    res.status(400).json({ error: "Type DELETE to permanently confirm account deletion." });
    return;
  }
  const session = req.subscriberSession!;
  try {
    await deleteAccountData(session.msisdn);
    res.json({ deleted: true });
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Account delete failed." });
  }
});

// 8. Server-side Certificate Assessment & Persistent Certificate Issuance
const ASSESSMENT_ANSWER_KEY: Record<string, string> = {
  q1: "tower_core_tower",
  q2: "same_volume_faster_time",
  q3: "buildings_and_distance",
  q4: "sms_or_voice",
  q5: "mnp_cannot_verify_by_prefix",
  q6: "sector_bandwidth_sharing",
};

app.post("/api/certification/assess", async (req, res) => {
  const learnerName =
    typeof req.body?.learnerName === "string" ? req.body.learnerName.trim().slice(0, 80) : "";
  const session = extractOptionalSession(req);
  const productionCert = getRuntimeSettings().mode === "production";
  if (productionCert && (!session || session.mode !== "production")) {
    res.status(401).json({ error: "Mobile OTP login is required to issue a saved certificate." });
    return;
  }
  const existingAccount = session ? await loadAccount(session.msisdn).catch(() => null) : null;
  if (productionCert && !existingAccount) {
    res.status(404).json({ error: "No verified account found." });
    return;
  }
  const completedTrailIds = productionCert
    ? sanitizeTrailIds(existingAccount?.completedTrailIds || [])
    : sanitizeTrailIds(req.body?.completedTrailIds);
  const answers =
    req.body?.answers && typeof req.body.answers === "object"
      ? (req.body.answers as Record<string, unknown>)
      : {};

  if (!learnerName || learnerName.length < 2) {
    res.status(400).json({ error: "Please enter a learner name (at least 2 characters)." });
    return;
  }

  if (completedTrailIds.length < 3) {
    res.status(400).json({
      error: "Complete at least 3 interactive trails before taking the certification assessment.",
    });
    return;
  }

  let correctCount = 0;
  const totalQuestions = Object.keys(ASSESSMENT_ANSWER_KEY).length;
  for (const [qId, expected] of Object.entries(ASSESSMENT_ANSWER_KEY)) {
    if (answers[qId] === expected) {
      correctCount += 1;
    }
  }

  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercent >= 67;

  if (!passed) {
    res.json({
      passed: false,
      scorePercent,
      correctCount,
      totalQuestions,
      message: "Score at least 67% (4/6) to unlock the educational completion certificate.",
    });
    return;
  }

  const certificateId = `RT-PROTO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const record: CertificateRecord = await persistCertificate({
    certificateId,
    learnerName,
    completedTrailIds,
    scorePercent,
    passed: true,
    issuedAt: new Date().toISOString(),
    prototypeLabel:
      "Simulated Educational Prototype Certificate (Not an official Robi/bdapps credential)",
    ownerAccountId: existingAccount?.accountId,
  });

  if (session && existingAccount) {
    await saveOrUpdateAccount(session.msisdn, maskMsisdn(session.msisdn), {
      completedTrailIds,
      certificateIds: [certificateId],
    });
  }

  res.json({
    passed: true,
    scorePercent,
    correctCount,
    totalQuestions,
    certificate: record,
  });
});

app.get("/api/certification/verify/:id", async (req, res) => {
  try {
    const cert = await loadCertificate(req.params.id);
    if (!cert) {
      res.status(404).json({ error: "Certificate record not found." });
      return;
    }
    res.json({ certificate: cert });
  } catch {
    res.status(503).json({ error: "Certificate verification is unavailable." });
  }
});

export const robiApi = app;
