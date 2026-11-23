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
$requestId = isset($payload['requestId']) && is_string($payload['requestId'])
    ? trim($payload['requestId'])
    : (isset($payload['referenceNo']) && is_string($payload['referenceNo']) ? trim($payload['referenceNo']) : '');

$client = new BdappsClient($config);
$forwarded = $client->forwardNotificationToNode('consent_notification', [
    'msisdn' => $msisdn,
    'requestId' => $requestId,
    'consentStatus' => strtoupper((string) ($payload['consentStatus'] ?? ($payload['status'] ?? 'UNKNOWN'))),
    'statusCode' => (string) ($payload['statusCode'] ?? ''),
    'statusDetail' => (string) ($payload['statusDetail'] ?? ''),
    'timeStamp' => (string) ($payload['timeStamp'] ?? ''),
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
