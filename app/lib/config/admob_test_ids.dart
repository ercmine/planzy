import 'dart:io';

import 'package:flutter/foundation.dart';

/// Centralized AdMob test ad unit ids from Google Mobile Ads docs.
///
/// Keeping these here avoids coupling ad configuration to plugin-specific
/// helper names that may change across versions.
class AdMobTestIds {
  const AdMobTestIds._();

  static const String androidBanner = 'ca-app-pub-3940256099942544/6300978111';
  static const String androidInterstitial = 'ca-app-pub-3940256099942544/1033173712';
  static const String androidRewarded = 'ca-app-pub-3940256099942544/5224354917';
  static const String androidNative = 'ca-app-pub-3940256099942544/2247696110';

  static const String iosBanner = 'ca-app-pub-3940256099942544/2934735716';
  static const String iosInterstitial = 'ca-app-pub-3940256099942544/4411468910';
  static const String iosRewarded = 'ca-app-pub-3940256099942544/1712485313';
  static const String iosNative = 'ca-app-pub-3940256099942544/3986624511';

  static String get native {
    if (kIsWeb) {
      return '';
    }
    if (Platform.isAndroid) {
      return androidNative;
    }
    if (Platform.isIOS) {
      return iosNative;
    }
    return '';
  }
}
