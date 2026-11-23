<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

GatewayAuth::requirePost();
$config = ConfigLoader::load();
$rawBody = ResponseHelper::readRawBody();
$payload = ResponseHelper::decodeJsonBody($rawBody);

$verification = GatewayAuth::verifyBdappsNotificationRequest($config, $payload, $rawBody);
if (empty($verification['verified'])) {
    ResponseHelper::sendJson(403, [
        'statusCode' => 'E2001',
        'statusDetail' => 'Provider notification verification failed: ' . ($verification['reason'] ?? 'unauthorized'),
    ]);
}

$msisdn = ResponseHelper::normalizeMsisdn($payload['subscriberId'] ?? ($payload['msisdn'] ?? null));
if ($msisdn === null) {
    ResponseHelper::sendJson(400, [
        'statusCode' => 'E4000',
        'statusDetail' => 'Missing or invalid subscriberId.',
    ]);
}

$rawStatus = strtoupper(trim((string) ($payload['status'] ?? ''), ". \t\n\r"));
$frequency = (string) ($payload['frequency'] ?? '');

$client = new BdappsClient($config);
$forwarded = $client->forwardNotificationToNode('subscription_notification', [
    'msisdn' => $msisdn,
    'status' => $rawStatus,
    'frequency' => $frequency,
    'version' => (string) ($payload['version'] ?? '1.0'),
    'timeStamp' => (string) ($payload['timeStamp'] ?? ''),
    'subscriptionEnabledOnGateway' => $client->isSubscriptionEnabled(),
    'verificationMethod' => (string) ($verification['method'] ?? 'unknown'),
]);

if (empty($forwarded['ok'])) {
    ResponseHelper::sendJson(502, [
        'statusCode' => 'E5000',
        'statusDetail' => 'Temporary downstream callback persistence failure; please retry.',
    ]);
}

ResponseHelper::sendJson(200, [
    'statusCode' => 'S1000',
    'statusDetail' => 'Request was successfully processed',
]);
