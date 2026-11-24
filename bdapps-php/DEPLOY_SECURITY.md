# Gateway security notes

- Do not expose or commit the real `robitrail_bdapps_config.php`.
- The .htaccess denies access to includes/ and legacy secrets; cPanel Apache must honor .htaccess.
- Private config migrates to /home/<account>/private/robitrail_bdapps_config.php when possible.
- Provider callbacks fail closed unless bdapps-authenticated callback password or confirmed HMAC is available.
- Live CAAS and subscription flags remain hard-disabled in this release.
- Keep the existing Cloudflare SESSION_SIGNING_KEY and PHP_GATEWAY_SHARED_SECRET secrets unchanged.
- Rotate the earlier shared bdapps credentials after deployment through the official portal.
