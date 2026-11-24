<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

/**
 * Integration Preparation Only:
 * Paid subscriptions remain disabled unless SUBSCRIPTION_ENABLED is explicitly activated
 * under an approved bdapps product plan. Do NOT auto-activate Trail Pass or daily renewals.
 */

GatewayAuth::requirePost();
$config = ConfigLoader::load();
$rawBody = ResponseHelper::readRawBody();
GatewayAuth::verifyNodeGatewayRequest($config, $rawBody);
$body = ResponseHelper::decodeJsonBody($rawBody);

$msisdn = ResponseHelper::normalizeMsisdn($body['phoneNumber'] ?? ($body['msisdn'] ?? null));
if ($msisdn === null) {
    ResponseHelper::sendError(400, 'INVALID_MSISDN', 'Invalid Bangladesh mobile number format.');
}

if (($body['consentAccepted'] ?? false) !== true) {
    ResponseHelper::sendError(400, 'CONSENT_REQUIRED', 'Explicit user consent is required for subscription operations.');
}

$client = new BdappsClient($config);
$result = $client->sendSubscriptionAction($msisdn, '1');
$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 400);

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'blocked' => (bool) ($result['blocked'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'subscriptionStatus' => (string) (($result['data']['subscriptionStatus'] ?? 'UNKNOWN')),
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
]);
