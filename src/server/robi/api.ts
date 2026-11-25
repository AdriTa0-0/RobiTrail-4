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
  queryCaasBalanceViaPhpGateway,
  subscribeViaPhpGateway,
  unsubscribeViaPhpGateway,
  verifyPhpCallbackSignature,
  sendSmsViaPhpGateway,
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
  fsConsumeLoginOtp,
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

/** Separate domain for login OTPs; reuses the already-configured production session secret. */
function getOtpHmacKey(): Buffer | null {
  const env = process.env as Record<string, string | undefined>;
  const input = env.OTP_HASH_SECRET?.trim() || env.SESSION_SIGNING_KEY?.trim() || "";
  if (input.length < 32 || input.startsWith("REPLACE_WITH_")) return null;
  return crypto.createHmac("sha256", input).update("RobiTrail/SMS-OTP/v1").digest();
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

function buildSubscriptionDisclosure(mode: "preview" | "production", shortCode: string) {
  return {
    planName: "RobiTrail Access (All 16 City Trails)",
    priceLabel:
      mode === "production" ? "bdapps Subscription Billing" : "Gateway Configuration Required",
    billingFrequency: "Processed via bdapps Subscription API",
    renewalTerms:
      "Token Center pack credits are applied once carrier subscription confirmation completes.",
    cancellationMethod: "Use the in-app unsubscribe control when managing active subscriptions.",
    shortCode,
  };
}

interface OtpChallenge {
  referenceNo: string;
  msisdn: string;
  previewCode: string;
  expiresAt: number;
  attempts: number;
}

const otpChallenges = new Map<string, OtpChallenge>();

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
}): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(
  token: string,
): { msisdn: string; mode: "preview" | "production"; exp: number } | null {
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
    };
    if (!parsed.msisdn || typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  subscriberSession?: { msisdn: string; mode: "preview" | "production"; exp: number };
}

function extractOptionalSession(
  req: Request,
): { msisdn: string; mode: "preview" | "production"; exp: number } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7).trim());
}

function requireSubscriberAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const decoded = extractOptionalSession(req);
  if (!decoded) {
    res.status(401).json({
      error: "Authentication required or session expired. Please verify your mobile OTP.",
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
    smsLoginConfigured:
      cfg.mode === "production" &&
      process.env.ROBITRAIL_SMS_LOGIN_ENABLED === "true" &&
      Boolean(getOtpHmacKey()) &&
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

// 2. OTP Request (strictly separated from paid subscription activation; routed via PHP gateway in production)
app.post("/api/bdapps/otp/request", async (req, res) => {
  const msisdn = normalizeMsisdn(req.body?.phoneNumber);
  if (!msisdn) {
    res.status(400).json({ error: "Invalid Bangladesh mobile number format." });
    return;
  }

  const runtime = getRuntimeSettings();
  const requestedIntent = req.body?.intent;
  if (requestedIntent === "subscribe") {
    res.status(403).json({
      error:
        "OTP verification is strictly separated from paid subscriptions. Registration OTP cannot trigger a subscription.",
    });
    return;
  }
  const intent: "login" | "register" = requestedIntent === "login" ? "login" : "register";
  const referenceNo = `RT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  if (runtime.mode === "production") {
    const env = process.env as Record<string, string | undefined>;
    if (
      env.ROBITRAIL_SMS_LOGIN_ENABLED !== "true" ||
      !isFirestorePersistenceConfigured() ||
      !getOtpHmacKey()
    ) {
      res
        .status(503)
        .json({ error: "SMS login is not configured. No subscription or charge was initiated." });
      return;
    }
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto
      .createHmac("sha256", getOtpHmacKey()!)
      .update(`${referenceNo}:${code}`)
      .digest("hex");
    try {
      const created = await fsCreateLoginOtp(referenceNo, msisdn, codeHash);
      if (!created.allowed) {
        res.status(429).json({
          error: "Please wait before requesting another OTP.",
          retryAfterSeconds: created.retryAfterSeconds,
        });
        return;
      }
      // This invokes ONLY /sms/send, never bdapps /otp/request or /otp/verify.
      const sent = await sendSmsViaPhpGateway(
        msisdn,
        `RobiTrail login code: ${code}. Valid for 5 minutes. Do not share this code.`,
      );
      const accepted = sent.ok && sent.data?.statusCode === "S1000";
      await fsMarkLoginOtpSent(referenceNo, accepted);

      if (!accepted) {
        const statusCode = String(sent.data?.statusCode || "SMS_UNAVAILABLE");

        const upstreamHttpStatus = sent.httpStatus;

        const providerDetail = String(sent.data?.statusDetail || sent.error || "");

        console.error("[RobiTrail SMS OTP failure]", {
          statusCode,
          upstreamHttpStatus,
          providerDetail,
        });

        res.status(503).json({
          error: "SMS provider rejected the verification request.",
          statusCode,
          upstreamHttpStatus,
          // Do not expose raw provider details to the browser.
        });
        return;
      }

      res.json({
        mode: "production",
        referenceNo,
        maskedNumber: maskMsisdn(msisdn),
        expiresInSeconds: 300,
        notice: "SMS request accepted by provider. Delivery is not yet confirmed.",
      });
    } catch {
      res.status(503).json({ error: "SMS login is temporarily unavailable." });
    }
    return;
  }

  const previewCode = String(crypto.randomInt(100000, 999999));
  otpChallenges.set(referenceNo, {
    referenceNo,
    msisdn,
    previewCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  res.json({
    mode: "preview",
    referenceNo,
    maskedNumber: maskMsisdn(msisdn),
    expiresInSeconds: 300,
    previewOnlyOtp: previewCode,
    notice:
      "Preview Mode Verification Code: No real SMS was sent via mobile carrier and zero balance was charged.",
  });
});

// 3. OTP Verification (routed via PHP gateway in production; NEVER activates paid subscriptions)
app.post("/api/bdapps/otp/verify", async (req, res) => {
  const referenceNo = typeof req.body?.referenceNo === "string" ? req.body.referenceNo.trim() : "";
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  if (!/^RT-[A-F0-9]{12}$/.test(referenceNo)) {
    res.status(400).json({ error: "Invalid OTP reference." });
    return;
  }
  const displayName =
    typeof req.body?.displayName === "string"
      ? req.body.displayName.trim().slice(0, 60)
      : undefined;
  const localTrailIds = sanitizeTrailIds(req.body?.localCompletedTrailIds);
  const localCertificateIds =
    getRuntimeSettings().mode === "production"
      ? []
      : Array.isArray(req.body?.localCertificateIds)
        ? req.body.localCertificateIds.filter((id: unknown): id is string => typeof id === "string")
        : [];
  const preferredLang = req.body?.preferredLang === "bn" ? "bn" : "en";
  const preferredCityId =
    req.body?.preferredCityId === "dhaka" || req.body?.preferredCityId === "sylhet"
      ? req.body.preferredCityId
      : "chattogram";

  const runtime = getRuntimeSettings();
  let productionMsisdn: string | undefined;
  if (runtime.mode === "production") {
    const env = process.env as Record<string, string | undefined>;
    if (env.ROBITRAIL_SMS_LOGIN_ENABLED !== "true" || !getOtpHmacKey() || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: "Invalid OTP or SMS login is not configured." });
      return;
    }
    try {
      const hash = crypto
        .createHmac("sha256", getOtpHmacKey()!)
        .update(`${referenceNo}:${otp}`)
        .digest("hex");
      const verified = await fsConsumeLoginOtp(referenceNo, hash);
      if (!verified.ok || !verified.msisdn) {
        res
          .status(400)
          .json({ error: "OTP invalid, expired, or already used. Please request a new code." });
        return;
      }
      productionMsisdn = verified.msisdn;
    } catch {
      res.status(503).json({ error: "OTP verification service unavailable." });
      return;
    }
  }
  const challenge =
    runtime.mode === "production" && productionMsisdn
      ? {
          referenceNo,
          msisdn: productionMsisdn,
          previewCode: "",
          expiresAt: Date.now() + 300_000,
          attempts: 0,
        }
      : otpChallenges.get(referenceNo);
  if (!challenge) {
    res.status(400).json({ error: "OTP session not found or expired. Please request a new OTP." });
    return;
  }
  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(referenceNo);
    res.status(400).json({ error: "OTP expired (5 minute window elapsed). Request a new code." });
    return;
  }
  if (challenge.attempts >= 5) {
    otpChallenges.delete(referenceNo);
    res
      .status(429)
      .json({ error: "Too many incorrect OTP attempts. Please request a fresh code." });
    return;
  }
  challenge.attempts += 1;

  if (runtime.mode === "production") {
    // Already atomically verified and consumed in Firestore above.
  } else {
    if (!/^\d{6}$/.test(otp) || otp !== challenge.previewCode) {
      const remaining = Math.max(0, 5 - challenge.attempts);
      res.status(400).json({
        error:
          remaining > 0
            ? `Incorrect preview OTP code. ${remaining} attempt(s) remaining.`
            : "Too many incorrect OTP attempts. Request a new OTP code.",
      });
      return;
    }
  }

  otpChallenges.delete(referenceNo);

  try {
    const masked = maskMsisdn(challenge.msisdn);
    const token = signToken({
      msisdn: challenge.msisdn,
      mode: runtime.mode,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    const accountRecord = await saveOrUpdateAccount(challenge.msisdn, masked, {
      displayName,
      completedTrailIds: localTrailIds,
      certificateIds: localCertificateIds,
      preferredLang,
      preferredCityId,
      authMethod: "otp",
      recordLogin: true,
    });

    const sub = await loadSubscription(challenge.msisdn);
    const rewardResult = await grantWelcomeTokensIdempotent(
      challenge.msisdn,
      accountRecord.accountId,
    );
    const persistenceBackend = getPersistenceBackend();
    const smsPreview = rewardResult.grantedNow
      ? await dispatchBdappsSmsNotification(challenge.msisdn, masked, "welcome_tokens_reward", {
          tokens: 10,
          balanceAfter: rewardResult.wallet.balance,
        })
      : await dispatchBdappsSmsNotification(challenge.msisdn, masked, "registration_confirmation");

    res.json({
      verified: true,
      authMethod: "otp",
      mode: runtime.mode,
      persistenceBackend,
      persistedToFirestore: persistenceBackend === "firestore",
      token,
      maskedNumber: masked,
      accountActivated: true,
      account: await toPublicAccount(accountRecord),
      subscription: formatPublicSubscription(
        challenge.msisdn,
        sub,
        runtime.mode,
        runtime.shortCode,
      ),
      wallet: rewardResult.wallet,
      welcomeGrantedNow: rewardResult.grantedNow,
      smsPreview,
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Persistence error while creating account.",
    });
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
app.post("/api/bdapps/unsubscribe", requireSubscriberAuth, async (req: AuthedRequest, res) => {
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
  const subGate = getLiveSubscriptionGateStatus();
  res.json({
    mode: runtime.mode === "production" ? "live_bdapps" : "demo",
    billingChannel: "subscription",
    liveChargingEnabled: runtime.liveChargingEnabled,
    subscriptionEnabled: runtime.subscriptionEnabled,
    phpGatewayConfigured: runtime.phpGatewayConfigured,
    gatewayReady: subGate.allowed,
    gatewayBlockedReason: subGate.reason,
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

app.post("/api/tokens/shop/purchase", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const runtime = getRuntimeSettings();

  let account;
  try {
    account = await loadAccount(session.msisdn);
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Persistence error loading account.",
    });
    return;
  }

  if (!account) {
    res.status(404).json({ ok: false, error: "Account must be verified before buying tokens." });
    return;
  }

  const packageId = typeof req.body?.packageId === "string" ? req.body.packageId.trim() : "";
  const pkg = getTokenPackageById(packageId);
  if (!pkg) {
    res.status(400).json({ ok: false, error: "Unknown token package selected." });
    return;
  }

  if (req.body?.userConfirmed !== true && req.body?.consentAccepted !== true) {
    res.status(400).json({
      ok: false,
      error: "Explicit user consent is required before initiating bdapps Subscription billing.",
    });
    return;
  }

  // Strictly require live Subscription API + PHP gateway + production persistence (never simulate)
  const gate = getLiveSubscriptionGateStatus();
  if (!gate.allowed) {
    res.status(503).json({
      ok: false,
      blocked: true,
      billingChannel: "subscription",
      error: gate.reason || "Live bdapps Subscription API is not configured.",
      mode: "live_bdapps",
    });
    return;
  }

  const clientIdempotencyKey =
    typeof req.body?.idempotencyKey === "string" &&
    /^[A-Za-z0-9:_-]{8,100}$/.test(req.body.idempotencyKey)
      ? req.body.idempotencyKey
      : crypto.randomBytes(16).toString("hex");
  const idempotencyKey = `RT-${crypto.createHmac("sha256", getSigningKey()).update(`${session.msisdn}:${pkg.packageId}:${clientIdempotencyKey}`).digest("hex").slice(0, 40)}`;

  try {
    // 1. Atomically persist a PENDING subscription token order before hitting PHP gateway
    const pending = await createLivePendingPurchase(session.msisdn, account.accountId, {
      externalTrxId: idempotencyKey,
      packageId: pkg.packageId,
      tokens: pkg.tokens,
      priceBdt: pkg.priceBdt,
      billingChannel: "subscription",
    });

    if (pending.duplicate) {
      const existingWallet = pending.wallet;
      const existingStatus = pending.purchase.status;
      res
        .status(existingStatus === "failed" ? 402 : existingStatus === "pending" ? 202 : 200)
        .json({
          ok: existingStatus !== "failed",
          duplicate: true,
          pendingConfirmation: existingStatus === "pending",
          status: existingStatus,
          externalTrxId: pending.purchase.externalTrxId,
          wallet: existingWallet,
          mode: "live_bdapps",
          billingChannel: "subscription",
          notice:
            existingStatus === "confirmed"
              ? "Duplicate purchase request ignored; pack tokens were already credited once."
              : existingStatus === "pending"
                ? "Subscription purchase is already pending verified bdapps confirmation."
                : "Subscription purchase failed previously; no tokens were credited.",
        });
      return;
    }

    // 2. Call PHP bdapps Subscription gateway and check confirmation status
    const subCharge = await executeBdappsSubscriptionPurchase(session.msisdn, pkg, idempotencyKey, {
      userConfirmed: true,
    });

    if (subCharge.txState === "failed") {
      const failedSettlement = await settleLivePurchase(idempotencyKey, "failed", {
        providerStatusCode: subCharge.statusCode || "FAILED",
        providerStatusDetail: subCharge.notice,
      });
      const httpStatus =
        subCharge.httpStatus >= 500 ? subCharge.httpStatus : subCharge.blocked ? 503 : 402;
      res.status(httpStatus).json({
        ok: false,
        blocked: Boolean(subCharge.blocked),
        duplicate: false,
        status: "failed",
        externalTrxId: idempotencyKey,
        error: subCharge.notice,
        wallet: failedSettlement.wallet || pending.wallet,
        transaction: failedSettlement.transaction,
        mode: "live_bdapps",
        billingChannel: "subscription",
      });
      return;
    }

    const now = new Date().toISOString();
    const disclosure = buildSubscriptionDisclosure(runtime.mode, runtime.shortCode);

    if (subCharge.txState === "confirmed") {
      await persistSubscription({
        msisdn: session.msisdn,
        status: "active_production",
        mode: "production",
        planName: disclosure.planName,
        priceLabel: `BDT ${pkg.priceBdt} (${pkg.tokens} Tokens)`,
        billingFrequency: disclosure.billingFrequency,
        renewalTerms: disclosure.renewalTerms,
        cancellationMethod: disclosure.cancellationMethod,
        consentTimestamp: now,
        nextRenewalAt: null,
        entitlementActive: true,
        subscriberId: maskMsisdn(session.msisdn),
        updatedAt: now,
      });

      const settled = await settleLivePurchase(idempotencyKey, "confirmed", {
        providerStatusCode: subCharge.statusCode || "S1000",
        providerStatusDetail: subCharge.notice,
      });

      const smsPreview = settled.wallet
        ? await dispatchBdappsSmsNotification(
            session.msisdn,
            maskMsisdn(session.msisdn),
            "token_purchase_confirmation",
            {
              tokens: pkg.tokens,
              priceBdt: pkg.priceBdt,
              balanceAfter: settled.wallet.balance,
            },
          )
        : null;

      res.json({
        ok: true,
        duplicate: settled.alreadySettled,
        pendingConfirmation: false,
        status: "confirmed",
        externalTrxId: idempotencyKey,
        wallet: settled.wallet || pending.wallet,
        transaction: settled.transaction,
        smsPreview,
        notice: subCharge.notice,
        mode: "live_bdapps",
        billingChannel: "subscription",
      });
      return;
    }

    // 3. Pending Confirmation: persist consent record, credit ZERO tokens until confirmed
    await persistSubscription({
      msisdn: session.msisdn,
      status: "inactive",
      mode: "production",
      planName: disclosure.planName,
      priceLabel: `BDT ${pkg.priceBdt} (${pkg.tokens} Tokens)`,
      billingFrequency: disclosure.billingFrequency,
      renewalTerms: disclosure.renewalTerms,
      cancellationMethod: disclosure.cancellationMethod,
      consentTimestamp: now,
      nextRenewalAt: null,
      entitlementActive: false,
      subscriberId: maskMsisdn(session.msisdn),
      updatedAt: now,
    });

    res.status(202).json({
      ok: true,
      duplicate: false,
      pendingConfirmation: true,
      status: "pending",
      externalTrxId: idempotencyKey,
      wallet: pending.wallet,
      transaction: null,
      notice: subCharge.notice,
      mode: "live_bdapps",
      billingChannel: "subscription",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Live Subscription persistence failure.",
      mode: "live_bdapps",
    });
  }
});

app.get("/api/tokens/shop/status", requireSubscriberAuth, async (req: AuthedRequest, res) => {
  const session = req.subscriberSession!;
  const gate = getLiveSubscriptionGateStatus();
  if (!gate.allowed) {
    res.status(503).json({
      ok: false,
      blocked: true,
      error: gate.reason || "Live bdapps Subscription API is not configured.",
      mode: "live_bdapps",
    });
    return;
  }

  const externalTrxId =
    typeof req.query?.externalTrxId === "string" ? req.query.externalTrxId.trim() : "";
  if (!externalTrxId) {
    res.status(400).json({ ok: false, error: "externalTrxId query parameter is required." });
    return;
  }

  try {
    const orderResult = await getLivePurchaseOrder(externalTrxId);
    if (!orderResult.purchase || orderResult.purchase.msisdn !== session.msisdn) {
      res.status(404).json({ ok: false, error: "Token purchase order not found." });
      return;
    }

    const order = orderResult.purchase;
    if (order.status === "pending") {
      const statusCheck = await getSubscriptionStatusViaPhpGateway(session.msisdn);
      const subStatus = statusCheck.ok
        ? normalizeBdappsSubscriptionStatus(statusCheck.data?.subscriptionStatus)
        : "";
      if (subStatus === "REGISTERED") {
        const now = new Date().toISOString();
        const disclosure = buildSubscriptionDisclosure(
          "production",
          getRuntimeSettings().shortCode,
        );
        await persistSubscription({
          msisdn: session.msisdn,
          status: "active_production",
          mode: "production",
          planName: disclosure.planName,
          priceLabel: `BDT ${order.priceBdt} (${order.tokens} Tokens)`,
          billingFrequency: disclosure.billingFrequency,
          renewalTerms: disclosure.renewalTerms,
          cancellationMethod: disclosure.cancellationMethod,
          consentTimestamp: now,
          nextRenewalAt: null,
          entitlementActive: true,
          subscriberId: maskMsisdn(session.msisdn),
          updatedAt: now,
        });
        const settled = await settleLivePurchase(externalTrxId, "confirmed", {
          providerStatusCode: "S1000",
          providerStatusDetail: "Confirmed via bdapps subscription status check.",
        });
        const smsPreview = settled.wallet
          ? await dispatchBdappsSmsNotification(
              session.msisdn,
              maskMsisdn(session.msisdn),
              "token_purchase_confirmation",
              {
                tokens: order.tokens,
                priceBdt: order.priceBdt,
                balanceAfter: settled.wallet.balance,
              },
            )
          : null;
        res.json({
          ok: true,
          pendingConfirmation: false,
          status: "confirmed",
          externalTrxId,
          wallet: settled.wallet,
          transaction: settled.transaction,
          smsPreview,
          notice: `bdapps subscription confirmed; +${order.tokens} tokens credited to your wallet.`,
          mode: "live_bdapps",
        });
        return;
      }

      res.status(202).json({
        ok: true,
        pendingConfirmation: true,
        status: "pending",
        externalTrxId,
        wallet: orderResult.wallet,
        transaction: null,
        notice:
          "Subscription confirmation is still pending from bdapps. Please check again shortly.",
        mode: "live_bdapps",
      });
      return;
    }

    if (order.status === "failed") {
      res.status(402).json({
        ok: false,
        pendingConfirmation: false,
        status: "failed",
        externalTrxId,
        error: order.providerStatusDetail || "Subscription purchase failed.",
        wallet: orderResult.wallet,
        transaction: orderResult.transaction,
        mode: "live_bdapps",
      });
      return;
    }

    res.json({
      ok: true,
      pendingConfirmation: false,
      status: "confirmed",
      externalTrxId,
      wallet: orderResult.wallet,
      transaction: orderResult.transaction,
      notice: `bdapps subscription confirmed; +${order.tokens} tokens credited to your wallet.`,
      mode: "live_bdapps",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unable to check subscription purchase status.",
    });
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

      if (getLiveSubscriptionGateStatus().allowed) {
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
