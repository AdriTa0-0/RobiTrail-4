<?php

declare(strict_types=1);

final class GatewayAuth
{
    public static function requirePost(): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ($method !== 'POST') {
            ResponseHelper::sendError(405, 'METHOD_NOT_ALLOWED', 'Only POST requests are accepted.');
        }
    }

    public static function getHeader(string $name): string
    {
        $normalized = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $val = $_SERVER[$normalized] ?? '';
        if (is_string($val) && $val !== '') {
            return trim($val);
        }
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp((string) $k, $name) === 0 && is_string($v)) {
                        return trim($v);
                    }
                }
            }
        }
        return '';
    }

    /**
     * Authenticates server-to-server requests arriving from Node.js backend.
     * Signature formula:
     *   HMAC_SHA256("{timestamp}.{METHOD}.{request_path}.{raw_body}", PHP_GATEWAY_SHARED_SECRET)
     */
    public static function verifyNodeGatewayRequest(array $config, string $rawBody): void
    {
        $secret = $config['php_gateway_shared_secret'] ?? '';
        if (!ConfigLoader::isConfiguredSecret($secret)) {
            ResponseHelper::sendError(
                503,
                'GATEWAY_AUTH_NOT_CONFIGURED',
                'PHP gateway shared secret is not configured.'
            );
        }

        $timestamp = self::getHeader('X-RobiTrail-Timestamp');
        $signature = self::getHeader('X-RobiTrail-Signature');
        if ($timestamp === '' || $signature === '' || !ctype_digit($timestamp)) {
            ResponseHelper::sendError(
                401,
                'MISSING_GATEWAY_SIGNATURE',
                'Missing or malformed X-RobiTrail-Timestamp / X-RobiTrail-Signature headers.'
            );
        }

        $maxSkew = (int) ($config['hmac_max_skew_seconds'] ?? 300);
        $now = time();
        $tsInt = (int) $timestamp;
        if (abs($now - $tsInt) > $maxSkew) {
            ResponseHelper::sendError(
                401,
                'EXPIRED_GATEWAY_TIMESTAMP',
                'Request timestamp is outside the allowed replay window.'
            );
        }

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'POST');
        $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (!is_string($requestPath) || $requestPath === '') {
            $requestPath = $_SERVER['SCRIPT_NAME'] ?? '/';
        }

        $canonical = $timestamp . '.' . $method . '.' . $requestPath . '.' . $rawBody;
        $expected = hash_hmac('sha256', $canonical, (string) $secret);

        if (!hash_equals(strtolower($expected), strtolower($signature))) {
            ResponseHelper::sendError(
                401,
                'INVALID_GATEWAY_SIGNATURE',
                'Invalid HMAC-SHA256 gateway signature.'
            );
        }
    }

    /**
     * Signs outbound internal notification callbacks from PHP gateway back to Node.js backend.
     */
    public static function buildCallbackHeaders(
        string $secret,
        string $method,
        string $requestPath,
        string $rawBody
    ): array {
        $timestamp = (string) time();
        $canonical = $timestamp . '.' . strtoupper($method) . '.' . $requestPath . '.' . $rawBody;
        $signature = hash_hmac('sha256', $canonical, $secret);

        return [
            'Content-Type: application/json; charset=utf-8',
            'X-RobiTrail-Timestamp: ' . $timestamp,
            'X-RobiTrail-Signature: ' . $signature,
        ];
    }

    /**
     * Separate verification flow for incoming third-party bdapps webhook notifications.
     * Does NOT accept Node.js gateway HMAC as a substitute for provider verification.
     */
    public static function verifyBdappsNotificationRequest(array $config, array $payload, string $rawBody): array
    {
        $expectedAppId = (string) ($config['bdapps_app_id'] ?? '');
        $incomingAppId = isset($payload['applicationId']) && is_string($payload['applicationId'])
            ? trim($payload['applicationId'])
            : '';

        if ($expectedAppId === '' || $incomingAppId === '' || !hash_equals($expectedAppId, $incomingAppId)) {
            return [
                'verified' => false,
                'reason' => 'applicationId_mismatch',
            ];
        }

        // Optional IP allowlist when bdapps provides static notification source IPs
        $allowedIps = $config['bdapps_allowed_callback_ips'] ?? [];
        if (is_array($allowedIps) && count($allowedIps) > 0) {
            $remoteIp = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
            if (!in_array($remoteIp, $allowedIps, true)) {
                return [
                    'verified' => false,
                    'reason' => 'source_ip_not_allowed',
                ];
            }
        }

        // Option A: Provider webhook HMAC header (if configured upon bdapps confirmation)
        $hmacSecret = (string) ($config['bdapps_callback_hmac_secret'] ?? '');
        $providerSig = self::getHeader('X-Bdapps-Signature');
        if (ConfigLoader::isConfiguredSecret($hmacSecret) && $providerSig !== '') {
            $expectedSig = hash_hmac('sha256', $rawBody, $hmacSecret);
            if (!hash_equals(strtolower($expectedSig), strtolower($providerSig))) {
                return [
                    'verified' => false,
                    'reason' => 'invalid_provider_hmac',
                ];
            }
            return ['verified' => true, 'method' => 'hmac'];
        }

        // Option B: Documented bdapps payload `password` credential verification
        $configuredCallbackPassword = (string) ($config['bdapps_callback_password'] ?? '');
        $incomingPassword = isset($payload['password']) && is_string($payload['password'])
            ? $payload['password']
            : '';

        if (ConfigLoader::isConfiguredSecret($configuredCallbackPassword)) {
            if ($incomingPassword !== '' && hash_equals($configuredCallbackPassword, $incomingPassword)) {
                return ['verified' => true, 'method' => 'callback_password'];
            }
            return [
                'verified' => false,
                'reason' => 'invalid_callback_password',
            ];
        }

        return [
            'verified' => false,
            'reason' => 'provider_callback_credentials_not_configured',
        ];
    }
}
