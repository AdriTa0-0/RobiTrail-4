<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/FirestoreClient.php';

function sendJson(int $status, array $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function getFirestore(): FirestoreClient
{
    return new FirestoreClient();
}
