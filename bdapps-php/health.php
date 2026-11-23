<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';

$config = ConfigLoader::load();

ResponseHelper::sendJson(200, [
    'ok' => true,
    'service' => 'robitrail-bdapps-php-gateway',
    'appId' => (string) ($config['bdapps_app_id'] ?? 'APP_140847'),
    'mode' => (string) ($config['bdapps_mode'] ?? 'preview'),
    'phpVersion' => PHP_VERSION,
    'curlEnabled' => function_exists('curl_init'),
    'privateConfigLoaded' => ($config['_meta']['configSource'] ?? '') === 'private_file',
    'credentialsConfigured' => (bool) ($config['_meta']['hasRealAppSecret'] ?? false),
    'gatewayAuthConfigured' => (bool) ($config['_meta']['hasSharedSecret'] ?? false),
    'liveChargingEnabled' => !empty($config['live_charging_enabled']),
    'subscriptionEnabled' => !empty($config['subscription_enabled']),
    'timestampUtc' => gmdate('c'),
]);
