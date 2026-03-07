import 'package:flutter_riverpod/flutter_riverpod.dart';

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
          ),
    ),
  ];
}
