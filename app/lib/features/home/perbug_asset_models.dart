import 'package:flutter/foundation.dart';

enum OwnershipSource {
  starter,
  earned,
  crafted,
  rewarded,
  event,
  premium,
  importedNft,
  chainMinted,
  marketplaceAcquired,
}

enum AssetClass {
  character,
  item,
  relic,
  cosmetic,
  mapAsset,
  collectible,
}

enum AssetLinkStatus { notLinked, pendingSync, linked, stale, failed }

enum StackBehavior { stackable, uniquePerInstance }

class ExternalAssetReference {
  const ExternalAssetReference({
    required this.chain,
    required this.contractAddress,
    required this.tokenId,
    this.collection,
    this.metadataUri,
    this.lastSyncedAt,
    this.linkStatus = AssetLinkStatus.pendingSync,
  });

  final String chain;
  final String contractAddress;
  final String tokenId;
  final String? collection;
  final String? metadataUri;
  final DateTime? lastSyncedAt;
  final AssetLinkStatus linkStatus;

  String get canonicalReference => '$chain:$contractAddress:$tokenId';

  Map<String, Object?> toJson() => {
        'chain': chain,
        'contractAddress': contractAddress,
        'tokenId': tokenId,
        'collection': collection,
        'metadataUri': metadataUri,
        'lastSyncedAt': lastSyncedAt?.toIso8601String(),
        'linkStatus': linkStatus.name,
      };

  factory ExternalAssetReference.fromJson(Map<String, dynamic> json) {
    return ExternalAssetReference(
      chain: json['chain']?.toString() ?? 'unknown',
      contractAddress: json['contractAddress']?.toString() ?? '',
      tokenId: json['tokenId']?.toString() ?? '',
      collection: json['collection']?.toString(),
      metadataUri: json['metadataUri']?.toString(),
      lastSyncedAt: DateTime.tryParse(json['lastSyncedAt']?.toString() ?? ''),
      linkStatus: AssetLinkStatus.values.firstWhere(
        (status) => status.name == json['linkStatus']?.toString(),
        orElse: () => AssetLinkStatus.pendingSync,
      ),
    );
  }
}

class AssetIdentity {
  const AssetIdentity({
    required this.assetClass,
    required this.templateId,
    required this.instanceId,
    this.variantId,
    this.stackBehavior = StackBehavior.stackable,
  });

  final AssetClass assetClass;
  final String templateId;
  final String instanceId;
  final String? variantId;
  final StackBehavior stackBehavior;

  bool get isUnique => stackBehavior == StackBehavior.uniquePerInstance;

  Map<String, Object?> toJson() => {
        'assetClass': assetClass.name,
        'templateId': templateId,
        'instanceId': instanceId,
        'variantId': variantId,
        'stackBehavior': stackBehavior.name,
      };

  factory AssetIdentity.fromJson(Map<String, dynamic> json) {
    return AssetIdentity(
      assetClass: AssetClass.values.firstWhere(
        (value) => value.name == json['assetClass']?.toString(),
        orElse: () => AssetClass.item,
      ),
      templateId: json['templateId']?.toString() ?? '',
      instanceId: json['instanceId']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      stackBehavior: StackBehavior.values.firstWhere(
        (value) => value.name == json['stackBehavior']?.toString(),
        orElse: () => StackBehavior.stackable,
      ),
    );
  }
}

class AssetProvenance {
  const AssetProvenance({
    required this.source,
    this.acquiredAt,
    this.note,
    this.externalReference,
  });

  final OwnershipSource source;
  final DateTime? acquiredAt;
  final String? note;
  final ExternalAssetReference? externalReference;

  bool get isChainBacked => externalReference != null;

  Map<String, Object?> toJson() => {
        'source': source.name,
        'acquiredAt': acquiredAt?.toIso8601String(),
        'note': note,
        'externalReference': externalReference?.toJson(),
      };

  factory AssetProvenance.fromJson(Map<String, dynamic> json) {
    return AssetProvenance(
      source: OwnershipSource.values.firstWhere(
        (value) => value.name == json['source']?.toString(),
        orElse: () => OwnershipSource.earned,
      ),
      acquiredAt: DateTime.tryParse(json['acquiredAt']?.toString() ?? ''),
      note: json['note']?.toString(),
      externalReference: (json['externalReference'] as Map?) == null
          ? null
          : ExternalAssetReference.fromJson((json['externalReference'] as Map).cast<String, dynamic>()),
    );
  }
}

class OwnedAsset {
  const OwnedAsset({
    required this.identity,
    required this.name,
    required this.provenance,
    this.quantity = 1,
    this.gameplayPower = 0,
    this.cosmeticPayload = const <String, Object?>{},
    this.tags = const <String>{},
  });

  final AssetIdentity identity;
  final String name;
  final AssetProvenance provenance;
  final int quantity;
  final int gameplayPower;
  final Map<String, Object?> cosmeticPayload;
  final Set<String> tags;

  bool get isNftBacked => provenance.isChainBacked;

  bool canStackWith(OwnedAsset other) {
    if (identity.isUnique || other.identity.isUnique) return false;
    if (isNftBacked || other.isNftBacked) return false;
    return identity.templateId == other.identity.templateId &&
        identity.assetClass == other.identity.assetClass &&
        identity.variantId == other.identity.variantId;
  }

  OwnedAsset merge(OwnedAsset other) {
    if (!canStackWith(other)) {
      throw StateError('Cannot stack incompatible assets ${identity.instanceId} and ${other.identity.instanceId}');
    }
    return OwnedAsset(
      identity: identity,
      name: name,
      provenance: provenance,
      quantity: quantity + other.quantity,
      gameplayPower: gameplayPower,
      cosmeticPayload: cosmeticPayload,
      tags: tags,
    );
  }

  Map<String, Object?> toJson() => {
        'identity': identity.toJson(),
        'name': name,
        'provenance': provenance.toJson(),
        'quantity': quantity,
        'gameplayPower': gameplayPower,
        'cosmeticPayload': cosmeticPayload,
        'tags': tags.toList(growable: false),
      };

  factory OwnedAsset.fromJson(Map<String, dynamic> json) {
    return OwnedAsset(
      identity: AssetIdentity.fromJson((json['identity'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{}),
      name: json['name']?.toString() ?? '',
      provenance: AssetProvenance.fromJson((json['provenance'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{}),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      gameplayPower: (json['gameplayPower'] as num?)?.toInt() ?? 0,
      cosmeticPayload: (json['cosmeticPayload'] as Map?)?.cast<String, Object?>() ?? const <String, Object?>{},
      tags: ((json['tags'] as List?) ?? const []).map((tag) => tag.toString()).toSet(),
    );
  }
}

class AssetInventory {
  const AssetInventory({required this.entries});

  final List<OwnedAsset> entries;

  static const empty = AssetInventory(entries: []);

  List<OwnedAsset> byClass(AssetClass assetClass) => entries.where((asset) => asset.identity.assetClass == assetClass).toList(growable: false);

  AssetInventory add(OwnedAsset asset) {
    final next = <OwnedAsset>[];
    var merged = false;
    for (final current in entries) {
      if (!merged && current.canStackWith(asset)) {
        next.add(current.merge(asset));
        merged = true;
      } else {
        next.add(current);
      }
    }
    if (!merged) next.add(asset);
    return AssetInventory(entries: next);
  }

  Map<String, Object?> toJson() => {
        'entries': entries.map((entry) => entry.toJson()).toList(growable: false),
      };

  factory AssetInventory.fromJson(Map<String, dynamic> json) {
    final raw = (json['entries'] as List?) ?? const [];
    return AssetInventory(
      entries: raw
          .whereType<Map>()
          .map((row) => OwnedAsset.fromJson(row.cast<String, dynamic>()))
          .toList(growable: false),
    );
  }
}

class MarketplaceListing {
  const MarketplaceListing({
    required this.listingId,
    required this.asset,
    required this.price,
    required this.currency,
    required this.sellerId,
  });

  final String listingId;
  final OwnedAsset asset;
  final num price;
  final String currency;
  final String sellerId;

  bool get isChainBackedListing => asset.isNftBacked;
}

class MapAssetAttachment {
  const MapAssetAttachment({
    required this.nodeId,
    required this.asset,
    this.decorative = true,
  });

  final String nodeId;
  final OwnedAsset asset;
  final bool decorative;
}

class SquadAssetBinding {
  const SquadAssetBinding({
    required this.unitId,
    required this.assetIdentity,
    required this.provenance,
    this.cosmeticOverrides = const <String, Object?>{},
  });

  final String unitId;
  final AssetIdentity assetIdentity;
  final AssetProvenance provenance;
  final Map<String, Object?> cosmeticOverrides;
}

class WalletLinkState {
  const WalletLinkState({
    required this.isConnected,
    this.walletAddress,
    this.lastSyncStatus = AssetLinkStatus.notLinked,
  });

  final bool isConnected;
  final String? walletAddress;
  final AssetLinkStatus lastSyncStatus;

  bool get canImportAssets => isConnected && walletAddress != null;

  static const disconnected = WalletLinkState(isConnected: false);
}

@visibleForTesting
OwnedAsset buildStarterRelic({required String instanceId}) {
  return OwnedAsset(
    identity: AssetIdentity(
      assetClass: AssetClass.relic,
      templateId: 'starter-relic-signal-compass',
      instanceId: instanceId,
      stackBehavior: StackBehavior.uniquePerInstance,
    ),
    name: 'Signal Compass',
    provenance: const AssetProvenance(source: OwnershipSource.starter, note: 'Starter loadout relic'),
    gameplayPower: 0,
    cosmeticPayload: const {'badge': 'starter'},
    tags: const {'progression-safe', 'displayable'},
  );
}
