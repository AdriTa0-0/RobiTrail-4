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

$msisdn = ResponseHelper::normalizeMsisdn($body['phoneNumber'] ?? ($body['msisdn'] ?? null));
if ($msisdn === null) {
    ResponseHelper::sendError(400, 'INVALID_MSISDN', 'Invalid Bangladesh mobile number format.');
}

$client = new BdappsClient($config);
$result = $client->getSubscriptionStatus($msisdn);
$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 502);
$providerData = is_array($result['data'] ?? null) ? $result['data'] : [];

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'subscriptionStatus' => (string) ($providerData['subscriptionStatus'] ?? ($providerData['status'] ?? 'UNKNOWN')),
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
]);
