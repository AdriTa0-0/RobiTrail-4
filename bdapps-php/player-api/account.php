<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    sendJson(405, ['error' => 'Method not allowed']);
}

$msisdn = requirePlayerAuth();

// Match the original Node.js Firestore document ID.
$documentId = substr(
    hash('sha256', 'rt-wallet:' . $msisdn),
    0,
    40
);

$validTrailIds = [
    'ctg-1', 'ctg-2', 'ctg-3', 'ctg-4',
    'dhk-1', 'dhk-2', 'dhk-3', 'dhk-4', 'dhk-5',
    'syl-1', 'syl-2', 'syl-3', 'syl-4',
    'syl-5', 'syl-6', 'syl-7'
];

$readArray = static function (array $fields, string $key): array {
    $values = $fields[$key]['arrayValue']['values'] ?? [];

    if (!is_array($values)) {
        return [];
    }

    $result = [];

    foreach ($values as $item) {
        if (is_array($item) && isset($item['stringValue'])) {
            $result[] = (string) $item['stringValue'];
        }
    }

    return $result;
};

try {
    $db = getFirestore();

    // Load account from the original Firestore collection.
    try {
        $document = $db->document('accounts', $documentId);
    } catch (Throwable $e) {
        // Do not turn every Firestore error into a false 404.
        error_log('RobiTrail account read failed: ' . $e->getMessage());

        sendJson(503, [
            'error' => 'Unable to load player account.'
        ]);
    }

    $fields = $document['fields'] ?? [];

    if ($method === 'POST') {
            sendJson(403, [
        'error' => 'Progress updates require server-side verification.'
    ]);
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            sendJson(400, ['error' => 'Invalid JSON body']);
        }

        // Certificate IDs must NEVER be accepted from the player.
        if (array_key_exists('certificateIds', $input)) {
            sendJson(403, [
                'error' => 'Certificates can only be issued by the server.'
            ]);
        }

        $completed = $input['completedTrailIds'] ?? null;

        if (!is_array($completed) || count($completed) > 16) {
            sendJson(400, [
                'error' => 'Invalid completed trails.'
            ]);
        }

        foreach ($completed as $trailId) {
            if (
                !is_string($trailId) ||
                !in_array($trailId, $validTrailIds, true)
            ) {
                sendJson(400, [
                    'error' => 'Unknown trail ID.'
                ]);
            }
        }

        $existingCompleted = $readArray(
            $fields,
            'completedTrailIds'
        );

        $mergedCompleted = array_values(
            array_unique(
                array_merge($existingCompleted, $completed)
            )
        );

        // Preserve certificateIds and all other account fields.
        $body = [
            'fields' => [
                'completedTrailIds' => [
                    'arrayValue' => [
                        'values' => array_map(
                            static fn(string $id): array => [
                                'stringValue' => $id
                            ],
                            $mergedCompleted
                        )
                    ]
                ]
            ]
        ];

        $document = $db->document(
            'accounts',
            $documentId,
            'PATCH',
            $body
        );

        $fields = $document['fields'] ?? [];
    }

    sendJson(200, [
        'account' => [
            'completedTrailIds' => $readArray(
                $fields,
                'completedTrailIds'
            ),
            'certificateIds' => $readArray(
                $fields,
                'certificateIds'
            )
        ]
    ]);

} catch (Throwable $e) {
    error_log('RobiTrail account error: ' . $e->getMessage());

    sendJson(503, [
        'error' => 'Player account service unavailable.'
    ]);
}
