import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import 'location_claim_models.dart';

final locationClaimControllerProvider = StateNotifierProvider<LocationClaimController, LocationClaimState>((ref) {
  return LocationClaimController(ref);
});

class LocationClaimController extends StateNotifier<LocationClaimState> {
  LocationClaimController(this._ref) : super(LocationClaimState.initial()) {
    _ref.listen<LocationControllerState>(locationControllerProvider, (_, next) {
      _onLocationState(next);
    }, fireImmediately: true);
  }

  final Ref _ref;

  final List<ClaimableLocation> _seedLocations = const [
    ClaimableLocation(id: 'loc-1', lat: 30.2672, lng: -97.7431, displayName: 'Congress Avenue Bat Bridge', category: 'landmark', claimRadiusMeters: 120, rewardAmount: 150),
    ClaimableLocation(id: 'loc-2', lat: 30.2648, lng: -97.7468, displayName: 'Lady Bird Lake Boardwalk', category: 'park', claimRadiusMeters: 90, rewardAmount: 120),
    ClaimableLocation(id: 'loc-3', lat: 30.2707, lng: -97.7501, displayName: 'Downtown Art Wall', category: 'art', claimRadiusMeters: 80, rewardAmount: 200),
  ];

  Future<void> startTracking() async {
    state = state.copyWith(isTracking: true, clearBanner: true);
    await _ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
  }

  void _onLocationState(LocationControllerState locationState) {
    final position = locationState.effectiveLocation;
    final claimables = _seedLocations.map((location) {
      final distance = position == null ? 999999.0 : _distanceMeters(position.lat, position.lng, location.lat, location.lng);
      ClaimFlowState flowState;
      if (distance <= location.claimRadiusMeters) {
        flowState = ClaimFlowState.visited;
      } else if (distance <= location.claimRadiusMeters * 2.0) {
        flowState = ClaimFlowState.approaching;
      } else {
        flowState = ClaimFlowState.outOfRange;
      }
      return ClaimableLocationView(location: location, distanceMeters: distance, flowState: flowState);
    }).toList(growable: false)
      ..sort((a, b) => a.distanceMeters.compareTo(b.distanceMeters));

    final visited = claimables.where((entry) => entry.flowState == ClaimFlowState.visited);
    final firstVisited = visited.isEmpty ? null : visited.first;
    state = state.copyWith(
      permissionStatus: locationState.status,
      currentPosition: position,
      claimables: claimables,
      banner: firstVisited == null ? null : 'You visited ${firstVisited.location.displayName}. Watch ad to claim ${firstVisited.location.rewardAmount} Perbug.',
      clearBanner: firstVisited == null,
    );
  }

  void prepareClaim(String locationId) {
    _setFlow(locationId, ClaimFlowState.adRequired, banner: 'Watch ad to claim Perbug.');
  }

  void completeInterstitialAd(String locationId, {required bool success}) {
    if (!success) {
      _setFlow(locationId, ClaimFlowState.adRequired, banner: 'Ad failed to load. Retry to claim.');
      return;
    }
    _setFlow(locationId, ClaimFlowState.claimReady, banner: 'Ad completed. Claim is ready.');
  }

  void finalizeClaim(String locationId) {
    final matches = state.claimables.where((c) => c.location.id == locationId);
    if (matches.isEmpty) return;
    final entry = matches.first;
    if (entry.flowState != ClaimFlowState.claimReady) return;
    if (state.pool.available < entry.location.rewardAmount) {
      state = state.copyWith(banner: 'Emission pool exhausted. Try again next cycle.');
      return;
    }
    _setFlow(locationId, ClaimFlowState.claimSuccess);
    state = state.copyWith(
      balance: state.balance + entry.location.rewardAmount,
      pool: AnnualEmissionPoolView(
        year: state.pool.year,
        baseAllocation: state.pool.baseAllocation,
        rollover: state.pool.rollover,
        claimed: state.pool.claimed + entry.location.rewardAmount,
      ),
      banner: 'Claim successful +${entry.location.rewardAmount} Perbug',
    );
  }

  void _setFlow(String locationId, ClaimFlowState flow, {String? banner}) {
    final next = state.claimables
        .map((entry) => entry.location.id == locationId ? entry.copyWith(flowState: flow) : entry)
        .toList(growable: false);
    state = state.copyWith(claimables: next, banner: banner);
  }

  double _distanceMeters(double lat1, double lng1, double lat2, double lng2) {
    const radius = 6371000.0;
    final dLat = _radians(lat2 - lat1);
    final dLng = _radians(lng2 - lng1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) + math.cos(_radians(lat1)) * math.cos(_radians(lat2)) * math.sin(dLng / 2) * math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return radius * c;
  }

  double _radians(double v) => v * math.pi / 180;
}
