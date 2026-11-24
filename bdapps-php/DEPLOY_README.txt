RobiTrail PHP Gateway - complete release

Unzip the cPanel ZIP contents directly into public_html/auw26/RobiTrail/.
Do not upload secrets from previous ZIPs back to the public folder.
Old robitrail_bdapps_config.php is migrated into /home/<user>/private/ when permitted.
Web root: https://bdappsdigitalapps.com/auw26/RobiTrail/
Cloudflare callback: https://robitrail-4.ipsc100157.workers.dev/api/internal/bdapps/callback
GET health.php -> check privateConfigLoaded/credentialsConfigured/mode/curlEnabled.
POST sms_send.php -> requires matching HMAC headers from Cloudflare; not browser callable.
POST otp_request.php / otp_verify.php -> always blocked for free login; provider OTP starts subscription.
CAAS direct debit, paid subscription -> disabled until provider approval.
See combined package deployment guide.
