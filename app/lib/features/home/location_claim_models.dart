import '../../core/location/location_models.dart';

enum ClaimFlowState {
  outOfRange,
  approaching,
  visited,
  adRequired,
  claimReady,
  claimProcessing,
  claimSuccess,
  cooldown,
  alreadyClaimed,
  unavailable,
}

class ClaimableLocation {
  const ClaimableLocation({
    required this.id,
    required this.lat,
    required this.lng,
    required this.displayName,
    required this.category,
    required this.claimRadiusMeters,
    required this.rewardAmount,
    this.cooldownUntil,
    this.rarity,
  });

  final String id;
  final double lat;
  final double lng;
  final String displayName;
  final String category;
  final double claimRadiusMeters;
  final int rewardAmount;
  final DateTime? cooldownUntil;
  final String? rarity;
}

class ClaimableLocationView {
  const ClaimableLocationView({
    required this.location,
    required this.distanceMeters,
    required this.flowState,
    this.visitId,
    this.adSessionId,
  });

  final ClaimableLocation location;
  final double distanceMeters;
  final ClaimFlowState flowState;
  final String? visitId;
  final String? adSessionId;

  bool get inRange => distanceMeters <= location.claimRadiusMeters;

  ClaimableLocationView copyWith({
    double? distanceMeters,
    ClaimFlowState? flowState,
    String? visitId,
    String? adSessionId,
  }) {
    return ClaimableLocationView(
      location: location,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      flowState: flowState ?? this.flowState,
      visitId: visitId ?? this.visitId,
      adSessionId: adSessionId ?? this.adSessionId,
    );
  }
}

class AnnualEmissionPoolView {
  const AnnualEmissionPoolView({
    required this.year,
    required this.baseAllocation,
    required this.rollover,
    required this.claimed,
  });

  final int year;
  final int baseAllocation;
  final int rollover;
  final int claimed;

  int get startingPool => baseAllocation + rollover;
  int get available => startingPool - claimed;
}

class LocationClaimState {
  const LocationClaimState({
    required this.isTracking,
    required this.permissionStatus,
    required this.currentPosition,
    required this.claimables,
    required this.balance,
    required this.pool,
    this.banner,
  });

  factory LocationClaimState.initial() => LocationClaimState(
        isTracking: false,
        permissionStatus: LocationStatus.loading,
        currentPosition: null,
        claimables: const [],
        balance: 0,
        pool: AnnualEmissionPoolView(
          year: DateTime.now().year,
          baseAllocation: 10000000,
          rollover: 0,
          claimed: 0,
        ),
      );

  final bool isTracking;
  final LocationStatus permissionStatus;
  final AppLocation? currentPosition;
  final List<ClaimableLocationView> claimables;
  final int balance;
  final AnnualEmissionPoolView pool;
  final String? banner;

  LocationClaimState copyWith({
    bool? isTracking,
    LocationStatus? permissionStatus,
    AppLocation? currentPosition,
    List<ClaimableLocationView>? claimables,
    int? balance,
    AnnualEmissionPoolView? pool,
    String? banner,
    bool clearBanner = false,
  }) {
    return LocationClaimState(
      isTracking: isTracking ?? this.isTracking,
      permissionStatus: permissionStatus ?? this.permissionStatus,
      currentPosition: currentPosition ?? this.currentPosition,
      claimables: claimables ?? this.claimables,
      balance: balance ?? this.balance,
      pool: pool ?? this.pool,
      banner: clearBanner ? null : (banner ?? this.banner),
    );
  }
}
