<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/FirestoreClient.php';

$db = null;
$collection = 'integration_tests';
$id = 'transaction_test_' . bin2hex(random_bytes(8));
$created = false;
$transactionId = null;

try {
    $db = new FirestoreClient();

    $credentials = json_decode(
        file_get_contents(getenv('FIREBASE_SERVICE_ACCOUNT_PATH')),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    $name = 'projects/' . $credentials['project_id']
        . '/databases/' . (getenv('FIRESTORE_DATABASE_ID') ?: '(default)')
        . '/documents/' . $collection . '/' . $id;

    // Create a separate temporary test document.
    $db->commit([[
        'update' => [
            'name' => $name,
            'fields' => [
                'testValue' => ['integerValue' => '1']
            ]
        ],
        'currentDocument' => ['exists' => false]
    ]]);

    $created = true;
    echo "Test document created.\n";

    // Read inside a transaction.
    $transactionId = $db->beginTransaction();
    echo "Transaction started.\n";

    $results = $db->batchGet(
        [[$collection, $id]],
        $transactionId
    );

    $document = $results[0]['found'] ?? null;

    if (!is_array($document)) {
        throw new RuntimeException('Transactional document read failed.');
    }

    $value = (int) ($document['fields']['testValue']['integerValue'] ?? -1);

    if ($value !== 1) {
        throw new RuntimeException('Unexpected initial test value.');
    }

    echo "Transactional read successful.\n";

    // Commit the updated value within the same transaction.
    $db->commit([[
        'update' => [
            'name' => $name,
            'fields' => [
                'testValue' => ['integerValue' => '2']
            ]
        ],
        'currentDocument' => [
            'updateTime' => $document['updateTime']
        ]
    ]], $transactionId);

    $transactionId = null;
    echo "Transactional commit successful.\n";

    // Verify the committed value.
    $updated = $db->document($collection, $id);
    $newValue = (int) ($updated['fields']['testValue']['integerValue'] ?? -1);

    if ($newValue !== 2) {
        throw new RuntimeException('Committed value verification failed.');
    }

    echo "Read-back verification successful.\n";
    echo "TRANSACTION COMMIT TEST PASSED!\n";

} catch (Throwable $e) {
    echo "TRANSACTION COMMIT TEST FAILED: " . $e->getMessage() . "\n";
    exit(1);

} finally {
    if ($transactionId !== null && $db !== null) {
        try {
            $db->rollbackTransaction($transactionId);
        } catch (Throwable $ignored) {}
    }

    if ($created && $db !== null) {
        try {
            $db->document($collection, $id, 'DELETE');
            echo "Test document cleaned up.\n";
        } catch (Throwable $e) {
            echo "Cleanup failed for: " . $id . "\n";
        }
    }
}
