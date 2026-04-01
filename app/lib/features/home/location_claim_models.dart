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
    this.cooldownUntil,
    this.rarity,
  });

  final String id;
  final double lat;
  final double lng;
  final String displayName;
  final String category;
  final double claimRadiusMeters;
  final DateTime? cooldownUntil;
  final String? rarity;
}

class ClaimableLocationView {
  const ClaimableLocationView({
    required this.location,
    required this.distanceMeters,
    required this.flowState,
    required this.claimCount,
    required this.currentReward,
    required this.totalClaimedAtLocation,
    required this.uniqueVisitors,
    required this.isDepleted,
    this.cooldownUntil,
    this.visitId,
    this.adSessionId,
  });

  final ClaimableLocation location;
  final double distanceMeters;
  final ClaimFlowState flowState;
  final int claimCount;
  final double currentReward;
  final double totalClaimedAtLocation;
  final int uniqueVisitors;
  final bool isDepleted;
  final DateTime? cooldownUntil;
  final String? visitId;
  final String? adSessionId;

  bool get inRange => distanceMeters <= location.claimRadiusMeters;
  bool get isOnCooldown => cooldownUntil != null && cooldownUntil!.isAfter(DateTime.now().toUtc());

  ClaimableLocationView copyWith({
    double? distanceMeters,
    ClaimFlowState? flowState,
    int? claimCount,
    double? currentReward,
    double? totalClaimedAtLocation,
    int? uniqueVisitors,
    bool? isDepleted,
    DateTime? cooldownUntil,
    String? visitId,
    String? adSessionId,
  }) {
    return ClaimableLocationView(
      location: location,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      flowState: flowState ?? this.flowState,
      claimCount: claimCount ?? this.claimCount,
      currentReward: currentReward ?? this.currentReward,
      totalClaimedAtLocation: totalClaimedAtLocation ?? this.totalClaimedAtLocation,
      uniqueVisitors: uniqueVisitors ?? this.uniqueVisitors,
      isDepleted: isDepleted ?? this.isDepleted,
      cooldownUntil: cooldownUntil ?? this.cooldownUntil,
      visitId: visitId ?? this.visitId,
      adSessionId: adSessionId ?? this.adSessionId,
    );
  }
}

class GlobalClaimPoolView {
  const GlobalClaimPoolView({
    required this.totalClaimableSupply,
    required this.totalClaimedSupply,
  });

  final double totalClaimableSupply;
  final double totalClaimedSupply;

  double get remainingClaimableSupply => totalClaimableSupply - totalClaimedSupply;

  GlobalClaimPoolView copyWith({
    double? totalClaimableSupply,
    double? totalClaimedSupply,
  }) {
    return GlobalClaimPoolView(
      totalClaimableSupply: totalClaimableSupply ?? this.totalClaimableSupply,
      totalClaimedSupply: totalClaimedSupply ?? this.totalClaimedSupply,
    );
  }
}

class LocationClaimState {
  const LocationClaimState({
    required this.isTracking,
    required this.permissionStatus,
    required this.currentPosition,
    required this.claimables,
    required this.balance,
    required this.globalPool,
    required this.claimHistory,
    this.banner,
  });

  factory LocationClaimState.initial() => const LocationClaimState(
        isTracking: false,
        permissionStatus: LocationStatus.loading,
        currentPosition: null,
        claimables: [],
        balance: 0,
        globalPool: GlobalClaimPoolView(
          totalClaimableSupply: 400000000,
          totalClaimedSupply: 0,
        ),
        claimHistory: [],
      );

  final bool isTracking;
  final LocationStatus permissionStatus;
  final AppLocation? currentPosition;
  final List<ClaimableLocationView> claimables;
  final double balance;
  final GlobalClaimPoolView globalPool;
  final List<ClaimTransaction> claimHistory;
  final String? banner;

  LocationClaimState copyWith({
    bool? isTracking,
    LocationStatus? permissionStatus,
    AppLocation? currentPosition,
    List<ClaimableLocationView>? claimables,
    double? balance,
    GlobalClaimPoolView? globalPool,
    List<ClaimTransaction>? claimHistory,
    String? banner,
    bool clearBanner = false,
  }) {
    return LocationClaimState(
      isTracking: isTracking ?? this.isTracking,
      permissionStatus: permissionStatus ?? this.permissionStatus,
      currentPosition: currentPosition ?? this.currentPosition,
      claimables: claimables ?? this.claimables,
      balance: balance ?? this.balance,
      globalPool: globalPool ?? this.globalPool,
      claimHistory: claimHistory ?? this.claimHistory,
      banner: clearBanner ? null : (banner ?? this.banner),
    );
  }
}

class ClaimTransaction {
  const ClaimTransaction({
    required this.locationId,
    required this.locationName,
    required this.reward,
    required this.destinationAddress,
    required this.payoutStatus,
    required this.claimCountAfter,
    required this.createdAt,
    this.txid,
  });

  final String locationId;
  final String locationName;
  final double reward;
  final String destinationAddress;
  final String payoutStatus;
  final int claimCountAfter;
  final DateTime createdAt;
  final String? txid;

  Map<String, dynamic> toJson() => {
        'locationId': locationId,
        'locationName': locationName,
        'reward': reward,
        'destinationAddress': destinationAddress,
        'payoutStatus': payoutStatus,
        'claimCountAfter': claimCountAfter,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'txid': txid,
      };

  static ClaimTransaction fromJson(Map<String, dynamic> json) => ClaimTransaction(
        locationId: (json['locationId'] as String?) ?? '',
        locationName: (json['locationName'] as String?) ?? '',
        reward: (json['reward'] as num?)?.toDouble() ?? 0,
        destinationAddress: (json['destinationAddress'] as String?) ?? '',
        payoutStatus: (json['payoutStatus'] as String?) ?? 'pending',
        claimCountAfter: (json['claimCountAfter'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse((json['createdAt'] as String?) ?? '')?.toUtc() ?? DateTime.now().toUtc(),
        txid: (json['txid'] as String?)?.trim().isEmpty == true ? null : (json['txid'] as String?),
      );
}

extension ClaimFlowStateCodec on ClaimFlowState {
  String get wire => name;
  static ClaimFlowState fromWire(String value) {
    return ClaimFlowState.values.firstWhere(
      (entry) => entry.name == value,
      orElse: () => ClaimFlowState.outOfRange,
    );
  }
}
