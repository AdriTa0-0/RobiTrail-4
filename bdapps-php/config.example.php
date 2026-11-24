<?php

declare(strict_types=1);


return [
    // Application Identity (Robi / bdapps)
    'bdapps_app_id' => getenv('BDAPPS_APP_ID') ?: 'APP_140851',

    // Placeholder ONLY — populate inside your private server config outside public_html
    'bdapps_api_secret' => getenv('BDAPPS_API_SECRET') ?: 'REPLACE_WITH_BDAPPS_API_SECRET',

    // Provider Base URL:
    // TODO_CONFIRM_WITH_BDAPPS: Confirm exact approved REST base URL for APP_140851
    // (commonly https://developer.bdapps.com or https://api.applink.com.bd).
    'bdapps_base_url' => getenv('BDAPPS_BASE_URL') ?: 'https://developer.bdapps.com',
    'bdapps_shortcode' => getenv('BDAPPS_SHORTCODE') ?: '21213',

    // Runtime & Safety Locks
    // 'preview' | 'production'
    'bdapps_mode' => getenv('BDAPPS_MODE') ?: 'preview',

    // CRITICAL SAFETY GATE:
    // Even if BDAPPS_MODE=production and API credentials are set, caas_charge.php MUST refuse
    // real carrier debit calls unless live_charging_enabled is explicitly set to true after approval.
    'live_charging_enabled' => filter_var(
        getenv('BDAPPS_LIVE_CHARGING_ENABLED') ?: 'false',
        FILTER_VALIDATE_BOOLEAN
    ),

    // CRITICAL SUBSCRIPTION GATE:
    // Subscription handlers are preparation only. Do not enable without an approved product plan.
    'subscription_enabled' => filter_var(
        getenv('BDAPPS_SUBSCRIPTION_ENABLED') ?: 'false',
        FILTER_VALIDATE_BOOLEAN
    ),

    // TODO_CONFIRM_WITH_BDAPPS:
    // Confirm whether `/otp/request` + `/otp/verify` vs `/subscription/otp/request` + `/subscription/otp/verify`
    // triggers automatic recurring subscription activation on APP_140851.
    // Set to true ONLY after bdapps confirms standalone registration OTP does NOT auto-subscribe.
    'otp_auto_subscribe_verified_safe' => false,

    // Server-to-server HMAC-SHA256 secret shared ONLY between Node.js backend and this PHP gateway.
    // Generate with: openssl rand -hex 32
    'php_gateway_shared_secret' => getenv('PHP_GATEWAY_SHARED_SECRET') ?: 'REPLACE_WITH_NODE_TO_PHP_HMAC_SECRET',

    // Replay protection window in seconds for X-RobiTrail-Timestamp
    'hmac_max_skew_seconds' => 300,

    // Internal Node.js callback URL where PHP forwards verified bdapps notifications
    'node_internal_callback_url' => getenv('NODE_INTERNAL_CALLBACK_URL') ?: 'https://robitrail-4.ipsc100157.workers.dev/api/internal/bdapps/callback',
    'node_callback_shared_secret' => getenv('NODE_CALLBACK_SHARED_SECRET') ?: 'REPLACE_WITH_PHP_TO_NODE_CALLBACK_SECRET',

    // Provider Callback Verification (bdapps -> PHP notification endpoints)
    // TODO_CONFIRM_WITH_BDAPPS: Confirm exact notification password/signature mechanism and callback IPs.
    'bdapps_callback_password' => getenv('BDAPPS_CALLBACK_PASSWORD') ?: 'REPLACE_WITH_BDAPPS_CALLBACK_PASSWORD',
    'bdapps_callback_hmac_secret' => getenv('BDAPPS_CALLBACK_HMAC_SECRET') ?: '',
    'bdapps_allowed_callback_ips' => [
        // Add static bdapps notification server IPs here once confirmed by bdapps
    ],

    // Do NOT set true in production. Keeps unverified notifications blocked.
    'allow_unverified_notifications_in_preview' => false,

    // bdapps API endpoint paths relative to `bdapps_base_url`
    // TODO_CONFIRM_WITH_BDAPPS: Verify exact path variants approved for APP_140851.
    'paths' => [
        'sms_send' => '/sms/send',
        'otp_request' => '/otp/request',
        'otp_verify' => '/otp/verify',
        'caas_direct_debit' => '/caas/direct/debit',
        'caas_query_balance' => '/caas/get/balance',
        'subscription_status' => '/subscription/getStatus',
        'subscription_send' => '/subscription/send',
    ],

    // Proposed Token Center packages (server-authoritative lookup to prevent client price tampering)
    'token_packages' => [
        'pkg-6' => ['tokens' => 6, 'priceBdt' => 2],
        'pkg-10' => ['tokens' => 10, 'priceBdt' => 7],
        'pkg-15' => ['tokens' => 15, 'priceBdt' => 10],
        'pkg-20' => ['tokens' => 20, 'priceBdt' => 17],
        'pkg-25' => ['tokens' => 25, 'priceBdt' => 22],
        'pkg-31' => ['tokens' => 31, 'priceBdt' => 26],
    ],
];
