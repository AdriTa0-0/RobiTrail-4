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
        $privateConfigPath = null;
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
                $privateConfigPath = dirname($parent) . '/private/robitrail_bdapps_config.php';
                $candidatePaths[] = $privateConfigPath;
                break;
            }
            $next = dirname($parent);
            if ($next === $parent) {
                break;
            }
            $parent = $next;
        }
        // For nonstandard document roots, set ROBITRAIL_BDAPPS_CONFIG explicitly.

        // One-time, best-effort migration from older deployments that stored secrets inside webroot.
        // Never include these secrets in any export/release ZIP.
        $legacyConfigPath = dirname(__DIR__) . '/robitrail_bdapps_config.php';
        if (is_file($legacyConfigPath) && is_string($privateConfigPath)) {
            $privateDir = dirname($privateConfigPath);
            if ((is_dir($privateDir) || @mkdir($privateDir, 0700, true)) && !is_file($privateConfigPath)) {
                if (@rename($legacyConfigPath, $privateConfigPath)) {
                    @chmod($privateConfigPath, 0600);
                }
            }
        }
        // On hosts disallowing rename, keep the old config accessible to PHP only. Apache
        // must deny HTTP requests to this path via .htaccess until it can be migrated.
        $candidatePaths[] = $legacyConfigPath;

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

        // This release deliberately enables only the non-subscription SMS login path when
        // existing provider credentials are configured. Explicit force-preview override
        // remains possible if the operator needs to disable live SMS without code changes.
        if (getenv('ROBITRAIL_FORCE_PREVIEW') === 'true') {
            $merged['bdapps_mode'] = 'preview';
        } elseif (self::isConfiguredSecret($merged['bdapps_api_secret'] ?? '') &&
                  self::isConfiguredSecret($merged['php_gateway_shared_secret'] ?? '')) {
            $merged['bdapps_mode'] = 'production';
        }
        // Restore the callback URL missing from earlier live installations. Does NOT
        // enable CaaS, subscription, or bypass provider callback authentication.
        $callbackUrl = (string) ($merged['node_internal_callback_url'] ?? '');
        if ($callbackUrl === '' || str_contains($callbackUrl, 'example.com')) {
            $merged['node_internal_callback_url'] = 'https://robitrail-4.ipsc100157.workers.dev/api/internal/bdapps/callback';
        }
        $merged['live_charging_enabled'] = false;
        $merged['subscription_enabled'] = false;
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
