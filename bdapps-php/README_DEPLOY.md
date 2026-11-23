# RobiTrail PHP-Based bdapps API Gateway — Deployment & Operations Guide

**Application:** RobiTrail (`APP_140847`)  
**Team:** Team Torongo  
**Target Hosting URL Template:** `https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/` *(replace `ASSIGNED_FOLDER` once assigned by organizers)*

> **Safety Notice:** This PHP gateway keeps `live_charging_enabled = false` and `subscription_enabled = false` by default. Adding files or credentials will **not** enable real carrier charging or paid subscriptions until both organizer/bdapps approval and Firestore persistence readiness are explicitly enabled.

---

## 1. Architecture Flow

```text
React Frontend (No Secrets)
  → Node.js Backend (/api/bdapps/*, /api/tokens/*)
    → PHP 8+ Gateway (HMAC-SHA256 Signed Requests)
      → bdapps Carrier Platform (APP_140847)

bdapps Carrier Webhooks
  → charging_notification.php / subscription_notification.php / consent_notification.php
    → Signed Internal Callback (/api/internal/bdapps/callback on Node.js)
      → Atomic Firestore Transaction (pending → confirmed / failed)
```

---

## 2. cPanel File Manager Upload Instructions

1. **Log in to cPanel → File Manager.**
2. **Create the private secrets folder ABOVE `public_html`:**
   - Navigate to your home root (`/home/<CPANEL_USER>/`, one level *above* `public_html`).
   - Create folder: `private` (if not already present).
   - Upload `config.example.php` into `/home/<CPANEL_USER>/private/` and rename it to:
     `robitrail_bdapps_config.php`
   - Right-click `robitrail_bdapps_config.php` → **Change Permissions** → set to **`0600`** (`rw-------`).
3. **Upload the public PHP gateway endpoints into your assigned folder:**
   - Navigate to `public_html/auw26/<ASSIGNED_FOLDER>/` (created by organizers once assigned).
   - Upload all files from `bdapps-php/` **except** `config.example.php` (never store live credentials inside `public_html`).
   - Verify permissions:
     - Folders (`includes/`): **`0755`**
     - PHP files and `.htaccess`: **`0644`**
4. **Edit `/home/<CPANEL_USER>/private/robitrail_bdapps_config.php`:**
   - Fill `bdapps_app_id` (`APP_140847`), `bdapps_api_secret`, `bdapps_base_url`, `php_gateway_shared_secret`, `node_internal_callback_url`, `node_callback_shared_secret`, `bdapps_callback_password`, and any `bdapps_allowed_callback_ips`.
   - Keep `live_charging_enabled => false` and `subscription_enabled => false` until bdapps confirms live approval.

---

## 3. Callback URLs to Register with bdapps (Once `ASSIGNED_FOLDER` Is Provided)

Replace `ASSIGNED_FOLDER` with your organizer-assigned directory name:

- **Charging Notification URL:** `https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/charging_notification.php`
- **Subscription Notification URL:** `https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/subscription_notification.php`
- **Consent Notification URL:** `https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/consent_notification.php`

*(Do not submit placeholder URLs to bdapps until `ASSIGNED_FOLDER` is confirmed.)*

---

## 4. Provider Details Still Requiring bdapps Confirmation

Before setting `bdapps_mode = 'production'` or `live_charging_enabled = true`:

1. **Assigned Hosting Folder:** Confirm exact `ASSIGNED_FOLDER` under `https://bdappsdigitalapps.com/auw26/`.
2. **Approved Carrier Base URL:** Confirm whether `APP_140847` uses `https://developer.bdapps.com` or `https://api.applink.com.bd` (or a dedicated gateway domain).
3. **Registration OTP vs. Auto-Subscription:** Confirm whether `/otp/request` + `/otp/verify` vs `/subscription/otp/request` + `/subscription/otp/verify` triggers recurring subscription activation on `APP_140847`. Keep `otp_auto_subscribe_verified_safe => false` until confirmed that phone verification does **not** trigger paid subscriptions.
4. **Exact OTP & CaaS Field Names:** Confirm `referenceNo` vs `subscriberId` on `/otp/verify`, and exact casing of `currency` vs `Currency` and `MobileAccount` vs `Mobile Account` on `/caas/direct/debit`.
5. **Synchronous vs. Asynchronous CaaS Settlement:** Confirm whether `/caas/direct/debit` returns `S1000` only after deduction OR dispatches final status asynchronously via `charging_notification.php`.
6. **Provider Webhook Authentication:** Confirm whether bdapps webhooks send `password` in JSON, an HMAC header (`X-Bdapps-Signature`), and/or originate from static IP addresses to populate `bdapps_allowed_callback_ips`.

---

## 5. Endpoint Mapping & Testing Commands

### Node.js ↔ PHP Mapping
- `GET  /api/health` → `GET /health.php`
- `POST /api/bdapps/otp/request` → `POST /otp_request.php`
- `POST /api/bdapps/otp/verify` → `POST /otp_verify.php`
- `POST /api/tokens/shop/purchase` → `POST /caas_charge.php`
- `POST /api/bdapps/eligibility` & `GET /api/bdapps/status` → `POST /subscription_status.php`
- `POST /api/bdapps/subscribe` → `POST /subscription_subscribe.php` *(disabled by default)*
- `POST /api/bdapps/unsubscribe` → `POST /subscription_unsubscribe.php`
- `POST /sms_send.php` ← invoked by `dispatchBdappsSmsNotification`
- `POST /charging_notification.php`, `/subscription_notification.php`, `/consent_notification.php` → signed internal callback `POST /api/internal/bdapps/callback`

### Pre-Deployment PHP Syntax Check (Run on cPanel Terminal or Local PHP 8+)
```bash
find bdapps-php -name '*.php' -print0 | xargs -0 -n1 php -l
```

### Health Check (Safe Public Output — Zero Secrets)
```bash
curl -i https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/health.php
```

### Direct-Access Security Check (Must Return HTTP 403)
```bash
curl -i https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/includes/BdappsClient.php
curl -i https://bdappsdigitalapps.com/auw26/ASSIGNED_FOLDER/config.example.php
```

### Signed HMAC Test Against `/caas_charge.php` (Expected: 503 `LIVE_CHARGING_DISABLED` While Locked)
```bash
SECRET="your_php_gateway_shared_secret"
TS=$(date +%s)
URI="/auw26/ASSIGNED_FOLDER/caas_charge.php"
BODY='{"phoneNumber":"01811000001","packageId":"pkg-6","externalTrxId":"TRXTEST123456","userConfirmed":true}'
SIG=$(printf "%s.POST.%s.%s" "$TS" "$URI" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')
curl -i -X POST "https://bdappsdigitalapps.com${URI}" \
  -H "Content-Type: application/json" \
  -H "X-RobiTrail-Timestamp: ${TS}" \
  -H "X-RobiTrail-Signature: ${SIG}" \
  -d "$BODY"
```
