import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../ads/ads_config.dart';
import 'env_keys.dart';

enum EnvFlavor { dev, stage, prod }

class EnvConfig {
  const EnvConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.enableDebugLogs,
    required this.associatedDomain,
    required this.adsConfig,
  });

  final EnvFlavor flavor;
  final String apiBaseUrl;
  final bool enableDebugLogs;
  final String associatedDomain;
  final AdsConfig adsConfig;
}

final envConfigProvider = Provider<EnvConfig>((ref) {
  throw UnimplementedError('envConfigProvider must be overridden in main_*');
});

class Env {
  const Env._();

  static Future<EnvConfig> load(EnvFlavor flavor) async {
    final fileName = switch (flavor) {
      EnvFlavor.dev => '.env.dev',
      EnvFlavor.stage => '.env.stage',
      EnvFlavor.prod => '.env.prod',
    };

    try {
      await dotenv.load(fileName: fileName);
    } catch (error) {
      debugPrint('Could not load $fileName, using defaults. $error');
    }

    final defaultBaseUrl = switch (flavor) {
      EnvFlavor.dev => 'http://localhost:8080',
      EnvFlavor.stage => 'https://stage-api.ourplanplan.com',
      EnvFlavor.prod => 'https://api.ourplanplan.com',
    };

    final defaultDebug = flavor != EnvFlavor.prod;

    return EnvConfig(
      flavor: flavor,
      apiBaseUrl: dotenv.maybeGet(EnvKeys.apiBaseUrl) ?? defaultBaseUrl,
      enableDebugLogs: _parseBool(
        dotenv.maybeGet(EnvKeys.enableDebugLogs),
        fallback: defaultDebug,
      ),
      associatedDomain:
          dotenv.maybeGet(EnvKeys.associatedDomain) ?? 'ourplanplan.com',
      adsConfig: AdsConfig.fromEnv(flavor: flavor),
    );
  }

  static bool _parseBool(String? value, {required bool fallback}) {
    if (value == null) {
      return fallback;
    }

    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1';
  }
}
