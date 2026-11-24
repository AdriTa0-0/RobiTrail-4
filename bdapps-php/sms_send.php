
<?php


require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

GatewayAuth::requirePost();

$config = ConfigLoader::load();
$rawBody = ResponseHelper::readRawBody();

GatewayAuth::verifyNodeGatewayRequest($config, $rawBody);

$body = ResponseHelper::decodeJsonBody($rawBody);

// Validate recipient number
$msisdn = ResponseHelper::normalizeMsisdn(
    $body['phoneNumber'] ?? ($body['msisdn'] ?? null)
);

if ($msisdn === null) {
    ResponseHelper::sendError(
        400,
        'INVALID_MSISDN',
        'Invalid Bangladesh mobile number.'
    );
}

// Validate SMS message
$message = $body['message'] ?? null;

if (!is_string($message) || trim($message) === '') {
    ResponseHelper::sendError(
        400,
        'INVALID_MESSAGE',
        'SMS message is required.'
    );
}

$message = trim($message);

if ((function_exists('mb_strlen') ? mb_strlen($message, 'UTF-8') : strlen($message)) > 500) {
    ResponseHelper::sendError(
        400,
        'MESSAGE_TOO_LONG',
        'SMS message exceeds the allowed length.'
    );
}

// Send SMS using bdapps client
$client = new BdappsClient($config);

$result = $client->sendSms([$msisdn], $message);

$httpStatus = !empty($result['ok'])
    ? 200
    : (!empty($result['blocked']) ? 503 : 400);

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
    'providerAccepted' => (bool) ($result['ok'] ?? false),
    'deliveredLive' => false, // Actual handset delivery needs separate delivery report.
]);
