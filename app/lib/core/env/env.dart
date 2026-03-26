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

  static const String _defaultApiBaseUrl = 'https://api.dryad.dev';
  static const String _defaultMapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';
  static const String _defaultMapStyleDarkUrl = 'https://tiles.openfreemap.org/styles/dark';

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
      associatedDomain: dotenv.maybeGet(EnvKeys.associatedDomain) ?? 'dryad.dev',
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
      associatedDomain: 'dryad.dev',
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
    final allowHttp = parsed.scheme == 'http' &&
        (parsed.host == 'localhost' || parsed.host == '127.0.0.1');
    if (parsed.scheme == 'http' && !allowHttp) {
      throw StateError('HTTP API base URL is only allowed for localhost: "$raw"');
    }
    return raw;
  }

  static MapStackConfig _resolveMapStackConfig() {
    const styleFromDefine = String.fromEnvironment(EnvKeys.mapStyleUrl);
    const darkFromDefine = String.fromEnvironment(EnvKeys.mapStyleDarkUrl);
    const strategyFromDefine = String.fromEnvironment(EnvKeys.mapTileSourceStrategy);
    const terrainFromDefine = String.fromEnvironment(EnvKeys.mapTerrainSourceUrl);

    return MapStackConfig(
      styleUrl: styleFromDefine.trim().isNotEmpty
          ? styleFromDefine.trim()
          : (dotenv.maybeGet(EnvKeys.mapStyleUrl)?.trim().isNotEmpty == true
              ? dotenv.maybeGet(EnvKeys.mapStyleUrl)!.trim()
              : _defaultMapStyleUrl),
      darkStyleUrl: darkFromDefine.trim().isNotEmpty
          ? darkFromDefine.trim()
          : (dotenv.maybeGet(EnvKeys.mapStyleDarkUrl)?.trim().isNotEmpty == true
              ? dotenv.maybeGet(EnvKeys.mapStyleDarkUrl)!.trim()
              : _defaultMapStyleDarkUrl),
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
