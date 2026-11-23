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

$referenceNo = isset($body['referenceNo']) && is_string($body['referenceNo']) ? trim($body['referenceNo']) : '';
if ($referenceNo === '' || preg_match('/^[A-Za-z0-9_-]{6,64}$/', $referenceNo) !== 1) {
    ResponseHelper::sendError(400, 'INVALID_REFERENCE_NO', 'A valid referenceNo is required.');
}

$otp = isset($body['otp']) && is_string($body['otp']) ? trim($body['otp']) : '';
if (preg_match('/^\d{4,8}$/', $otp) !== 1) {
    ResponseHelper::sendError(400, 'INVALID_OTP', 'OTP must be a 4-8 digit numeric code.');
}

$client = new BdappsClient($config);
if ($client->isProductionReady() && empty($config['otp_auto_subscribe_verified_safe'])) {
    ResponseHelper::sendError(
        503,
        'OTP_AUTO_SUBSCRIBE_CONFIRMATION_REQUIRED',
        'Live bdapps OTP verification is locked until bdapps confirms OTP verification does not auto-subscribe.'
    );
}

$result = $client->verifyOtp($msisdn, $referenceNo, $otp);
$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 400);

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'verified' => !empty($result['ok']),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'referenceNo' => $referenceNo,
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
    'subscriptionActivated' => false,
]);
