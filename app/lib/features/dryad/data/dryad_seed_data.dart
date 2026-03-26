import '../models/dryad_models.dart';

class DryadSeedData {
  static const trees = <DryadTree>[
    DryadTree(
      id: 'tree-001',
      name: 'Oak of Mission Creek',
      placeName: 'Mission Creek Boardwalk',
      locationLabel: 'San Francisco, CA',
      founderHandle: '@maya.root',
      ownerHandle: '@grove.capital',
      growthLevel: 8,
      contributionCount: 42,
      rarity: 'Epic',
      category: 'Waterfront',
      saleStatus: TreeSaleStatus.listed,
      priceEth: 0.38,
      priceDryad: 5250,
    ),
    DryadTree(
      id: 'tree-002',
      name: 'Redwood Signal',
      placeName: 'Dolores Outlook',
      locationLabel: 'San Francisco, CA',
      founderHandle: '@jon.seed',
      ownerHandle: '@jon.seed',
      growthLevel: 4,
      contributionCount: 11,
      rarity: 'Rare',
      category: 'Urban Viewpoint',
      saleStatus: TreeSaleStatus.notListed,
    ),
    DryadTree(
      id: 'tree-003',
      name: 'Cedar of Congress Ave',
      placeName: 'South Congress Plaza',
      locationLabel: 'Austin, TX',
      founderHandle: '@lia.planter',
      ownerHandle: '@terra.dao',
      growthLevel: 6,
      contributionCount: 23,
      rarity: 'Legendary',
      category: 'Downtown',
      saleStatus: TreeSaleStatus.listed,
      priceEth: 0.74,
      priceDryad: 10500,
    ),
  ];

  static const unclaimedSpots = <UnclaimedSpot>[
    UnclaimedSpot(
      id: 'spot-110',
      placeName: 'Embarcadero East Plaza',
      distanceMeters: 82,
      locationLabel: 'SF Bay Trail',
      eligibilityHint: 'Walk within 100m to plant first.',
    ),
    UnclaimedSpot(
      id: 'spot-111',
      placeName: 'Riverside Pocket Park',
      distanceMeters: 190,
      locationLabel: 'Lady Bird Lake',
      eligibilityHint: 'Verified GPS + wallet required.',
    ),
  ];

  static const walletAssets = <WalletAsset>[
    WalletAsset(symbol: 'DRYAD', balance: '18,440.20', fiatValue: '\$7,560.48'),
    WalletAsset(symbol: 'ETH', balance: '2.084', fiatValue: '\$7,111.23'),
    WalletAsset(symbol: 'USDC', balance: '945.31', fiatValue: '\$945.31'),
  ];
}
