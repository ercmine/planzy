import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdMobConfig {
  const AdMobConfig._();

  static const String androidAppId = 'ca-app-pub-9929942639121200~8708144199';
  static const String androidNativeUnitId = 'ca-app-pub-9929942639121200/7339222206';
  static const String iosAppId = 'ca-app-pub-9929942639121200~6500929043';
  static const String iosNativeUnitId = 'ca-app-pub-9929942639121200/9298482776';

  static const String androidTestNativeUnitId =
      'ca-app-pub-3940256099942544/2247696110';
  static const String iosTestNativeUnitId =
      'ca-app-pub-3940256099942544/3986624511';

  static const String nativeFactoryId = 'perbugNativeAdFactory';

  static const int firstAdAfterItem = 3;
  static const int adInterval = 8;

  static bool get isTestAdsEnabled => kDebugMode;

  static List<String> get testDeviceIds => const <String>[];

  static bool get isSupportedPlatform => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  static String get appId {
    if (kIsWeb) {
      return '';
    }
    if (Platform.isAndroid) {
      return androidAppId;
    }
    if (Platform.isIOS) {
      return iosAppId;
    }
    return '';
  }

  static String get nativeUnitId {
    if (kIsWeb) {
      return '';
    }
    if (isTestAdsEnabled) {
      if (Platform.isAndroid) {
        return androidTestNativeUnitId;
      }
      if (Platform.isIOS) {
        return iosTestNativeUnitId;
      }
    }

    if (Platform.isAndroid) {
      return androidNativeUnitId;
    }
    if (Platform.isIOS) {
      return iosNativeUnitId;
    }
    return '';
  }

  static RequestConfiguration get requestConfiguration {
    return RequestConfiguration(testDeviceIds: testDeviceIds);
  }
}
