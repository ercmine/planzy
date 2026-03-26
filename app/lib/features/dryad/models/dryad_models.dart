import 'package:flutter/foundation.dart';

enum TreeSaleStatus { notListed, listed, sold }

enum PlaceClaimStatus { planted, unclaimed }

@immutable
class DryadTree {
  const DryadTree({
    required this.id,
    required this.name,
    required this.placeName,
    required this.locationLabel,
    required this.founderHandle,
    required this.ownerHandle,
    required this.growthLevel,
    required this.contributionCount,
    required this.rarity,
    required this.category,
    required this.saleStatus,
    this.priceEth,
    this.priceDryad,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String placeName;
  final String locationLabel;
  final String founderHandle;
  final String ownerHandle;
  final int growthLevel;
  final int contributionCount;
  final String rarity;
  final String category;
  final TreeSaleStatus saleStatus;
  final double? priceEth;
  final double? priceDryad;
  final String? imageUrl;

  bool get isListed => saleStatus == TreeSaleStatus.listed;
}

@immutable
class UnclaimedSpot {
  const UnclaimedSpot({
    required this.id,
    required this.placeName,
    required this.distanceMeters,
    required this.locationLabel,
    required this.eligibilityHint,
  });

  final String id;
  final String placeName;
  final int distanceMeters;
  final String locationLabel;
  final String eligibilityHint;
}

@immutable
class WalletAsset {
  const WalletAsset({required this.symbol, required this.balance, required this.fiatValue});

  final String symbol;
  final String balance;
  final String fiatValue;
}
