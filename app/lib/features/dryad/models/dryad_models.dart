import 'package:flutter/foundation.dart';

enum TreeSaleStatus { notListed, listed, sold }

enum TreeClaimState { claimable, claimed, planted, unavailable }

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
    this.priceEth,
    this.priceDryad,
    this.treeImageUrl,
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
  final double? priceEth;
  final double? priceDryad;
  final String? treeImageUrl;

  bool get isListed => saleStatus == TreeSaleStatus.listed;

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
      priceEth: (json['priceEth'] as num?)?.toDouble(),
      priceDryad: (json['priceDryad'] as num?)?.toDouble(),
      treeImageUrl: json['treeImageUrl']?.toString(),
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
