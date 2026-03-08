import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/ads/ads_config.dart';
import '../core/env/env.dart';
import 'app_providers.dart';

List<Override> createBaseTestOverrides({
  EnvConfig? envConfig,
}) {
  return [
    envConfigProvider.overrideWithValue(
      envConfig ??
          const EnvConfig(
            flavor: EnvFlavor.dev,
            apiBaseUrl: 'https://example.test',
            enableDebugLogs: true,
            associatedDomain: 'example.test',
            fsqApiKey: null,
            adsConfig: AdsConfig(
              enabled: false,
              admobAppIdIos: '',
              admobAppIdAndroid: '',
              nativeUnitIdIos: '',
              nativeUnitIdAndroid: '',
              frequencyN: 10,
              placeFirstAfter: 3,
              maxAdsPerWindow: 3,
              adsWindowSize: 50,
            ),
          ),
    ),
  ];
}
