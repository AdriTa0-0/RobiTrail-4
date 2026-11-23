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

$rawTargets = $body['destinationAddresses'] ?? $body['phoneNumbers'] ?? ($body['phoneNumber'] ?? ($body['msisdn'] ?? null));
$targetList = is_array($rawTargets) ? $rawTargets : [$rawTargets];

$normalizedTargets = [];
foreach ($targetList as $item) {
    $norm = ResponseHelper::normalizeMsisdn($item);
    if ($norm === null) {
        ResponseHelper::sendError(400, 'INVALID_MSISDN', 'One or more destination mobile numbers are invalid.');
    }
    $normalizedTargets[] = $norm;
}

if (count($normalizedTargets) === 0 || count($normalizedTargets) > 20) {
    ResponseHelper::sendError(400, 'INVALID_RECIPIENT_COUNT', 'Provide between 1 and 20 valid recipients.');
}

$message = isset($body['message']) && is_string($body['message']) ? trim($body['message']) : '';
if ($message === '' || strlen($message) > 480) {
    ResponseHelper::sendError(400, 'INVALID_MESSAGE', 'SMS message must be between 1 and 480 characters.');
}

$client = new BdappsClient($config);
$result = $client->sendSms($normalizedTargets, $message);

$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 502);
ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'maskedRecipients' => array_map([ResponseHelper::class, 'maskMsisdn'], $normalizedTargets),
    'deliveredLive' => !empty($result['ok']),
]);
