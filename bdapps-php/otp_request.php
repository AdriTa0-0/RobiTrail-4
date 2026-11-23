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

// Strict OTP & Subscription Separation Guard:
// Never allow registration OTP requests to carry a paid subscription activation flag.
$intent = isset($body['intent']) && is_string($body['intent']) ? trim($body['intent']) : 'register';
if ($intent === 'subscribe') {
    ResponseHelper::sendError(
        403,
        'OTP_SUBSCRIPTION_SEPARATED',
        'Registration OTP cannot activate paid subscriptions. Use explicit consent flows if subscriptions are enabled.'
    );
}

$client = new BdappsClient($config);
if ($client->isProductionReady() && empty($config['otp_auto_subscribe_verified_safe'])) {
    ResponseHelper::sendError(
        503,
        'OTP_AUTO_SUBSCRIBE_CONFIRMATION_REQUIRED',
        'Live bdapps OTP is locked until bdapps confirms standalone registration OTP does not auto-subscribe the user.'
    );
}

$meta = is_array($body['applicationMetaData'] ?? null) ? $body['applicationMetaData'] : [];
$result = $client->requestOtp($msisdn, $referenceNo, $meta);

$httpStatus = !empty($result['ok']) ? 200 : (!empty($result['blocked']) ? 503 : 400);
$providerData = is_array($result['data'] ?? null) ? $result['data'] : [];

ResponseHelper::sendJson($httpStatus, [
    'ok' => (bool) ($result['ok'] ?? false),
    'statusCode' => (string) ($result['statusCode'] ?? 'UNKNOWN'),
    'statusDetail' => (string) ($result['statusDetail'] ?? ''),
    'referenceNo' => (string) ($providerData['referenceNo'] ?? $referenceNo),
    'maskedNumber' => ResponseHelper::maskMsisdn($msisdn),
    'expiresInSeconds' => 300,
    'subscriptionActivated' => false,
]);
