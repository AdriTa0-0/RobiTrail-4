<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/ConfigLoader.php';
require_once __DIR__ . '/includes/ResponseHelper.php';
require_once __DIR__ . '/includes/GatewayAuth.php';
require_once __DIR__ . '/includes/BdappsClient.php';

// Safety block: the documented OTP verify operation activates subscription.
GatewayAuth::requirePost();
ResponseHelper::sendError(403, 'SUBSCRIPTION_OTP_NOT_FREE_LOGIN',
    'This bdapps OTP endpoint cannot be used for free RobiTrail login. Use the Firestore-verified SMS OTP flow.');
