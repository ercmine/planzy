import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../providers/app_providers.dart';
import 'map_discovery_clients.dart';
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

  static const double _minimumReward = 0.000001;

  final Ref _ref;
  final Map<String, String> _displayNameCache = <String, String>{};
  int _locationRevision = 0;

  Future<List<ClaimableLocation>> _seedLocationsForPosition(AppLocation? position) async {
    if (position == null) return const [];

    final apiClient = await _ref.read(apiClientProvider.future);
    final geoClient = RemoteMapGeoClient(apiClient);

    final seeds = <({String id, double lat, double lng, String category, double claimRadiusMeters})>[
      (
        id: 'loc-north',
        lat: position.lat + 0.0012,
        lng: position.lng,
        category: 'district',
        claimRadiusMeters: 120,
      ),
      (
        id: 'loc-east',
        lat: position.lat + 0.0002,
        lng: position.lng + 0.0015,
        category: 'hub',
        claimRadiusMeters: 100,
      ),
      (
        id: 'loc-southwest',
        lat: position.lat - 0.0013,
        lng: position.lng - 0.0011,
        category: 'zone',
        claimRadiusMeters: 90,
      ),
    ];

    final resolved = <ClaimableLocation>[];
    for (final seed in seeds) {
      final displayName = await _resolveDisplayName(geoClient: geoClient, lat: seed.lat, lng: seed.lng);
      if (displayName == null || displayName.trim().isEmpty) {
        continue;
      }
      resolved.add(
        ClaimableLocation(
          id: seed.id,
          lat: seed.lat,
          lng: seed.lng,
          displayName: displayName,
          category: seed.category,
          claimRadiusMeters: seed.claimRadiusMeters,
        ),
      );
    }
    return resolved;
  }

  Future<String?> _resolveDisplayName({
    required RemoteMapGeoClient geoClient,
    required double lat,
    required double lng,
  }) async {
    final key = '${lat.toStringAsFixed(5)},${lng.toStringAsFixed(5)}';
    final cached = _displayNameCache[key];
    if (cached != null) return cached;
    try {
      final area = await geoClient.reverseGeocode(lat: lat, lng: lng);
      final name = area?.displayName.trim();
      if (name == null || name.isEmpty) return null;
      _displayNameCache[key] = name;
      return name;
    } catch (_) {
      return null;
    }
  }

  Future<void> startTracking() async {
    state = state.copyWith(isTracking: true, clearBanner: true);
    await _ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
  }

  Future<void> _onLocationState(LocationControllerState locationState) async {
    final revision = ++_locationRevision;
    final position = locationState.effectiveLocation;
    final seedLocations = await _seedLocationsForPosition(position);
    if (revision != _locationRevision) return;
    final claimables = seedLocations.map((location) {
      final existing = _findExistingClaimable(location.id);
      final distance = position == null ? 999999.0 : _distanceMeters(position.lat, position.lng, location.lat, location.lng);

      final rangeState = _rangeFlowState(location: location, distance: distance);
      final flowState = existing == null || existing.flowState == ClaimFlowState.claimSuccess ? rangeState : existing.flowState;
      return ClaimableLocationView(
        location: location,
        distanceMeters: distance,
        flowState: flowState,
        claimCount: existing?.claimCount ?? 0,
        currentReward: existing?.currentReward ?? 1,
        totalClaimedAtLocation: existing?.totalClaimedAtLocation ?? 0,
        uniqueVisitors: existing?.uniqueVisitors ?? 0,
        isDepleted: existing?.isDepleted ?? false,
      );
    }).toList(growable: false)
      ..sort((a, b) => a.distanceMeters.compareTo(b.distanceMeters));

    final visited = claimables.where((entry) => entry.flowState == ClaimFlowState.visited);
    final firstVisited = visited.isEmpty ? null : visited.first;
    state = state.copyWith(
      permissionStatus: locationState.status,
      currentPosition: position,
      claimables: claimables,
      banner: firstVisited == null
          ? null
          : 'You visited ${firstVisited.location.displayName}. Watch ad to claim ${firstVisited.currentReward.toStringAsFixed(6)} Perbug.',
      clearBanner: firstVisited == null,
    );
  }

  ClaimableLocationView? _findExistingClaimable(String locationId) {
    final matches = state.claimables.where((entry) => entry.location.id == locationId);
    return matches.isEmpty ? null : matches.first;
  }

  ClaimFlowState _rangeFlowState({required ClaimableLocation location, required double distance}) {
    if (distance <= location.claimRadiusMeters) {
      return ClaimFlowState.visited;
    }
    if (distance <= location.claimRadiusMeters * 2.0) {
      return ClaimFlowState.approaching;
    }
    return ClaimFlowState.outOfRange;
  }

  void prepareClaim(String locationId) {
    final entry = _findExistingClaimable(locationId);
    if (entry == null) return;
    if (entry.isDepleted || entry.currentReward < _minimumReward) {
      _setFlow(locationId, ClaimFlowState.unavailable, banner: 'Location reward is fully depleted.');
      return;
    }
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
    final entry = _findExistingClaimable(locationId);
    if (entry == null) return;
    if (entry.flowState == ClaimFlowState.claimSuccess || entry.flowState == ClaimFlowState.alreadyClaimed) {
      _setFlow(locationId, ClaimFlowState.alreadyClaimed, banner: 'This location was already claimed in this session.');
      return;
    }
    if (entry.flowState != ClaimFlowState.claimReady) return;

    final remaining = state.globalPool.remainingClaimableSupply;
    if (remaining <= 0) {
      _setFlow(locationId, ClaimFlowState.unavailable, banner: 'Global claimable Perbug supply is exhausted.');
      return;
    }

    _setFlow(locationId, ClaimFlowState.claimProcessing);

    final rawReward = _locationReward(entry.claimCount);
    final payout = math.min(rawReward, remaining);
    if (payout < _minimumReward) {
      _setFlow(locationId, ClaimFlowState.unavailable, banner: 'Remaining supply is below minimum claim precision.');
      return;
    }

    final nextClaimCount = entry.claimCount + 1;
    final nextReward = _locationReward(nextClaimCount);
    final locationDepleted = nextReward < _minimumReward;

    final updatedClaimables = state.claimables
        .map(
          (c) => c.location.id == locationId
              ? c.copyWith(
                  flowState: ClaimFlowState.claimSuccess,
                  claimCount: nextClaimCount,
                  currentReward: nextReward,
                  totalClaimedAtLocation: c.totalClaimedAtLocation + payout,
                  uniqueVisitors: c.uniqueVisitors + 1,
                  isDepleted: locationDepleted,
                )
              : c,
        )
        .toList(growable: false);

    state = state.copyWith(
      claimables: updatedClaimables,
      balance: state.balance + payout,
      globalPool: state.globalPool.copyWith(
        totalClaimedSupply: state.globalPool.totalClaimedSupply + payout,
      ),
      claimHistory: [
        ClaimTransaction(
          locationId: locationId,
          reward: payout,
          claimCountAfter: nextClaimCount,
          createdAt: DateTime.now().toUtc(),
        ),
        ...state.claimHistory,
      ],
      banner: 'Claim successful +${payout.toStringAsFixed(6)} Perbug',
    );
  }


  void debugSetGlobalClaimedSupplyForTesting(double totalClaimedSupply) {
    state = state.copyWith(
      globalPool: state.globalPool.copyWith(totalClaimedSupply: totalClaimedSupply),
    );
  }

  void _setFlow(String locationId, ClaimFlowState flow, {String? banner}) {
    final next = state.claimables
        .map((entry) => entry.location.id == locationId ? entry.copyWith(flowState: flow) : entry)
        .toList(growable: false);
    state = state.copyWith(claimables: next, banner: banner);
  }

  double _locationReward(int claimCount) => 1 / math.pow(2, claimCount);

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
