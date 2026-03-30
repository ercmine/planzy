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

  String get modeLabel => web ? 'web-first' : 'native';
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
