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
$msisdn = ResponseHelper::normalizeMsisdn($body['msisdn'] ?? null);
if ($msisdn === null) ResponseHelper::sendError(400, 'INVALID_MSISDN', 'Invalid mobile number.');
$client = new BdappsClient($config);
$result = $client->queryCaasBalance($msisdn);
$data = is_array($result['data'] ?? null) ? $result['data'] : [];
ResponseHelper::sendJson(!empty($result['ok']) ? 200 : 503, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'accountType' => (string) ($data['accountType'] ?? ''),
    'accountStatus' => (string) ($data['accountStatus'] ?? ''),
    'chargeableBalance' => isset($data['chargeableBalance']) ? (string) $data['chargeableBalance'] : null,
    'currency' => 'BDT',
]);
