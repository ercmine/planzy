import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../perbug/chain/perbug_chain_providers.dart';
import '../../providers/app_providers.dart';
import 'map_discovery_clients.dart';
import 'location_claim_constants.dart';
import 'location_claim_models.dart';
import 'location_claim_persistence_store.dart';

final locationClaimControllerProvider = StateNotifierProvider<LocationClaimController, LocationClaimState>((ref) {
  return LocationClaimController(ref);
});

class LocationClaimController extends StateNotifier<LocationClaimState> {
  LocationClaimController(this._ref) : super(LocationClaimState.initial()) {
    _restoreFromDisk();
    _ref.listen<LocationControllerState>(locationControllerProvider, (_, next) {
      _onLocationState(next);
    }, fireImmediately: true);
  }

  static const double _minimumReward = 0.000001;
  static const Duration _claimCooldown = Duration(hours: 24);

  final Ref _ref;
  final Map<String, String> _displayNameCache = <String, String>{};
  Map<String, Map<String, dynamic>> _persistedClaimablesById = const {};
  LocationClaimPersistenceStore? _persistence;
  int _locationRevision = 0;

  Future<void> _restoreFromDisk() async {
    final prefs = await _ref.read(sharedPreferencesProvider.future);
    _persistence = LocationClaimPersistenceStore(prefs);
    final persisted = _persistence?.load();
    if (persisted == null) return;
    state = state.copyWith(
      balance: persisted.balance,
      globalPool: state.globalPool.copyWith(
        totalClaimableSupply: persisted.totalClaimableSupply ?? state.globalPool.totalClaimableSupply,
        totalClaimedSupply: persisted.totalClaimedSupply ?? state.globalPool.totalClaimedSupply,
      ),
      claimHistory: persisted.claimHistory,
    );
    _persistedClaimablesById = {
      for (final item in persisted.claimables) (item['id'] as String? ?? ''): item,
    };
  }

  void _persistState() {
    final store = _persistence;
    if (store == null) return;
    unawaited(store.save(state));
  }

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
        claimRadiusMeters: defaultClaimRadiusMeters,
      ),
      (
        id: 'loc-east',
        lat: position.lat + 0.0002,
        lng: position.lng + 0.0015,
        category: 'hub',
        claimRadiusMeters: defaultClaimRadiusMeters,
      ),
      (
        id: 'loc-southwest',
        lat: position.lat - 0.0013,
        lng: position.lng - 0.0011,
        category: 'zone',
        claimRadiusMeters: defaultClaimRadiusMeters,
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
      final persisted = _persistedClaimablesById[location.id];
      final distance = position == null ? 999999.0 : _distanceMeters(position.lat, position.lng, location.lat, location.lng);

      final rangeState = _rangeFlowState(location: location, distance: distance);
      final now = DateTime.now().toUtc();
      final cooldownFromPersisted = DateTime.tryParse((persisted?['cooldownUntil'] as String?) ?? '')?.toUtc();
      final isOnCooldown = (existing?.cooldownUntil ?? cooldownFromPersisted) != null && (existing?.cooldownUntil ?? cooldownFromPersisted)!.isAfter(now);
      final existingClaimCount = existing?.claimCount ?? (persisted?['claimCount'] as num?)?.toInt() ?? 0;
      final existingReward = existing?.currentReward ?? (persisted?['currentReward'] as num?)?.toDouble() ?? 1;
      final existingTotalClaimed = existing?.totalClaimedAtLocation ?? (persisted?['totalClaimedAtLocation'] as num?)?.toDouble() ?? 0;
      final existingVisitors = existing?.uniqueVisitors ?? (persisted?['uniqueVisitors'] as num?)?.toInt() ?? 0;
      final existingDepleted = existing?.isDepleted ?? (persisted?['isDepleted'] as bool?) ?? false;
      final existingFlow = existing?.flowState ?? ClaimFlowStateCodec.fromWire((persisted?['flowState'] as String?) ?? '');
      final flowState = isOnCooldown
          ? ClaimFlowState.cooldown
          : existing == null || existingFlow == ClaimFlowState.claimSuccess || existingFlow == ClaimFlowState.cooldown
              ? rangeState
              : existingFlow;
      return ClaimableLocationView(
        location: location,
        distanceMeters: distance,
        flowState: flowState,
        claimCount: existingClaimCount,
        currentReward: existingReward,
        totalClaimedAtLocation: existingTotalClaimed,
        uniqueVisitors: existingVisitors,
        isDepleted: existingDepleted,
        cooldownUntil: existing?.cooldownUntil ?? cooldownFromPersisted,
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
          : 'You visited ${firstVisited.location.displayName}. Tap node to claim ${firstVisited.currentReward.toStringAsFixed(6)} Perbug.',
      clearBanner: firstVisited == null,
    );
    _persistState();
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
    _setFlow(locationId, ClaimFlowState.claimReady, banner: 'Claim is ready.');
  }

  void completeInterstitialAd(String locationId, {required bool success}) {
    if (!success) {
      _setFlow(locationId, ClaimFlowState.adRequired, banner: 'Ad failed to load. Retry to claim.');
      return;
    }
    _setFlow(locationId, ClaimFlowState.claimReady, banner: 'Ad completed. Claim is ready.');
  }

  Future<void> finalizeClaim(String locationId) async {
    final entry = _findExistingClaimable(locationId);
    if (entry == null) return;
    if (entry.flowState == ClaimFlowState.claimSuccess || entry.flowState == ClaimFlowState.alreadyClaimed || entry.flowState == ClaimFlowState.cooldown) {
      final cooldownUntil = entry.cooldownUntil;
      if (cooldownUntil != null && cooldownUntil.isAfter(DateTime.now().toUtc())) {
        _setFlow(locationId, ClaimFlowState.cooldown, banner: 'Node cooling down until ${cooldownUntil.toLocal()}.');
        return;
      }
      _setFlow(locationId, ClaimFlowState.alreadyClaimed, banner: 'This location was already claimed in this session.');
      return;
    }
    if (entry.flowState != ClaimFlowState.claimReady && entry.flowState != ClaimFlowState.visited) return;
    final payoutAddress = (_ref.read(walletAddressProvider) ?? '').trim();
    if (payoutAddress.isEmpty) {
      _setFlow(locationId, ClaimFlowState.adRequired, banner: 'Add your Perbug wallet address before claiming payout.');
      return;
    }

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
    final cooldownUntil = DateTime.now().toUtc().add(_claimCooldown);

    final updatedClaimables = state.claimables
        .map(
          (c) => c.location.id == locationId
              ? c.copyWith(
                  flowState: ClaimFlowState.cooldown,
                  claimCount: nextClaimCount,
                  currentReward: nextReward,
                  totalClaimedAtLocation: c.totalClaimedAtLocation + payout,
                  uniqueVisitors: c.uniqueVisitors + 1,
                  isDepleted: locationDepleted,
                  cooldownUntil: cooldownUntil,
                )
              : c,
        )
        .toList(growable: false);

    try {
      final apiClient = await _ref.read(apiClientProvider.future);
      final response = await apiClient.postJson('/v1/location-claims/finalize', body: {
        'locationId': locationId,
        'visitId': entry.visitId ?? 'visit-local-${DateTime.now().millisecondsSinceEpoch}',
        'adSessionId': entry.adSessionId ?? 'ad-local-${DateTime.now().millisecondsSinceEpoch}',
        'idempotencyKey': 'claim-${DateTime.now().microsecondsSinceEpoch}',
        'payoutAddress': payoutAddress,
      });
      final claim = ((response['claim'] as Map?) ?? const {}).cast<String, dynamic>();
      final txid = claim['payoutTxid']?.toString();
      final payoutStatus = claim['payoutStatus']?.toString() ?? 'submitted';
      state = state.copyWith(
        claimables: updatedClaimables,
        balance: state.balance + payout,
        globalPool: state.globalPool.copyWith(
          totalClaimedSupply: state.globalPool.totalClaimedSupply + payout,
        ),
        claimHistory: [
          ClaimTransaction(
            locationId: locationId,
            locationName: entry.location.displayName,
            reward: payout,
            destinationAddress: payoutAddress,
            payoutStatus: payoutStatus,
            txid: txid,
            claimCountAfter: nextClaimCount,
            createdAt: DateTime.now().toUtc(),
          ),
          ...state.claimHistory,
        ],
        banner: '${payout.toStringAsFixed(6)} Perbug payout submitted to wallet ${_maskAddress(payoutAddress)}.',
      );
      _persistState();
    } catch (error) {
      _setFlow(locationId, ClaimFlowState.claimReady, banner: 'Payout submission failed: $error');
    }
  }

  Future<void> claimInstantly(String locationId) async {
    final entry = _findExistingClaimable(locationId);
    if (entry == null) return;
    if (!entry.inRange) {
      _setFlow(locationId, ClaimFlowState.outOfRange, banner: 'Move within ${entry.location.claimRadiusMeters.round()}m to claim this node.');
      return;
    }
    if (entry.isOnCooldown) {
      _setFlow(locationId, ClaimFlowState.cooldown, banner: 'Node is cooling down. Try again later.');
      return;
    }
    if (entry.isDepleted || entry.currentReward < _minimumReward) {
      _setFlow(locationId, ClaimFlowState.unavailable, banner: 'Location reward is fully depleted.');
      return;
    }
    _setFlow(locationId, ClaimFlowState.claimReady);
    await finalizeClaim(locationId);
  }


  void debugSetGlobalClaimedSupplyForTesting(double totalClaimedSupply) {
    state = state.copyWith(
      globalPool: state.globalPool.copyWith(totalClaimedSupply: totalClaimedSupply),
    );
  }

  void debugExpireCooldownForTesting(String locationId) {
    final next = state.claimables
        .map(
          (entry) => entry.location.id == locationId
              ? entry.copyWith(
                  flowState: ClaimFlowState.visited,
                  cooldownUntil: DateTime.now().toUtc().subtract(const Duration(seconds: 1)),
                )
              : entry,
        )
        .toList(growable: false);
    state = state.copyWith(claimables: next);
    _persistState();
  }

  void _setFlow(String locationId, ClaimFlowState flow, {String? banner}) {
    final next = state.claimables
        .map((entry) => entry.location.id == locationId ? entry.copyWith(flowState: flow) : entry)
        .toList(growable: false);
    state = state.copyWith(claimables: next, banner: banner);
    _persistState();
  }

  double _locationReward(int claimCount) => 1 / math.pow(2, claimCount);
  String _maskAddress(String value) {
    if (value.length <= 12) return value;
    return '${value.substring(0, 6)}…${value.substring(value.length - 4)}';
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
