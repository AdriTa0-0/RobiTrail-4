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

// Separate third-party provider verification (never shares Node-to-PHP HMAC auth)
$verification = GatewayAuth::verifyBdappsNotificationRequest($config, $payload, $rawBody);
if (empty($verification['verified'])) {
    ResponseHelper::sendJson(403, [
        'statusCode' => 'E2001',
        'statusDetail' => 'Provider notification verification failed: ' . ($verification['reason'] ?? 'unauthorized'),
    ]);
}

$externalTrxId = isset($payload['externalTrxId']) && is_string($payload['externalTrxId'])
    ? trim($payload['externalTrxId'])
    : '';
$msisdn = ResponseHelper::normalizeMsisdn($payload['subscriberId'] ?? ($payload['msisdn'] ?? null));
$rawStatusCode = (string) ($payload['statusCode'] ?? '');
$rawStatus = strtoupper((string) ($payload['status'] ?? ''));

if ($externalTrxId === '' || $msisdn === null) {
    ResponseHelper::sendJson(400, [
        'statusCode' => 'E4000',
        'statusDetail' => 'Missing required externalTrxId or subscriberId.',
    ]);
}

$confirmed = ($rawStatusCode === 'S1000')
    || in_array($rawStatus, ['SUCCESS', 'CHARGED', 'CONFIRMED', 'COMPLETED'], true);

$client = new BdappsClient($config);
$forwarded = $client->forwardNotificationToNode('charging_notification', [
    'externalTrxId' => $externalTrxId,
    'msisdn' => $msisdn,
    'amount' => isset($payload['amount']) ? (string) $payload['amount'] : '0',
    'currency' => (string) ($payload['currency'] ?? ($payload['Currency'] ?? 'BDT')),
    'outcome' => $confirmed ? 'confirmed' : 'failed',
    'providerStatusCode' => $rawStatusCode !== '' ? $rawStatusCode : $rawStatus,
    'providerStatusDetail' => (string) ($payload['statusDetail'] ?? ''),
    'timeStamp' => (string) ($payload['timeStamp'] ?? ''),
    'verificationMethod' => (string) ($verification['method'] ?? 'unknown'),
]);

if (empty($forwarded['ok'])) {
    // Return 502 so bdapps retries transient settlement delivery instead of silently dropping confirmation
    ResponseHelper::sendJson(502, [
        'statusCode' => 'E5000',
        'statusDetail' => 'Temporary downstream callback persistence failure; please retry.',
    ]);
}

ResponseHelper::sendJson(200, [
    'statusCode' => 'S1000',
    'statusDetail' => 'Request was successfully processed',
]);
