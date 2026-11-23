<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Creates a signed session token only after
 * successful server-side Robi OTP verification.
 */
function createPlayerToken(string $msisdn): string
{
    $secret = getenv('ROBITRAIL_SESSION_SECRET');

    if (!$secret || strlen($secret) < 32) {
        throw new RuntimeException('Session secret not configured.');
    }

    $payload = [
        'msisdn' => $msisdn,
        'exp' => time() + 86400
    ];

    $body = rtrim(
        strtr(base64_encode(json_encode($payload)), '+/', '-_'),
        '='
    );

    $signature = rtrim(
        strtr(
            base64_encode(hash_hmac('sha256', $body, $secret, true)),
            '+/',
            '-_'
        ),
        '='
    );

    return $body . '.' . $signature;
}

/**
 * Verifies a player session and returns
 * the authenticated mobile number.
 */
function requirePlayerAuth(): string
{
    $secret = getenv('ROBITRAIL_SESSION_SECRET');

    if (!$secret || strlen($secret) < 32) {
        sendJson(503, ['error' => 'Authentication not configured']);
    }

    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        sendJson(401, ['error' => 'Authentication required']);
    }

    $parts = explode('.', trim($matches[1]));

    if (count($parts) !== 2) {
        sendJson(401, ['error' => 'Invalid session']);
    }

    [$body, $signature] = $parts;

    $expected = rtrim(
        strtr(
            base64_encode(hash_hmac('sha256', $body, $secret, true)),
            '+/',
            '-_'
        ),
        '='
    );

    if (!hash_equals($expected, $signature)) {
        sendJson(401, ['error' => 'Invalid session']);
    }

    $decoded = base64_decode(
        strtr($body, '-_', '+/'),
        true
    );

    $payload = json_decode($decoded ?: '', true);

    if (
        !is_array($payload) ||
        !isset($payload['exp'], $payload['msisdn']) ||
        !is_int($payload['exp']) ||
        time() >= $payload['exp'] ||
        !is_string($payload['msisdn']) ||
        !preg_match('/^8801[3-9]\d{8}$/', $payload['msisdn'])
    ) {
        sendJson(401, ['error' => 'Session expired or invalid']);
    }

    return $payload['msisdn'];
}
