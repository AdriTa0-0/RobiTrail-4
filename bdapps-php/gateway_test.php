<?php

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';

GatewayAuth::requirePost();

$config = ConfigLoader::load();
$rawBody = ResponseHelper::readRawBody();

GatewayAuth::verifyNodeGatewayRequest($config, $rawBody);

ResponseHelper::sendJson(200, [
    'ok' => true,
    'message' => 'Cloudflare to PHP authentication successful',
    'service' => 'robitrail-php-gateway'
]);
