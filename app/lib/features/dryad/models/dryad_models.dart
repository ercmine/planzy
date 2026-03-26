import 'package:flutter/foundation.dart';

enum TreeSaleStatus { notListed, listed, sold }

enum TreeClaimState { claimable, claimed, planted, unavailable }

enum TreeLifecycleState { planted, listed, sold, dugUp, readyToReplant, replanted }

@immutable
class DryadTree {
  const DryadTree({
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
    this.priceDryad,
    this.treeImageUrl,
    this.digUpTxHash,
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
  final double? priceDryad;
  final String? treeImageUrl;
  final String? digUpTxHash;

  bool get isListed => saleStatus == TreeSaleStatus.listed;
  bool get readyToReplant => isPortable || lifecycleState == TreeLifecycleState.readyToReplant;

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

  factory DryadTree.fromJson(Map<String, dynamic> json) {
    TreeSaleStatus sale;
    switch ((json['saleStatus'] ?? '').toString()) {
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
    switch ((json['claimState'] ?? '').toString()) {
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
    switch ((json['lifecycleState'] ?? '').toString()) {
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

    return DryadTree(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      placeName: (json['placeName'] ?? '').toString(),
      locationLabel: (json['locationLabel'] ?? '').toString(),
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      founderHandle: (json['founderHandle'] ?? '').toString(),
      ownerHandle: (json['ownerHandle'] ?? '').toString(),
      growthLevel: (json['growthLevel'] as num?)?.toInt() ?? 0,
      contributionCount: (json['contributionCount'] as num?)?.toInt() ?? 0,
      rarity: (json['rarity'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      saleStatus: sale,
      claimState: claim,
      lifecycleState: lifecycle,
      isPortable: json['isPortable'] == true,
      currentSpotId: json['currentSpotId']?.toString(),
      priceEth: (json['priceEth'] as num?)?.toDouble(),
      priceDryad: (json['priceDryad'] as num?)?.toDouble(),
      treeImageUrl: json['treeImageUrl']?.toString(),
      digUpTxHash: json['digUpTxHash']?.toString(),
    );
  }
}

@immutable
class WalletAsset {
  const WalletAsset({required this.symbol, required this.balance, required this.fiatValue});

  final String symbol;
  final String balance;
  final String fiatValue;
}

@immutable
class DryadSpot {
  const DryadSpot({
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

  factory DryadSpot.fromJson(Map<String, dynamic> json) => DryadSpot(
        spotId: (json['spotId'] ?? '').toString(),
        placeId: (json['placeId'] ?? '').toString(),
        label: (json['label'] ?? '').toString(),
        lat: (json['lat'] as num?)?.toDouble() ?? 0,
        lng: (json['lng'] as num?)?.toDouble() ?? 0,
        claimState: (json['claimState'] ?? '').toString(),
      );
}
