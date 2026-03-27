import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../ads/ads_config.dart';
import '../logging/log.dart';
import 'env_keys.dart';

enum EnvFlavor { dev, stage, prod }

class MapStackConfig {
  const MapStackConfig({
    required this.styleUrl,
    required this.darkStyleUrl,
    required this.tileSourceStrategy,
    this.terrainSourceUrl,
    required this.enable3dBuildings,
    required this.enableTerrain,
    required this.enableClustering,
    required this.enableEnhancedPitch,
    required this.enableDiagnostics,
  });

  final String styleUrl;
  final String darkStyleUrl;
  final String tileSourceStrategy;
  final String? terrainSourceUrl;
  final bool enable3dBuildings;
  final bool enableTerrain;
  final bool enableClustering;
  final bool enableEnhancedPitch;
  final bool enableDiagnostics;
}

class EnvConfig {
  const EnvConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.enableDebugLogs,
    required this.associatedDomain,
    required this.adsConfig,
    required this.fsqApiKey,
    required this.mapStack,
    this.rawEnv = const <String, String>{},
  });

  final EnvFlavor flavor;
  final String apiBaseUrl;
  final bool enableDebugLogs;
  final String associatedDomain;
  final AdsConfig adsConfig;
  final String? fsqApiKey;
  final MapStackConfig mapStack;
  final Map<String, String> rawEnv;
}

final envConfigProvider = Provider<EnvConfig>((ref) {
  throw UnimplementedError('envConfigProvider must be overridden in main_*');
});

class Env {
  const Env._();

  static const String _defaultApiBaseUrl = 'https://api.perbug.com';
  static const String _defaultMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';
  static const String _defaultMapStyleDarkUrl = 'https://tiles.openfreemap.org/styles/liberty';

  static Future<EnvConfig> load(EnvFlavor flavor) async {
    final fileName = switch (flavor) {
      EnvFlavor.dev => '.env.dev',
      EnvFlavor.stage => '.env.stage',
      EnvFlavor.prod => '.env.prod',
    };

    var dotenvLoaded = true;
    try {
      await dotenv.load(fileName: fileName);
    } catch (error) {
      dotenvLoaded = false;
      final message =
          'Missing or unreadable $fileName. Falling back to compile-time/default config with API base URL $_defaultApiBaseUrl.';
      if (kDebugMode) {
        throw StateError(message);
      }
      Log.error(message, error: error);
    }

    final defaultDebug = flavor != EnvFlavor.prod;
    final apiBaseUrl = _resolveApiBaseUrl();

    if (kDebugMode) {
      debugPrint(
        'EnvConfig resolved: flavor=$flavor baseUrl=$apiBaseUrl dotenvLoaded=$dotenvLoaded',
      );
    }

    return EnvConfig(
      flavor: flavor,
      apiBaseUrl: apiBaseUrl,
      enableDebugLogs: _parseBool(
        dotenv.maybeGet(EnvKeys.enableDebugLogs),
        fallback: defaultDebug,
      ),
      associatedDomain: dotenv.maybeGet(EnvKeys.associatedDomain) ?? 'perbug.com',
      adsConfig: AdsConfig.fromEnv(flavor: flavor),
      fsqApiKey: _resolveFoursquareApiKey(),
      mapStack: _resolveMapStackConfig(),
      rawEnv: _resolveRawEnv(),
    );
  }

  static EnvConfig fallbackConfig(EnvFlavor flavor) {
    final defaultDebug = flavor != EnvFlavor.prod;
    return EnvConfig(
      flavor: flavor,
      apiBaseUrl: _resolveApiBaseUrl(),
      enableDebugLogs: defaultDebug,
      associatedDomain: 'perbug.com',
      adsConfig: AdsConfig.disabled(),
      fsqApiKey: _resolveFoursquareApiKey(),
      mapStack: _resolveMapStackConfig(),
      rawEnv: _resolveRawEnv(),
    );
  }

  static String _resolveApiBaseUrl() {
    const fromDartDefine = String.fromEnvironment(EnvKeys.apiBaseUrl);
    if (fromDartDefine.trim().isNotEmpty) {
      return _validateApiBaseUrl(fromDartDefine.trim());
    }

    final fromDotEnv = dotenv.maybeGet(EnvKeys.apiBaseUrl)?.trim();
    if (fromDotEnv != null && fromDotEnv.isNotEmpty) {
      return _validateApiBaseUrl(fromDotEnv);
    }

    return _defaultApiBaseUrl;
  }

  static String _validateApiBaseUrl(String raw) {
    final parsed = Uri.tryParse(raw);
    if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) {
      throw StateError('Invalid API base URL configured: "$raw"');
    }
    if (parsed.scheme != 'https' && parsed.scheme != 'http') {
      throw StateError('API base URL must use http or https: "$raw"');
    }
    final allowHttp = parsed.scheme == 'http' && _isAllowedLocalHttpHost(parsed.host);
    if (parsed.scheme == 'http' && !allowHttp) {
      throw StateError('HTTP API base URL is only allowed for localhost or private LAN hosts: "$raw"');
    }
    return raw;
  }

  static bool _isAllowedLocalHttpHost(String host) {
    if (host == 'localhost' || host == '127.0.0.1' || host == '::1') return true;
    if (host.endsWith('.local')) return true;

    final parts = host.split('.');
    if (parts.length != 4) return false;
    final octets = <int>[];
    for (final part in parts) {
      final parsed = int.tryParse(part);
      if (parsed == null || parsed < 0 || parsed > 255) return false;
      octets.add(parsed);
    }

    final a = octets[0];
    final b = octets[1];
    if (a == 10) return true;
    if (a == 172 && b >= 16 && b <= 31) return true;
    if (a == 192 && b == 168) return true;
    return false;
  }

  static MapStackConfig _resolveMapStackConfig() {
    const styleFromDefine = String.fromEnvironment(EnvKeys.mapStyleUrl);
    const darkFromDefine = String.fromEnvironment(EnvKeys.mapStyleDarkUrl);
    const strategyFromDefine = String.fromEnvironment(EnvKeys.mapTileSourceStrategy);
    const terrainFromDefine = String.fromEnvironment(EnvKeys.mapTerrainSourceUrl);

    final resolvedStyleUrl = styleFromDefine.trim().isNotEmpty
        ? styleFromDefine.trim()
        : (dotenv.maybeGet(EnvKeys.mapStyleUrl)?.trim().isNotEmpty == true
            ? dotenv.maybeGet(EnvKeys.mapStyleUrl)!.trim()
            : _defaultMapStyleUrl);
    final resolvedDarkStyleUrl = darkFromDefine.trim().isNotEmpty
        ? darkFromDefine.trim()
        : (dotenv.maybeGet(EnvKeys.mapStyleDarkUrl)?.trim().isNotEmpty == true
            ? dotenv.maybeGet(EnvKeys.mapStyleDarkUrl)!.trim()
            : _defaultMapStyleDarkUrl);

    return MapStackConfig(
      styleUrl: _normalizeMapStyleUrl(resolvedStyleUrl, isDark: false),
      darkStyleUrl: _normalizeMapStyleUrl(resolvedDarkStyleUrl, isDark: true),
      tileSourceStrategy: strategyFromDefine.trim().isNotEmpty
          ? strategyFromDefine.trim()
          : (dotenv.maybeGet(EnvKeys.mapTileSourceStrategy)?.trim().isNotEmpty == true
              ? dotenv.maybeGet(EnvKeys.mapTileSourceStrategy)!.trim()
              : 'openfreemap'),
      terrainSourceUrl: terrainFromDefine.trim().isNotEmpty
          ? terrainFromDefine.trim()
          : dotenv.maybeGet(EnvKeys.mapTerrainSourceUrl)?.trim(),
      enable3dBuildings: _parseBool(dotenv.maybeGet(EnvKeys.mapEnable3dBuildings), fallback: true),
      enableTerrain: _parseBool(dotenv.maybeGet(EnvKeys.mapEnableTerrain), fallback: false),
      enableClustering: _parseBool(dotenv.maybeGet(EnvKeys.mapEnableClustering), fallback: true),
      enableEnhancedPitch: _parseBool(dotenv.maybeGet(EnvKeys.mapEnableEnhancedPitch), fallback: true),
      enableDiagnostics: _parseBool(dotenv.maybeGet(EnvKeys.mapEnableDiagnostics), fallback: false),
    );
  }

  static String? _resolveFoursquareApiKey() {
    const fromDartDefine = String.fromEnvironment(EnvKeys.fsqApiKey);
    if (fromDartDefine.trim().isNotEmpty) {
      return fromDartDefine.trim();
    }
    final fromDotEnv = dotenv.maybeGet(EnvKeys.fsqApiKey)?.trim();
    if (fromDotEnv != null && fromDotEnv.isNotEmpty) {
      return fromDotEnv;
    }
    return null;
  }

  static String _normalizeMapStyleUrl(String raw, {required bool isDark}) {
    final normalizedRaw = raw.trim();
    if (normalizedRaw == 'builtin://light') {
      return _builtinRasterStyleJson(isDark: false);
    }
    if (normalizedRaw == 'builtin://dark') {
      return _builtinRasterStyleJson(isDark: true);
    }

    final uri = Uri.tryParse(raw);
    if (uri == null) return raw;
    if (uri.host != 'tiles.openfreemap.org') return raw;

    final segments = uri.pathSegments.where((segment) => segment.isNotEmpty).toList(growable: false);
    if (segments.length == 2 && segments.first == 'styles') {
      // OpenFreeMap short style URLs (`/styles/<name>`) are not consistently
      // accepted by all MapLibre clients. Resolve explicitly to style.json so
      // style loading is deterministic across platforms.
      final normalizedPath = '${uri.path.endsWith('/') ? uri.path : '${uri.path}/'}style.json';
      return uri.replace(path: normalizedPath).toString();
    }
    return uri.path.endsWith('/style.json') ? raw : _builtinRasterStyleJson(isDark: isDark);
  }

  static String _builtinRasterStyleJson({required bool isDark}) {
    return jsonEncode({
      'version': 8,
      'name': isDark ? 'Perbug Built-in Dark' : 'Perbug Built-in Light',
      'sources': {
        'openstreetmap': {
          'type': 'raster',
          'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          'tileSize': 256,
          'attribution': '© OpenStreetMap contributors',
          'maxzoom': 19,
        },
      },
      'layers': [
        {
          'id': 'openstreetmap-raster',
          'type': 'raster',
          'source': 'openstreetmap',
        },
      ],
    });
  }


  static Map<String, String> _resolveRawEnv() {
    return Map<String, String>.from(dotenv.env);
  }

  static bool _parseBool(String? value, {required bool fallback}) {
    if (value == null) {
      return fallback;
    }

    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1';
  }
}
