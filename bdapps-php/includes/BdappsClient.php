<?php

declare(strict_types=1);

final class BdappsClient
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function isProductionReady(): bool
    {
        return ($this->config['bdapps_mode'] ?? 'preview') === 'production'
            && ConfigLoader::isConfiguredSecret($this->config['bdapps_app_id'] ?? '')
            && ConfigLoader::isConfiguredSecret($this->config['bdapps_api_secret'] ?? '');
    }

    public function isLiveChargingEnabled(): bool
    {
        return $this->isProductionReady()
            && !empty($this->config['live_charging_enabled']);
    }

    public function isSubscriptionEnabled(): bool
    {
        return $this->isProductionReady()
            && !empty($this->config['subscription_enabled']);
    }

    public function sendSms(array $msisdnDigitsList, string $message): array
    {
        if (!$this->isProductionReady()) {
            return [
                'ok' => false,
                'blocked' => true,
                'mode' => 'preview',
                'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Gateway is in preview mode or bdapps API secret is unconfigured.',
            ];
        }

        $destinations = array_map(
            static fn (string $m): string => ResponseHelper::toTelUri($m),
            $msisdnDigitsList
        );

        $path = (string) ($this->config['paths']['sms_send'] ?? '/sms/send');
        return $this->postBdappsJson($path, [
            'version' => '1.0',
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'destinationAddresses' => $destinations,
            'message' => $message,
        ]);
    }

    public function requestOtp(string $msisdnDigits, string $referenceNo, array $meta = []): array
    {
        if (!$this->isProductionReady()) {
            return [
                'ok' => false,
                'blocked' => true,
                'mode' => 'preview',
                'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Live bdapps OTP is disabled while in preview mode or missing credentials.',
            ];
        }

        $path = (string) ($this->config['paths']['otp_request'] ?? '/otp/request');
        $payload = [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'subscriberId' => ResponseHelper::toTelUri($msisdnDigits),
            // applicationHash is optional in the official spec; do not confuse it with provider referenceNo.
            // The provider returns referenceNo after requesting an OTP.
        ];
        if (!empty($meta)) {
            $payload['applicationMetaData'] = $meta;
        }

// The documented OTP verify flow activates a subscription; free login is blocked in the gateway.
        return $this->postBdappsJson($path, $payload);
    }

    public function verifyOtp(string $msisdnDigits, string $referenceNo, string $otp): array
    {
        if (!$this->isProductionReady()) {
            return [
                'ok' => false,
                'blocked' => true,
                'mode' => 'preview',
                'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Live bdapps OTP verify is disabled while in preview mode or missing credentials.',
            ];
        }

        $path = (string) ($this->config['paths']['otp_verify'] ?? '/otp/verify');
        $payload = [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'referenceNo' => $referenceNo,
            'otp' => $otp,
        ];

        return $this->postBdappsJson($path, $payload);
    }

    /**
     * CaaS Direct Debit request.
     * NEVER credits tokens directly; returns provider status (`pending` / `confirmed` / `failed`)
     * or blocks safely when `live_charging_enabled` is false.
     */
    /** Official TAP /caas/get/balance (read-only; does not debit a subscriber). */
    public function queryCaasBalance(string $msisdnDigits): array
    {
        if (!$this->isProductionReady()) {
            return ['ok' => false, 'blocked' => true, 'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Provider balance query requires configured production access.'];
        }
        $path = (string) ($this->config['paths']['caas_query_balance'] ?? '/caas/get/balance');
        return $this->postBdappsJson($path, [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'subscriberId' => ResponseHelper::toTelUri($msisdnDigits),
            'paymentInstrumentName' => 'MobileAccount',
            'currency' => 'BDT',
        ]);
    }

    public function chargeCaasDirectDebit(
        string $msisdnDigits,
        string $externalTrxId,
        float $amountBdt,
        string $currency = 'BDT'
    ): array {
        if (!$this->isLiveChargingEnabled()) {
            return [
                'ok' => false,
                'blocked' => true,
                'txState' => 'failed',
                'statusCode' => 'LIVE_CHARGING_DISABLED',
                'externalTrxId' => $externalTrxId,
                'statusDetail' => 'Live bdapps CaaS billing is disabled pending bdapps approval.',
            ];
        }

        $path = (string) ($this->config['paths']['caas_direct_debit'] ?? '/caas/direct/debit');
// Swagger specifies lowercase currency and paymentInstrumentName=MobileAccount.
        $res = $this->postBdappsJson($path, [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'externalTrxId' => $externalTrxId,
            'subscriberId' => ResponseHelper::toTelUri($msisdnDigits),
            'paymentInstrumentName' => 'MobileAccount',
            'amount' => number_format($amountBdt, 2, '.', ''),
            'currency' => $currency,
        ]);

        if (!$res['ok']) {
            return array_merge($res, [
                'txState' => 'failed',
                'externalTrxId' => $externalTrxId,
            ]);
        }

        // IMPORTANT SAFETY RULE:
        // Never treat a bare transport acceptance as settled token credit unless explicit confirmation
        // statusCode/settlement is returned AND confirmed against the charging notification flow.
        $data = $res['data'] ?? [];
        $statusCode = (string) ($data['statusCode'] ?? '');
        $shortCircuitSettled = ($statusCode === 'S1000' && (($data['settlementState'] ?? '') === 'CONFIRMED'));

        return array_merge($res, [
            'txState' => $shortCircuitSettled ? 'confirmed' : 'pending',
            'externalTrxId' => (string) ($data['externalTrxId'] ?? $externalTrxId),
        ]);
    }

    public function getSubscriptionStatus(string $msisdnDigits): array
    {
        if (!$this->isProductionReady()) {
            return [
                'ok' => false,
                'blocked' => true,
                'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Subscription status lookup requires production bdapps configuration.',
            ];
        }

        $path = (string) ($this->config['paths']['subscription_status'] ?? '/subscription/getStatus');
        return $this->postBdappsJson($path, [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'subscriberId' => ResponseHelper::toTelUri($msisdnDigits),
        ]);
    }

    public function sendSubscriptionAction(string $msisdnDigits, string $action): array
    {
        if ($action === '1' && !$this->isSubscriptionEnabled()) {
            return [
                'ok' => false,
                'blocked' => true,
                'statusCode' => 'SUBSCRIPTION_DISABLED',
                'statusDetail' => 'Paid subscription activation is disabled. Subscription endpoints are preparation-only.',
            ];
        }

        if (!$this->isProductionReady()) {
            return [
                'ok' => false,
                'blocked' => true,
                'statusCode' => 'PREVIEW_MODE',
                'statusDetail' => 'Subscription action requires production bdapps configuration.',
            ];
        }

        $path = (string) ($this->config['paths']['subscription_send'] ?? '/subscription/send');
        return $this->postBdappsJson($path, [
            'applicationId' => $this->config['bdapps_app_id'],
            'password' => $this->config['bdapps_api_secret'],
            'subscriberId' => ResponseHelper::toTelUri($msisdnDigits),
            'action' => $action,
        ]);
    }

    /**
     * Forwards verified provider webhook events to Node.js backend via HMAC-SHA256 signed POST.
     */
    public function forwardNotificationToNode(string $eventType, array $normalizedPayload): array
    {
        $callbackUrl = (string) ($this->config['node_internal_callback_url'] ?? '');
        $secret = (string) ($this->config['node_callback_shared_secret'] ?? '');

        if (!ConfigLoader::isConfiguredSecret($secret)) {
            $secret = (string) ($this->config['php_gateway_shared_secret'] ?? '');
        }

        if ($callbackUrl === '' || str_contains($callbackUrl, 'example.com') || !ConfigLoader::isConfiguredSecret($secret)) {
            return [
                'ok' => false,
                'statusCode' => 'NODE_CALLBACK_NOT_CONFIGURED',
                'error' => 'Node internal callback URL or shared secret is not configured.',
            ];
        }

        $parsed = parse_url($callbackUrl);
        $requestPath = is_array($parsed) && isset($parsed['path']) ? $parsed['path'] : '/api/internal/bdapps/callback';

        $bodyArray = [
            'event' => $eventType,
            'receivedAt' => gmdate('c'),
            'payload' => $normalizedPayload,
        ];
        $rawBody = json_encode($bodyArray, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($rawBody)) {
            return ['ok' => false, 'statusCode' => 'ENCODE_ERROR', 'error' => 'Failed to encode callback body.'];
        }

        $headers = GatewayAuth::buildCallbackHeaders($secret, 'POST', $requestPath, $rawBody);
        return $this->executeCurlPost($callbackUrl, $rawBody, $headers);
    }

    private function postBdappsJson(string $path, array $payload): array
    {
        $baseUrl = rtrim((string) ($this->config['bdapps_base_url'] ?? 'https://developer.bdapps.com'), '/');
        $url = $baseUrl . '/' . ltrim($path, '/');

        $rawBody = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($rawBody)) {
            return [
                'ok' => false,
                'statusCode' => 'ENCODE_ERROR',
                'statusDetail' => 'Unable to JSON-encode bdapps request payload.',
            ];
        }

        $headers = [
            'Content-Type: application/json;charset=utf-8',
            'Accept: application/json',
        ];

        $result = $this->executeCurlPost($url, $rawBody, $headers);
        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'] ?? [];
        $statusCode = (string) ($data['statusCode'] ?? '');
        $success = $result['httpStatus'] >= 200 && $result['httpStatus'] < 300 && $statusCode === 'S1000';

        return [
            'ok' => $success,
            'httpStatus' => $result['httpStatus'],
            'statusCode' => $statusCode !== '' ? $statusCode : 'UNKNOWN',
            'statusDetail' => (string) ($data['statusDetail'] ?? ($success ? 'OK' : 'Provider declined request.')),
            'data' => $data,
        ];
    }

    private function executeCurlPost(string $url, string $rawBody, array $headers): array
    {
        if (!function_exists('curl_init')) {
            return [
                'ok' => false,
                'httpStatus' => 500,
                'statusCode' => 'CURL_UNAVAILABLE',
                'statusDetail' => 'PHP cURL extension is not enabled on this host.',
            ];
        }

        $ch = curl_init($url);
        if ($ch === false) {
            return [
                'ok' => false,
                'httpStatus' => 500,
                'statusCode' => 'CURL_INIT_FAILED',
                'statusDetail' => 'Failed to initialize cURL request.',
            ];
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $rawBody,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $responseBody = curl_exec($ch);
        $curlErr = curl_error($ch);
        $httpStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($responseBody === false || !is_string($responseBody)) {
            return [
                'ok' => false,
                'httpStatus' => $httpStatus > 0 ? $httpStatus : 502,
                'statusCode' => 'UPSTREAM_TRANSPORT_ERROR',
                'statusDetail' => $curlErr !== '' ? $curlErr : 'Network error communicating with upstream endpoint.',
            ];
        }

        $decoded = json_decode($responseBody, true);
        if (!is_array($decoded)) {
            $decoded = ['raw' => substr($responseBody, 0, 500)];
        }

        return [
            'ok' => $httpStatus >= 200 && $httpStatus < 300,
            'httpStatus' => $httpStatus,
            'statusCode' => (string) ($decoded['statusCode'] ?? ($httpStatus >= 200 && $httpStatus < 300 ? 'OK' : 'HTTP_' . $httpStatus)),
            'statusDetail' => (string) ($decoded['statusDetail'] ?? ''),
            'data' => $decoded,
        ];
    }
}
