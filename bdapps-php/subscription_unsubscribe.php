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
$result = $client->sendSubscriptionAction($msisdn, '0');
$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 502);

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
]);
