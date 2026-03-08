import 'package:flutter/foundation.dart';

import 'ad_placement.dart';

class AdsDiagnostics {
  const AdsDiagnostics();

  void log(String event, {required AdPlacement placement, Map<String, Object?> data = const {}}) {
    if (!kDebugMode) {
      return;
    }
    debugPrint('[Ads] $event placement=${placement.name} data=$data');
  }
}
