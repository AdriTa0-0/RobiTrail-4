<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

// The official OTP pair activates a carrier subscription. Free login uses /sms/send instead.
GatewayAuth::requirePost();
ResponseHelper::sendError(403, 'SUBSCRIPTION_OTP_NOT_FREE_LOGIN',
    'This bdapps OTP endpoint is restricted because successful verification activates a paid subscription. Use RobiTrail SMS login instead.');
