import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../connectivity/connectivity_state.dart';

class AppDiagnostics {
  static Future<String> build({
    required ConnectivityState connectivityState,
    required int sessionCount,
    required String? userId,
    int? telemetryQueueSize,
  }) async {
    final packageInfo = await PackageInfo.fromPlatform();
    final platform = _platformLabel();
    final safeUser = _maskUserId(userId);

    return '''OurPlanPlan diagnostics
appVersion: ${packageInfo.version} (${packageInfo.buildNumber})
platform: $platform
online: ${connectivityState.isOnline}
sessionCount: $sessionCount
telemetryQueueSize: ${telemetryQueueSize ?? 'unknown'}
userId: $safeUser
''';
  }

  static String _maskUserId(String? userId) {
    if (userId == null || userId.isEmpty) {
      return 'unknown';
    }

    return userId.length <= 8 ? userId : userId.substring(0, 8);
  }

  static String _platformLabel() {
    if (kIsWeb) {
      return 'web';
    }
    if (Platform.isIOS) {
      return 'iOS';
    }
    if (Platform.isAndroid) {
      return 'Android';
    }
    return Platform.operatingSystem;
  }
}
