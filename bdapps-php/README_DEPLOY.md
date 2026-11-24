# RobiTrail PHP Gateway — Final source

Deploy the PHP files from `RobiTrail_cPanel_FINAL.zip` **into** your existing
`public_html/auw26/RobiTrail/` folder. Never upload a second nested `RobiTrail/` folder.
See `RobiTrail_FINAL_DEPLOY_GUIDE_BN.md` in the combined release for full instructions.

Credential file `robitrail_bdapps_config.php` is intentionally NOT packaged.
`includes/ConfigLoader.php` attempts to migrate the pre-existing file out of the
webroot. If you are deploying on a fresh server, create the private config manually.

Non-subscription SMS OTP uses `/sms/send` and Cloudflare Firestore verification.
Carrier `/otp/request` and `/otp/verify` are intentionally blocked for free login.
CAAS billing and paid subscriptions remain hard-locked until formal provider verification.
