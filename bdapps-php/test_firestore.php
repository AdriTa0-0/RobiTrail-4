
<?php
// Local testing only. Delete before deployment.

$keyPath = 'C:\Users\HP\Downloads\robitrail-secrets\firebase-service-account.json';

if (!is_file($keyPath)) {
    exit("Service account file not found.\n");
}

$key = json_decode(file_get_contents($keyPath), true);

if (
    !is_array($key) ||
    empty($key['client_email']) ||
    empty($key['private_key']) ||
    empty($key['project_id'])
) {
    exit("Invalid service account configuration.\n");
}

function base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

$now = time();

$header = base64url(json_encode([
    'alg' => 'RS256',
    'typ' => 'JWT'
]));

$payload = base64url(json_encode([
    'iss' => $key['client_email'],
    'sub' => $key['client_email'],
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600,
    'scope' => 'https://www.googleapis.com/auth/datastore'
]));

$message = "$header.$payload";

if (!openssl_sign($message, $signature, $key['private_key'], OPENSSL_ALGO_SHA256)) {
    exit("Could not sign authentication request.\n");
}

$jwt = "$message." . base64url($signature);

function request(string $url, array $options): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, $options + [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException($error);
    }

    return [$status, json_decode($response, true)];
}

try {
    [$status, $auth] = request(
        'https://oauth2.googleapis.com/token',
        [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt
            ])
        ]
    );

    if ($status !== 200 || empty($auth['access_token'])) {
        exit("Firebase authentication failed. HTTP $status\n");
    }

    echo "Google authentication successful.\n";

    $project = rawurlencode($key['project_id']);
    $url = "https://firestore.googleapis.com/v1/projects/$project/databases/(default)/documents/integration_tests/local_php";

    $document = json_encode([
        'fields' => [
            'message' => ['stringValue' => 'PHP Firebase connected'],
            'tested_at' => ['timestampValue' => gmdate('Y-m-d\TH:i:s\Z')]
        ]
    ]);

    [$writeStatus, $saved] = request($url, [
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $auth['access_token'],
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => $document
    ]);

    if ($writeStatus !== 200) {
        exit("Firestore write failed. HTTP $writeStatus\n");
    }

    echo "Firestore write successful.\n";

    [$readStatus, $result] = request($url, [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $auth['access_token']
        ]
    ]);

    if ($readStatus === 200 &&
        ($result['fields']['message']['stringValue'] ?? '') === 'PHP Firebase connected') {
        echo "Firestore read successful.\n";
        echo "CONNECTION TEST PASSED!\n";
    } else {
        echo "Firestore read failed. HTTP $readStatus\n";
    }

} catch (Throwable $e) {
    echo "Connection error. Check PHP cURL, OpenSSL and network settings.\n";
}
