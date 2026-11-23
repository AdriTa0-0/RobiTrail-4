<?php

declare(strict_types=1);

final class ResponseHelper
{
    public static function sendJson(int $statusCode, array $payload): never
    {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('X-Content-Type-Options: nosniff');
        }

        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function sendError(
        int $statusCode,
        string $errorCode,
        string $message,
        array $extra = []
    ): never {
        self::sendJson($statusCode, array_merge([
            'ok' => false,
            'errorCode' => $errorCode,
            'error' => $message,
        ], $extra));
    }

    public static function readRawBody(): string
    {
        $raw = file_get_contents('php://input');
        return is_string($raw) ? $raw : '';
    }

public static function decodeJsonBody(string $rawBody): array
{
    if (trim($rawBody) === '') {
        return [];
    }

    try {
        $decoded = json_decode(
            $rawBody,
            false,
            512,
            JSON_THROW_ON_ERROR
        );
    } catch (JsonException $e) {
        self::sendError(
            400,
            'INVALID_JSON',
            'Request body must contain valid JSON.'
        );
    }

    if (!$decoded instanceof stdClass) {
        self::sendError(
            400,
            'INVALID_JSON_OBJECT',
            'Request body must be a JSON object.'
        );
    }

    return json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
}

    /**
     * Normalizes Bangladesh MSISDN input (01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX, tel:8801XXXXXXXXX)
     * into digits-only `8801XXXXXXXXX`. Returns null if invalid.
     */
    public static function normalizeMsisdn(mixed $raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }
        $cleaned = preg_replace('/^tel:/i', '', trim($raw));
        if (!is_string($cleaned)) {
            return null;
        }
        $cleaned = preg_replace('/[\s-]/', '', $cleaned);
        if (!is_string($cleaned)) {
            return null;
        }
        if (preg_match('/^(?:\+?88)?(01[3-9]\d{8})$/', $cleaned, $matches) !== 1) {
            return null;
        }
        return '88' . $matches[1];
    }

    public static function toTelUri(string $msisdnDigits): string
    {
        return 'tel:' . $msisdnDigits;
    }

    public static function maskMsisdn(string $msisdnDigits): string
    {
        if (strlen($msisdnDigits) < 7) {
            return '***';
        }
        return substr($msisdnDigits, 0, 5) . '****' . substr($msisdnDigits, -3);
    }
}
