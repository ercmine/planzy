import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../ads/ads_config.dart';
import '../logging/log.dart';
import 'env_keys.dart';

enum EnvFlavor { dev, stage, prod }

class EnvConfig {
  const EnvConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.enableDebugLogs,
    required this.associatedDomain,
    required this.adsConfig,
    required this.fsqApiKey,
  });

  final EnvFlavor flavor;
  final String apiBaseUrl;
  final bool enableDebugLogs;
  final String associatedDomain;
  final AdsConfig adsConfig;
  final String? fsqApiKey;
}

final envConfigProvider = Provider<EnvConfig>((ref) {
  throw UnimplementedError('envConfigProvider must be overridden in main_*');
});

class Env {
  const Env._();

  static const String _defaultApiBaseUrl = 'https://api.perbug.com';

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
    if (parsed.scheme != 'https') {
      throw StateError('API base URL must use https: "$raw"');
    }
    return raw;
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

  static bool _parseBool(String? value, {required bool fallback}) {
    if (value == null) {
      return fallback;
    }

    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1';
  }
}
