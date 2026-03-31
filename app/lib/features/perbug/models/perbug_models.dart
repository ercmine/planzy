import 'package:flutter/foundation.dart';

enum TreeSaleStatus { notListed, listed, sold }

enum TreeClaimState { claimable, claimed, planted, unavailable }

enum TreeLifecycleState { planted, listed, sold, dugUp, readyToReplant, replanted }

@immutable
class PerbugTree {
  const PerbugTree({
    required this.id,
    required this.name,
    required this.placeName,
    required this.locationLabel,
    required this.latitude,
    required this.longitude,
    required this.founderHandle,
    required this.ownerHandle,
    required this.growthLevel,
    required this.contributionCount,
    required this.rarity,
    required this.category,
    required this.saleStatus,
    required this.claimState,
    required this.lifecycleState,
    required this.isPortable,
    this.currentSpotId,
    this.priceEth,
    this.pricePerbug,
    this.treeImageUrl,
    this.digUpTxHash,
    this.lastWateredAt,
    this.nextWateringAvailableAt,
    this.waterCooldownSeconds,
  });

  final String id;
  final String name;
  final String placeName;
  final String locationLabel;
  final double latitude;
  final double longitude;
  final String founderHandle;
  final String ownerHandle;
  final int growthLevel;
  final int contributionCount;
  final String rarity;
  final String category;
  final TreeSaleStatus saleStatus;
  final TreeClaimState claimState;
  final TreeLifecycleState lifecycleState;
  final bool isPortable;
  final String? currentSpotId;
  final double? priceEth;
  final double? pricePerbug;
  final String? treeImageUrl;
  final String? digUpTxHash;
  final DateTime? lastWateredAt;
  final DateTime? nextWateringAvailableAt;
  final int? waterCooldownSeconds;

  bool get isListed => saleStatus == TreeSaleStatus.listed;
  bool get readyToReplant => isPortable || lifecycleState == TreeLifecycleState.readyToReplant;
  bool get canWaterNow {
    final next = nextWateringAvailableAt;
    if (next == null) return true;
    return DateTime.now().isAfter(next) || DateTime.now().isAtSameMomentAs(next);
  }

  String get statusLabel {
    switch (claimState) {
      case TreeClaimState.claimable:
        return 'Claimable';
      case TreeClaimState.claimed:
        return 'Claimed';
      case TreeClaimState.planted:
        return 'Planted';
      case TreeClaimState.unavailable:
        return 'Unavailable';
    }
  }

  String get lifecycleLabel {
    switch (lifecycleState) {
      case TreeLifecycleState.planted:
        return 'Planted';
      case TreeLifecycleState.listed:
        return 'Listed';
      case TreeLifecycleState.sold:
        return 'Sold';
      case TreeLifecycleState.dugUp:
        return 'Dug up';
      case TreeLifecycleState.readyToReplant:
        return 'Ready to replant';
      case TreeLifecycleState.replanted:
        return 'Replanted';
    }
  }

  factory PerbugTree.fromJson(Map<String, dynamic> json) {
    final id = _readString(json, const ['id', 'treeId']);
    final name = _readString(json, const ['name', 'treeName', 'title']) ?? 'Untitled tree';
    final placeName = _readString(json, const ['placeName', 'place', 'venueName']) ?? 'Unknown place';
    final locationLabel = _readString(json, const ['locationLabel', 'location', 'cityLabel']) ?? placeName;
    final ownerHandle = _readString(json, const ['ownerHandle', 'sellerHandle', 'owner', 'wallet']) ?? 'Unknown owner';
    final founderHandle = _readString(json, const ['founderHandle', 'founder', 'creatorHandle']) ?? ownerHandle;

    TreeSaleStatus sale;
    switch ((_readString(json, const ['saleStatus', 'sale_status', 'listingStatus']) ?? '').toLowerCase()) {
      case 'listed':
        sale = TreeSaleStatus.listed;
        break;
      case 'sold':
        sale = TreeSaleStatus.sold;
        break;
      default:
        sale = TreeSaleStatus.notListed;
    }

    TreeClaimState claim;
    switch ((_readString(json, const ['claimState', 'claim_state']) ?? '').toLowerCase()) {
      case 'claimed':
        claim = TreeClaimState.claimed;
        break;
      case 'planted':
        claim = TreeClaimState.planted;
        break;
      case 'unavailable':
        claim = TreeClaimState.unavailable;
        break;
      default:
        claim = TreeClaimState.claimable;
    }

    TreeLifecycleState lifecycle;
    switch ((_readString(json, const ['lifecycleState', 'lifecycle_state']) ?? '').toLowerCase()) {
      case 'listed':
        lifecycle = TreeLifecycleState.listed;
        break;
      case 'sold':
        lifecycle = TreeLifecycleState.sold;
        break;
      case 'dug_up':
        lifecycle = TreeLifecycleState.dugUp;
        break;
      case 'ready_to_replant':
        lifecycle = TreeLifecycleState.readyToReplant;
        break;
      case 'replanted':
        lifecycle = TreeLifecycleState.replanted;
        break;
      default:
        lifecycle = TreeLifecycleState.planted;
    }

    return PerbugTree(
      id: id ?? '',
      name: name,
      placeName: placeName,
      locationLabel: locationLabel,
      latitude: _readDouble(json, const ['latitude', 'lat']) ?? 0,
      longitude: _readDouble(json, const ['longitude', 'lng']) ?? 0,
      founderHandle: founderHandle,
      ownerHandle: ownerHandle,
      growthLevel: _readInt(json, const ['growthLevel', 'growth_level']) ?? 0,
      contributionCount: _readInt(json, const ['contributionCount', 'contribution_count']) ?? 0,
      rarity: _readString(json, const ['rarity']) ?? 'Unknown',
      category: _readString(json, const ['category', 'type']) ?? 'Location',
      saleStatus: sale,
      claimState: claim,
      lifecycleState: lifecycle,
      isPortable: json['isPortable'] == true,
      currentSpotId: json['currentSpotId']?.toString(),
      priceEth: _readDouble(json, const ['priceEth', 'price_eth', 'listedPriceEth']),
      pricePerbug: (json['pricePerbug'] as num?)?.toDouble(),
      treeImageUrl: _readString(json, const ['treeImageUrl', 'imageUrl', 'image']),
      digUpTxHash: json['digUpTxHash']?.toString(),
      lastWateredAt: _parseDate(json['lastWateredAt']),
      nextWateringAvailableAt: _parseDate(json['nextWateringAvailableAt']),
      waterCooldownSeconds: (json['waterCooldownSeconds'] as num?)?.toInt(),
    );
  }
}

String? _readString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return null;
}

double? _readDouble(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    if (value is num) return value.toDouble();
    if (value is String) {
      final parsed = double.tryParse(value);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

int? _readInt(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) continue;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) {
      final parsed = int.tryParse(value);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

DateTime? _parseDate(dynamic value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

@immutable
class WalletAsset {
  const WalletAsset({required this.symbol, required this.balance, required this.fiatValue});

  final String symbol;
  final String balance;
  final String fiatValue;
}

@immutable
class PerbugSpot {
  const PerbugSpot({
    required this.spotId,
    required this.placeId,
    required this.label,
    required this.lat,
    required this.lng,
    required this.claimState,
  });

  final String spotId;
  final String placeId;
  final String label;
  final double lat;
  final double lng;
  final String claimState;

  bool get isUnclaimed => claimState == 'unclaimed';

  factory PerbugSpot.fromJson(Map<String, dynamic> json) => PerbugSpot(
        spotId: (json['spotId'] ?? '').toString(),
        placeId: (json['placeId'] ?? '').toString(),
        label: (json['label'] ?? '').toString(),
        lat: (json['lat'] as num?)?.toDouble() ?? 0,
        lng: (json['lng'] as num?)?.toDouble() ?? 0,
        claimState: (json['claimState'] ?? '').toString(),
      );
}
