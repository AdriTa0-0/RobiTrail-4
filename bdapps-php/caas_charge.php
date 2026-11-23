<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

GatewayAuth::requirePost();
$config = ConfigLoader::load();
$rawBody = ResponseHelper::readRawBody();
GatewayAuth::verifyNodeGatewayRequest($config, $rawBody);
$body = ResponseHelper::decodeJsonBody($rawBody);

// 1. Explicit user confirmation & zero recurring billing guard
if (($body['userConfirmed'] ?? false) !== true) {
    ResponseHelper::sendError(400, 'USER_CONFIRMATION_REQUIRED', 'Explicit user confirmation is required before charging.');
}

if (!empty($body['recurring']) || isset($body['billingFrequency'])) {
    ResponseHelper::sendError(400, 'RECURRING_NOT_ALLOWED', 'Token Center purchases are one-time only; recurring billing is prohibited.');
}

// 2. Validate subscriber & unique transaction ID
$msisdn = ResponseHelper::normalizeMsisdn($body['phoneNumber'] ?? ($body['msisdn'] ?? null));
if ($msisdn === null) {
    ResponseHelper::sendError(400, 'INVALID_MSISDN', 'Invalid Bangladesh mobile number format.');
}

$packageId = isset($body['packageId']) && is_string($body['packageId']) ? trim($body['packageId']) : '';
$packages = is_array($config['token_packages'] ?? null) ? $config['token_packages'] : [];
if ($packageId === '' || !isset($packages[$packageId])) {
    ResponseHelper::sendError(400, 'UNKNOWN_PACKAGE', 'Selected token package is not in the authorized price catalog.');
}

$pkg = $packages[$packageId];
$expectedPriceBdt = (float) ($pkg['priceBdt'] ?? 0);
$expectedTokens = (int) ($pkg['tokens'] ?? 0);

// Reject caller attempts to override price or token count
if (isset($body['priceBdt']) && (float) $body['priceBdt'] !== $expectedPriceBdt) {
    ResponseHelper::sendError(400, 'PRICE_MISMATCH', 'Requested charge amount does not match configured package price.');
}

$externalTrxId = isset($body['externalTrxId']) && is_string($body['externalTrxId'])
    ? trim($body['externalTrxId'])
    : '';
if ($externalTrxId === '' || preg_match('/^[A-Za-z0-9:_-]{8,100}$/', $externalTrxId) !== 1) {
    ResponseHelper::sendError(400, 'INVALID_TRANSACTION_ID', 'A valid unique externalTrxId is required.');
}

// 3. Enforce Live Charging Gate (remains disabled until bdapps approval)
$client = new BdappsClient($config);
if (!$client->isLiveChargingEnabled()) {
    ResponseHelper::sendJson(503, [
        'ok' => false,
        'blocked' => true,
        'txState' => 'failed',
        'statusCode' => 'LIVE_CHARGING_DISABLED',
        'externalTrxId' => $externalTrxId,
        'packageId' => $packageId,
        'tokens' => $expectedTokens,
        'priceBdt' => $expectedPriceBdt,
        'error' => 'Live CaaS billing is disabled until bdapps approval and verified persistence setup.',
    ]);
}

$result = $client->chargeCaasDirectDebit($msisdn, $externalTrxId, $expectedPriceBdt, 'BDT');
$txState = (string) ($result['txState'] ?? 'failed');
$httpStatus = $txState === 'failed' ? 402 : 200;

ResponseHelper::sendJson($httpStatus, [
    'ok' => $txState !== 'failed',
    'txState' => $txState,
    'externalTrxId' => (string) ($result['externalTrxId'] ?? $externalTrxId),
    'packageId' => $packageId,
    'tokens' => $expectedTokens,
    'priceBdt' => $expectedPriceBdt,
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
]);
