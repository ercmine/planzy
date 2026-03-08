import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../config/admob_config.dart';
import '../env/env.dart';
import '../env/env_keys.dart';

class AdsConfig {
  const AdsConfig({
    required this.enabled,
    required this.admobAppIdIos,
    required this.admobAppIdAndroid,
    required this.nativeUnitIdIos,
    required this.nativeUnitIdAndroid,
    required this.frequencyN,
    required this.placeFirstAfter,
    required this.maxAdsPerWindow,
    required this.adsWindowSize,
  });

  factory AdsConfig.fromEnv({required EnvFlavor flavor}) {
    return AdsConfig(
      enabled: _parseBool(dotenv.maybeGet(EnvKeys.adsEnabled), fallback: true),
      admobAppIdIos: AdMobConfig.iosAppId,
      admobAppIdAndroid: AdMobConfig.androidAppId,
      nativeUnitIdIos: AdMobConfig.iosNativeUnitId,
      nativeUnitIdAndroid: AdMobConfig.androidNativeUnitId,
      frequencyN: _parseInt(
        dotenv.maybeGet(EnvKeys.adsFrequencyN),
        fallback: AdMobConfig.adInterval,
      ),
      placeFirstAfter: _parseInt(
        dotenv.maybeGet(EnvKeys.adsPlaceFirstAfter),
        fallback: AdMobConfig.firstAdAfterItem,
      ),
      maxAdsPerWindow: 3,
      adsWindowSize: 50,
    );
  }

  factory AdsConfig.disabled() {
    return const AdsConfig(
      enabled: false,
      admobAppIdIos: '',
      admobAppIdAndroid: '',
      nativeUnitIdIos: '',
      nativeUnitIdAndroid: '',
      frequencyN: 8,
      placeFirstAfter: 3,
      maxAdsPerWindow: 3,
      adsWindowSize: 50,
    );
  }

  final bool enabled;
  final String admobAppIdIos;
  final String admobAppIdAndroid;
  final String nativeUnitIdIos;
  final String nativeUnitIdAndroid;
  final int frequencyN;
  final int placeFirstAfter;
  final int maxAdsPerWindow;
  final int adsWindowSize;

  bool get isSupportedPlatform => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  bool get isUsable => enabled && isSupportedPlatform;

  static bool _parseBool(String? value, {required bool fallback}) {
    if (value == null) {
      return fallback;
    }
    final normalized = value.toLowerCase();
    return normalized == 'true' || normalized == '1';
  }

  static int _parseInt(String? value, {required int fallback}) {
    final parsed = int.tryParse(value ?? '');
    if (parsed == null || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }
}
