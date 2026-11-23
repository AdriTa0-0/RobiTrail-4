# RobiTrail PHP-Based bdapps API Gateway Integration Plan

This plan introduces a standalone PHP 8+ bdapps API gateway for RobiTrail (`APP_140847`) and connects it securely to the existing Node.js backend with HMAC-SHA256 authentication, atomic Firestore persistence for production token accounting, and strict gating that keeps live CaaS billing and recurring subscriptions disabled until organizer and bdapps approval.

---

### User Review & Critical Decisions

> [!IMPORTANT] All architectural preferences below reflect your Phase 1 selections and strict preservation constraints. Review the Firestore project note and bdapps confirmation gates before approving execution.

- **Persistent Database Choice**: **Firestore with atomic transactions** — Production token wallets, purchase records (`pending` → `confirmed` / `failed`), and idempotency keys will use a dedicated server-side Firestore adapter with transactional balance updates, while Preview Mode continues to work seamlessly via the existing preview store.
- **Node.js ↔ PHP Authentication**: **HMAC-SHA256 signature with timestamp** — Every server-to-server request from Node.js to the PHP gateway is signed with a shared secret, UTC timestamp, and replay window check.
- **Live CaaS Payment Gating**: **Keep live CaaS billing disabled until bdapps approval** — Live carrier charging remains explicitly disabled by default (`BDAPPS_LIVE_CHARGING_ENABLED=false`) even if gateway credentials are populated; real token credits occur only after verified payment confirmation and atomic idempotency checks.
- **cPanel Credential Storage**: **Private config file above `public_html`** — Provider secrets (`BDAPPS_APP_ID`, `BDAPPS_API_SECRET`) and gateway secrets live outside the web-accessible folder, accompanied by strict directory access guards and an example template.
- **Firestore Admin Access Note**: Server-side Firestore transactions require IAM access (`roles/datastore.user`) on a user-owned Firebase/Google Cloud project (the existing Firebase project configuration is preserved, and live charging stays disabled as a safety guard whenever server-side Firestore persistence is not yet reachable).

---

### 1. Overview & Core Concept

- **What It Delivers**: A decoupled PHP 8+ telecommunications gateway bridging RobiTrail's Node.js backend to the bdapps carrier platform (`APP_140847`), paired with callback endpoints for charging, subscription, and consent notifications, plus atomic Firestore persistence for paid token ledgers.
- **Strict Preservation Boundary**: Zero changes are made to any 3D missions, game logic, unlock/mistake rules, the Token Center UI and its six token packages, account registration flows, translations, or Android APK compatibility.
- **Safety Posture**: Preview Mode remains fully operational with zero carrier charges; live CaaS charging and recurring subscription activations remain locked behind explicit feature flags and bdapps confirmation gates.

---

### 2. Preservation & Interaction Boundary

- **Unchanged Browser Experience**: Players interact exclusively with the existing React + TanStack Start UI and existing `/api/*` Node.js routes. The browser never calls PHP endpoints or holds carrier/gateway secrets.
- **Exact Token Package Integrity**: The six proposed token packages remain unchanged (`6→৳2`, `10→৳7`, `15→৳10`, `20→৳17`, `25→৳22`, `31→৳26`), with explicit purchase confirmation in the UI and no recurring billing attached to token purchases.
- **OTP & Subscription Separation**: Registration OTP verification remains completely separate from paid subscription consent so verifying a phone number never silently activates a recurring subscription.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Two-Layer Trust Boundary (Node ↔ PHP vs. bdapps → PHP)**
  - *Chosen Approach*: Node.js → PHP requests require HMAC-SHA256 (`X-RobiTrail-Timestamp` + `X-RobiTrail-Signature`) over timestamp + HTTP method + path + canonical body; external bdapps webhook endpoints (`charging`, `subscription`, `consent`) use a separate provider verification layer (app ID, configurable callback credential/signature check, and optional IP allowlist) before forwarding signed internal callbacks to Node.js.
  - *Why*: Separates internal backend trust from third-party carrier webhook formats so neither trust path weakens the other.
  - *Alternatives Considered*: A single static Bearer token is easier to leak and offers no replay protection against captured requests.

- **Decision 2: Atomic Firestore Persistence Adapter with Safe Fallback**
  - *Chosen Approach*: Introduce a repository/adapter layer that routes Preview Mode traffic to the existing preview store while routing production token balances, purchases, and idempotency records to Firestore transactions (`runTransaction`), enforcing strict `pending` → `confirmed` / `failed` state transitions.
  - *Why*: Prevents double-crediting on duplicate clicks or duplicate carrier webhooks and ensures wallet balances are never lost across server restarts in production.
  - *Alternatives Considered*: Relying on the in-memory store for paid tokens risks lost balances and duplicate credits.

- **Decision 3: Hard Safety Lock on Live CaaS & Subscriptions**
  - *Chosen Approach*: Add an explicit live-charging lock inside both the Node.js integration layer and the PHP CaaS handler (`LIVE_CHARGING_ENABLED=false` by default). Simply populating environment credentials will not trigger real carrier deductions; subscription handlers remain isolated preparation stubs until an approved product plan exists.
  - *Why*: Protects testers and subscribers from accidental live billing before official bdapps approval, final assigned hosting path, and confirmed CaaS/OTP endpoint schemas.

- **Decision 4: cPanel Hosting Layout Outside `public_html`**
  - *Chosen Approach*: Provide a portable PHP gateway bundle targeting `https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/` with secrets stored in a private config file one level above `public_html`, plus `.htaccess` rules blocking direct config access if misplaced.
  - *Why*: Meets shared cPanel hosting constraints while keeping credentials unreachable via HTTP.

---

### 4. Technical Architecture & Data Strategy

- **End-to-End Request & Notification Architecture**:

```text
┌───────────────────┐       Same-Origin API       ┌──────────────────────────┐
│  React Frontend   │ ──────────────────────────► │   Existing Node.js API   │
│  (No Secrets)     │   /api/bdapps/*             │   (Session Auth & Logic) │
└───────────────────┘   /api/tokens/*             └────────────┬─────────────┘
                                                               │
                    ┌──────────────────────────────────────────┤
                    │                                          │
                    ▼ (Preview Mode)                           ▼ (Production / PHP Mode)
       ┌────────────────────────┐                 ┌────────────────────────────┐
       │  Preview Memory Store  │                 │ HMAC-SHA256 Signed Request │
       │  (Zero Real Billing)   │                 │  (PHP Gateway Client)      │
       └────────────────────────┘                 └────────────┬───────────────┘
                                                               │
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 PHP 8+ cPanel Gateway (/auw26/ASSIGNED_FOLDER/)              │
│   • Health Check (No Secrets)     • Request Handlers (OTP, SMS, CaaS, Sub)   │
│   • HMAC & Timestamp Verifier     • Notification Webhooks (Charging/Sub/Consent)
│   • Private Config Above webroot  • PHP cURL HTTPS Client                    │
└───────────────────────────────┬──────────────────────────────▲───────────────┘
                                │ HTTPS JSON (appId+secret)    │ Provider Webhook
                                ▼                              │
                    ┌──────────────────────────────────────────┴───────────────┐
                    │              bdapps Carrier Platform (APP_140847)        │
                    └──────────────────────────────────────────────────────────┘
                                                               │
       ┌───────────────────────────────────────────────────────┘
       ▼ (Verified Notification → Signed Internal Callback to Node.js)
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Firestore Atomic Persistence (Production Mode)               │
│   • Wallet Balances    • Purchase States (pending/confirmed/failed)          │
│   • Processed Idempotency Keys (Prevents Duplicate Charging/Credits)         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Security Safeguards**:
  - Private bdapps credentials, Firestore server credentials, and the Node-to-PHP HMAC shared secret reside exclusively on server environments and never enter client bundles or browser responses.
  - Health checks report operational readiness (`phpVersion`, `curlEnabled`, `configPresent`, `liveChargingEnabled`) without leaking secrets, file paths, or credentials.
  - Token purchase state machine enforces unique `externalTrxId` / `idempotencyKey` tracking: incoming CaaS requests create a `pending` record first and only credit tokens atomically inside a Firestore transaction when verified payment confirmation arrives.
  - Notification webhooks require provider verification and forward signed internal updates to Node.js using constant-time HMAC signature validation.
  - Firestore security rules keep server-managed wallet, purchase ledger, and idempotency collections closed to direct client writes.

- **Key Sequences & Integrations**:
  - **Outbound SMS & OTP**: Node.js signs and forwards requests via the PHP client module to PHP handlers (`sms_send`, `otp_request`, `otp_verify`), which invoke bdapps over HTTPS cURL and return normalized responses back to Node.js without altering frontend API contracts.
  - **Token Purchase Lifecycle**:
    1. Player clicks **Buy Now** and confirms in the existing Token Center modal.
    2. Preview Mode simulates success/failure cleanly via existing Node.js preview flow.
    3. Production Mode (when explicitly unlocked after approval) records a `pending` transaction atomically via the database adapter, invokes the PHP CaaS handler with a unique `externalTrxId`, and transitions to `confirmed` (crediting tokens once) or `failed` only upon verified confirmation/callback.
  - **bdapps Confirmation Checklist (Documented in Deliverables & Comments)**: Exact confirmation items to verify with bdapps before live switch-on include: production gateway base URL (`developer.bdapps.com` vs. `api.applink.com.bd`), whether `/otp/request` + `/otp/verify` vs. `/subscription/otp/*` triggers auto-subscription on `APP_140847`, exact `charging_notification` / `consent_notification` signature headers or IP allowlists, and final `ASSIGNED_FOLDER` URL.

- **Verification Plan**:
  - Validate PHP 8+ syntax (`php -l`) if the PHP CLI runtime is available in the workspace container (or accurately report if PHP CLI is absent so syntax verification is run on cPanel/local PHP 8+).
  - Add automated Vitest unit tests covering Node-to-PHP HMAC signature generation/verification, gateway error/network failure handling, CaaS `pending`/`confirmed`/`failed` state transitions, duplicate callback idempotency, atomic ledger logic, and Preview Mode isolation.
  - Run `npm test`, `compile_applet`, and `lint_applet` to confirm zero regressions across the application.
