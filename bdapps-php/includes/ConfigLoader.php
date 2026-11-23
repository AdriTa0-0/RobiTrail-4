<?php

declare(strict_types=1);

/**
 * Loads gateway configuration strictly from outside the web root when deployed on cPanel.
 */
final class ConfigLoader
{
    public static function load(): array
    {
        $example = require dirname(__DIR__) . '/config.example.php';

        $candidatePaths = [];
        $envPath = getenv('ROBITRAIL_BDAPPS_CONFIG');
        if (is_string($envPath) && $envPath !== '') {
            $candidatePaths[] = $envPath;
        }

        // Find the cPanel account home by walking up to the actual public_html directory.
        // E.g. /home/user/public_html/auw26/team/includes/ -> /home/user/private/...
        // Do not search for secret configs inside the web-accessible document root.
        $parent = dirname(__DIR__);
        for ($depth = 0; $depth < 12; $depth++) {
            if (basename($parent) === 'public_html') {
                $candidatePaths[] = dirname($parent) . '/private/robitrail_bdapps_config.php';
                break;
            }
            $next = dirname($parent);
            if ($next === $parent) {
                break;
            }
            $parent = $next;
        }
        // For nonstandard document roots, set ROBITRAIL_BDAPPS_CONFIG explicitly.

        $loadedOverride = [];
        $configSource = 'env_or_defaults';

        foreach ($candidatePaths as $path) {
            if (is_string($path) && $path !== '' && is_file($path) && is_readable($path)) {
                $data = require $path;
                if (is_array($data)) {
                    $loadedOverride = $data;
                    $configSource = 'private_file';
                    break;
                }
            }
        }

        $merged = array_replace_recursive($example, $loadedOverride);
        $merged['_meta'] = [
            'configSource' => $configSource,
            'hasRealAppSecret' => self::isConfiguredSecret($merged['bdapps_api_secret'] ?? ''),
            'hasSharedSecret' => self::isConfiguredSecret($merged['php_gateway_shared_secret'] ?? ''),
        ];

        return $merged;
    }

    public static function isConfiguredSecret(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        $trimmed = trim($value);
        if ($trimmed === '') {
            return false;
        }
        return !str_starts_with($trimmed, 'REPLACE_WITH_');
    }
}
