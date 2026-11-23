<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/FirestoreClient.php';

$db = null;
$documentId = 'commit_test_' . bin2hex(random_bytes(8));
$collection = 'integration_tests';
$created = false;

try {
    $db = new FirestoreClient();

    // Use a separate document, never a player wallet.
    $projectId = getenv('FIREBASE_PROJECT_ID');
    if (!$projectId) {
        $credentialsPath = getenv('FIREBASE_SERVICE_ACCOUNT_PATH');
        $credentials = json_decode(
            file_get_contents($credentialsPath),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $projectId = $credentials['project_id'];
    }

    $databaseId = getenv('FIRESTORE_DATABASE_ID') ?: '(default)';

    $name = 'projects/' . $projectId
        . '/databases/' . $databaseId
        . '/documents/' . $collection . '/' . $documentId;

    $write = [
        'update' => [
            'name' => $name,
            'fields' => [
                'testStatus' => ['stringValue' => 'commit_verified'],
                'testNumber' => ['integerValue' => '1']
            ]
        ],
        'currentDocument' => ['exists' => false]
    ];

    $db->commit([$write]);
    $created = true;

    echo "Commit successful.\n";

    $document = $db->document($collection, $documentId);

    $status = $document['fields']['testStatus']['stringValue'] ?? '';
    $number = $document['fields']['testNumber']['integerValue'] ?? '';

    if ($status !== 'commit_verified' || (string)$number !== '1') {
        throw new RuntimeException('Read-back verification failed.');
    }

    echo "Read-back verification successful.\n";

    $db->document($collection, $documentId, 'DELETE');
    $created = false;

    echo "Test document deleted successfully.\n";
    echo "COMMIT TEST PASSED!\n";

} catch (Throwable $e) {
    echo "COMMIT TEST FAILED: " . $e->getMessage() . "\n";
    exit(1);
} finally {
    if ($created && $db !== null) {
        try {
            $db->document($collection, $documentId, 'DELETE');
            echo "Cleanup completed.\n";
        } catch (Throwable $cleanupError) {
            echo "Cleanup failed; check integration_tests/"
                . $documentId . "\n";
        }
    }
}
