import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

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
    final isDev = flavor == EnvFlavor.dev;
    return AdsConfig(
      enabled: _parseBool(dotenv.maybeGet(EnvKeys.adsEnabled), fallback: false),
      // Google official test IDs by default for non-production/testing:
      // Android app: ca-app-pub-3940256099942544~3347511713
      // iOS app: ca-app-pub-3940256099942544~1458002511
      admobAppIdIos: dotenv.maybeGet(EnvKeys.adsAdmobAppIdIos) ??
          (isDev ? 'ca-app-pub-3940256099942544~1458002511' : ''),
      admobAppIdAndroid: dotenv.maybeGet(EnvKeys.adsAdmobAppIdAndroid) ??
          (isDev ? 'ca-app-pub-3940256099942544~3347511713' : ''),
      // Plugin-supported test unit IDs for native advanced:
      // Android native: ca-app-pub-3940256099942544/2247696110
      // iOS native: ca-app-pub-3940256099942544/3986624511
      nativeUnitIdIos: dotenv.maybeGet(EnvKeys.adsNativeUnitIdIos) ??
          (isDev ? 'ca-app-pub-3940256099942544/3986624511' : ''),
      nativeUnitIdAndroid: dotenv.maybeGet(EnvKeys.adsNativeUnitIdAndroid) ??
          (isDev ? 'ca-app-pub-3940256099942544/2247696110' : ''),
      frequencyN: _parseInt(dotenv.maybeGet(EnvKeys.adsFrequencyN), fallback: 10),
      placeFirstAfter: _parseInt(dotenv.maybeGet(EnvKeys.adsPlaceFirstAfter), fallback: 3),
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

  String currentNativeUnitId() {
    if (kIsWeb) {
      return '';
    }
    if (Platform.isIOS) {
      return nativeUnitIdIos;
    }
    if (Platform.isAndroid) {
      return nativeUnitIdAndroid;
    }
    return '';
  }

  String currentAppId() {
    if (kIsWeb) {
      return '';
    }
    if (Platform.isIOS) {
      return admobAppIdIos;
    }
    if (Platform.isAndroid) {
      return admobAppIdAndroid;
    }
    return '';
  }

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
