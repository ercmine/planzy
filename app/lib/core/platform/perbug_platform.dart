import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../features/dryad/chain/dryad_chain_providers.dart';

class PerbugPlatformSnapshot {
  const PerbugPlatformSnapshot({
    required this.target,
    required this.web,
    required this.walletAvailable,
    required this.locationApiSupported,
  });

  final TargetPlatform target;
  final bool web;
  final bool walletAvailable;
  final bool locationApiSupported;

  bool get isPrimaryMobileTarget => !web && (target == TargetPlatform.iOS || target == TargetPlatform.android);

  int get platformPriority {
    if (target == TargetPlatform.iOS) return 1;
    if (target == TargetPlatform.android) return 2;
    if (web) return 3;
    return 4;
  }

  String get modeLabel => isPrimaryMobileTarget ? 'mobile-first' : (web ? 'web-secondary' : 'native-secondary');
}

final perbugPlatformSnapshotProvider = FutureProvider<PerbugPlatformSnapshot>((ref) async {
  final walletAvailable = ref.watch(walletConnectorProvider).isAvailable;
  var locationApiSupported = true;
  try {
    locationApiSupported = await Geolocator.isLocationServiceEnabled();
  } catch (_) {
    locationApiSupported = false;
  }

  return PerbugPlatformSnapshot(
    target: defaultTargetPlatform,
    web: kIsWeb,
    walletAvailable: walletAvailable,
    locationApiSupported: locationApiSupported,
  );
});
