<?php
declare(strict_types=1);

final class FirestoreHttpException extends RuntimeException
{
    public function __construct(public readonly int $httpStatus, string $message)
    {
        parent::__construct($message, $httpStatus);
    }
}

final class FirestoreClient
{
    private array $credentials;
    private string $accessToken = '';
    private int $tokenExpiresAt = 0;
    private string $databaseId;

    public function __construct()
    {
        $path = getenv('FIREBASE_SERVICE_ACCOUNT_PATH');
        if (!is_string($path) || $path === '' || !is_file($path) || !is_readable($path)) {
            throw new RuntimeException('Firebase service account path is not configured.');
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new RuntimeException('Firebase credentials could not be read.');
        }
        $credentials = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($credentials) || empty($credentials['project_id']) || empty($credentials['client_email']) || empty($credentials['private_key'])) {
            throw new RuntimeException('Invalid Firebase credentials.');
        }
        $this->credentials = $credentials;
        $this->databaseId = getenv('FIRESTORE_DATABASE_ID') ?: '(default)';
        if (!preg_match('/^[A-Za-z0-9_().-]{1,128}$/', $this->databaseId)) {
            throw new RuntimeException('Invalid Firestore database ID.');
        }
        $this->refreshAccessToken();
    }

    private function base64url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function refreshAccessToken(): void
    {
        if ($this->accessToken !== '' && time() < $this->tokenExpiresAt - 60) {
            return;
        }
        $now = time();
        $tokenUri = $this->credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';
        if (!is_string($tokenUri) || $tokenUri !== 'https://oauth2.googleapis.com/token') {
            throw new RuntimeException('Unexpected OAuth token endpoint.');
        }
        $header = $this->base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->base64url(json_encode([
            'iss' => $this->credentials['client_email'],
            'sub' => $this->credentials['client_email'],
            'aud' => $tokenUri,
            'iat' => $now,
            'exp' => $now + 3600,
            'scope' => 'https://www.googleapis.com/auth/datastore',
        ], JSON_THROW_ON_ERROR));
        $message = $header . '.' . $payload;
        if (!openssl_sign($message, $signature, $this->credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('JWT signing failed.');
        }
        $jwt = $message . '.' . $this->base64url($signature);
        $result = $this->http('POST', $tokenUri, [
            'Content-Type: application/x-www-form-urlencoded',
        ], http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]));
        $data = $result['body'];
        if (!isset($data['access_token']) || !is_string($data['access_token'])) {
            throw new RuntimeException('Google authentication failed.');
        }
        $this->accessToken = $data['access_token'];
        $this->tokenExpiresAt = time() + max(60, (int) ($data['expires_in'] ?? 3600));
    }

    private function http(string $method, string $url, array $headers, ?string $body = null, bool $allowNdjson = false): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Unable to initialize HTTP client.');
        }
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
        ];
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = $body;
        }
        curl_setopt_array($ch, $opts);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            throw new RuntimeException('Firestore transport failure: ' . $error);
        }
        $decoded = $response === '' ? [] : json_decode($response, true);
        if (!is_array($decoded) && $allowNdjson && $status >= 200 && $status < 300) {
            $decoded = [];
            foreach (preg_split('/\r?\n/', trim($response)) as $line) {
                if (trim($line) === '') {
                    continue;
                }
                $decoded[] = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            }
        }
        if (!is_array($decoded)) {
            throw new RuntimeException('Invalid JSON response from remote service.');
        }
        if ($status < 200 || $status >= 300) {
            $message = $decoded['error']['message'] ?? ('Remote request failed with HTTP ' . $status);
            throw new FirestoreHttpException($status, is_string($message) ? $message : 'Remote request failed.');
        }
        return ['status' => $status, 'body' => $decoded];
    }

    private function documentsRoot(): string
    {
        return 'https://firestore.googleapis.com/v1/projects/'
            . rawurlencode($this->credentials['project_id'])
            . '/databases/' . rawurlencode($this->databaseId)
            . '/documents';
    }

    private function validateSegment(string $segment): void
    {
        if (!preg_match('/^[A-Za-z0-9_-]{1,128}$/', $segment)) {
            throw new InvalidArgumentException('Invalid Firestore document path segment.');
        }
    }

    private function request(string $method, string $url, ?array $body = null, bool $allowNdjson = false): array
    {
        $this->refreshAccessToken();
        return $this->http($method, $url, [
            'Authorization: Bearer ' . $this->accessToken,
            'Content-Type: application/json',
        ], $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR), $allowNdjson)['body'];
    }

    public function document(
        string $collection,
        string $documentId,
        string $method = 'GET',
        ?array $body = null,
        ?array $updateFields = null,
        ?string $expectedUpdateTime = null
    ): array {
        $this->validateSegment($collection);
        $this->validateSegment($documentId);
        $method = strtoupper($method);
        if (!in_array($method, ['GET', 'PATCH', 'DELETE'], true)) {
            throw new InvalidArgumentException('Unsupported Firestore document method.');
        }
        $url = $this->documentsRoot() . '/' . $collection . '/' . $documentId;
        $params = [];
        if ($method === 'PATCH') {
            if ($body === null || !isset($body['fields']) || !is_array($body['fields'])) {
                throw new InvalidArgumentException('PATCH requires Firestore fields.');
            }
            $updateFields ??= array_keys($body['fields']);
            if ($updateFields === []) {
                throw new InvalidArgumentException('PATCH requires at least one update field.');
            }
            foreach ($updateFields as $field) {
                if (!is_string($field) || !preg_match('/^[A-Za-z][A-Za-z0-9_]*$/', $field) || !array_key_exists($field, $body['fields'])) {
                    throw new InvalidArgumentException('Invalid Firestore update mask.');
                }
                $params[] = 'updateMask.fieldPaths=' . rawurlencode($field);
            }
        }
        if ($expectedUpdateTime !== null) {
            $params[] = 'currentDocument.updateTime=' . rawurlencode($expectedUpdateTime);
        }
        if ($params !== []) {
            $url .= '?' . implode('&', $params);
        }
        return $this->request($method, $url, $body);
    }

    /** Begin a Firestore read-write transaction. Returns its opaque transaction ID. */
    public function beginTransaction(): string
    {
        $result = $this->request('POST', $this->documentsRoot() . ':beginTransaction', [
            'options' => ['readWrite' => new stdClass()],
        ]);
        if (!isset($result['transaction']) || !is_string($result['transaction']) || $result['transaction'] === '') {
            throw new RuntimeException('Firestore did not return a transaction ID.');
        }
        return $result['transaction'];
    }

    /**
     * Read documents within an existing transaction.
     * Each input path is [collection, documentId]. Returns one Firestore result
     * per document (found or missing); result order is not guaranteed.
     */
    public function batchGet(array $paths, string $transaction): array
    {
        if ($transaction === '' || $paths === []) {
            throw new InvalidArgumentException('Transaction and document paths are required.');
        }
        $documents = [];
        foreach ($paths as $path) {
            if (!is_array($path) || count($path) !== 2 || !isset($path[0], $path[1]) || !is_string($path[0]) || !is_string($path[1])) {
                throw new InvalidArgumentException('Each document path must contain collection and document ID.');
            }
            $this->validateSegment($path[0]);
            $this->validateSegment($path[1]);
           $documents[] = 'projects/'
    . $this->credentials['project_id']
    . '/databases/'
    . $this->databaseId
    . '/documents/'
    . $path[0]
    . '/'
    . $path[1];
        }
        $result = $this->request('POST', $this->documentsRoot() . ':batchGet', [
            'documents' => $documents,
            'transaction' => $transaction,
        ], true);
        // Firestore batchGet may return a JSON array or newline-delimited JSON.
        if (isset($result['found']) || isset($result['missing'])) {
            return [$result];
        }
        return $result;
    }

    /** Commit atomic writes, optionally inside a read-write transaction. */
    public function commit(array $writes, ?string $transaction = null): array
    {
        if ($writes === []) {
            throw new InvalidArgumentException('Firestore commit requires writes.');
        }
        foreach ($writes as $write) {
            if (!is_array($write) || (!isset($write['update']) && !isset($write['delete']) && !isset($write['transform']))) {
                throw new InvalidArgumentException('Invalid Firestore write.');
            }
        }
        $body = ['writes' => $writes];
        if ($transaction !== null) {
            if ($transaction === '') {
                throw new InvalidArgumentException('Transaction ID cannot be empty.');
            }
            $body['transaction'] = $transaction;
        }
        return $this->request('POST', $this->documentsRoot() . ':commit', $body);
    }

    /** Roll back a transaction when no commit was made. */
    public function rollbackTransaction(string $transaction): void
    {
        if ($transaction === '') {
            throw new InvalidArgumentException('Transaction ID cannot be empty.');
        }
        $this->request('POST', $this->documentsRoot() . ':rollback', [
            'transaction' => $transaction,
        ]);
    }
}
