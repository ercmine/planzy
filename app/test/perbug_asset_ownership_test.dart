import 'dart:convert';

import 'package:perbug/features/home/perbug_asset_models.dart';
import 'package:perbug/features/home/perbug_economy_models.dart';
import 'package:perbug/features/home/perbug_game_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('starter squad remains fully playable without NFT linkage', () {
    final starter = SquadState.starter();

    expect(starter.isEncounterReady, isTrue);
    expect(starter.activeUnits, isNotEmpty);
    expect(starter.activeUnits.every((unit) => unit.isChainBacked == false), isTrue);
    expect(starter.activeUnits.every((unit) => unit.resolvedProvenance.source == OwnershipSource.starter || unit.resolvedProvenance.source == OwnershipSource.earned), isTrue);
  });

  test('asset inventory supports stacked normal assets plus unique NFT assets', () {
    final stackableOre = OwnedAsset(
      identity: const AssetIdentity(
        assetClass: AssetClass.item,
        templateId: 'ore_fragment',
        instanceId: 'ore-stack-a',
        stackBehavior: StackBehavior.stackable,
      ),
      name: 'Ore Fragment',
      provenance: const AssetProvenance(source: OwnershipSource.earned),
      quantity: 3,
    );

    final moreOre = OwnedAsset(
      identity: const AssetIdentity(
        assetClass: AssetClass.item,
        templateId: 'ore_fragment',
        instanceId: 'ore-stack-b',
        stackBehavior: StackBehavior.stackable,
      ),
      name: 'Ore Fragment',
      provenance: const AssetProvenance(source: OwnershipSource.rewarded),
      quantity: 2,
    );

    final nftRelic = OwnedAsset(
      identity: const AssetIdentity(
        assetClass: AssetClass.relic,
        templateId: 'ancient_relic',
        instanceId: 'nft-relic-1',
        stackBehavior: StackBehavior.uniquePerInstance,
      ),
      name: 'Ancient Relic',
      provenance: AssetProvenance(
        source: OwnershipSource.importedNft,
        externalReference: const ExternalAssetReference(
          chain: 'polygon',
          contractAddress: '0xABC',
          tokenId: '42',
        ),
      ),
      quantity: 1,
    );

    final inventory = AssetInventory.empty.add(stackableOre).add(moreOre).add(nftRelic);

    expect(inventory.entries.length, 2);
    expect(inventory.entries.firstWhere((entry) => entry.identity.templateId == 'ore_fragment').quantity, 5);
    expect(inventory.entries.firstWhere((entry) => entry.identity.templateId == 'ancient_relic').isNftBacked, isTrue);
  });

  test('perbug economy serialization preserves wallet optionality and owned assets', () {
    final economy = PerbugEconomyState.initial().copyWith(
      ownedAssets: AssetInventory.empty.add(buildStarterRelic(instanceId: 'starter-relic-1')),
      walletLink: const WalletLinkState(isConnected: false),
    );

    final encoded = economy.toJson();
    final restored = PerbugEconomyState.fromEncoded(const JsonEncoder().convert(encoded));

    expect(restored.walletLink.isConnected, isFalse);
    expect(restored.ownedAssets.entries.single.identity.assetClass, AssetClass.relic);
    expect(restored.ownedAssets.entries.single.provenance.source, OwnershipSource.starter);
  });

  test('marketplace listings can represent both game-native and NFT-backed assets', () {
    final nativeListing = MarketplaceListing(
      listingId: 'listing-native-1',
      sellerId: 'player-1',
      price: 180,
      currency: 'PERBUG',
      asset: OwnedAsset(
        identity: const AssetIdentity(
          assetClass: AssetClass.cosmetic,
          templateId: 'frame-amber',
          instanceId: 'frame-amber-stack-a',
          stackBehavior: StackBehavior.stackable,
        ),
        name: 'Amber Frame',
        provenance: const AssetProvenance(source: OwnershipSource.event),
        quantity: 1,
      ),
    );

    final nftListing = MarketplaceListing(
      listingId: 'listing-nft-1',
      sellerId: 'player-2',
      price: 0.25,
      currency: 'MATIC',
      asset: OwnedAsset(
        identity: const AssetIdentity(
          assetClass: AssetClass.mapAsset,
          templateId: 'landmark-obelisk',
          instanceId: 'obelisk-1',
          stackBehavior: StackBehavior.uniquePerInstance,
        ),
        name: 'Founders Obelisk',
        provenance: AssetProvenance(
          source: OwnershipSource.chainMinted,
          externalReference: const ExternalAssetReference(
            chain: 'polygon',
            contractAddress: '0xDEF',
            tokenId: '77',
          ),
        ),
      ),
    );

    expect(nativeListing.isChainBackedListing, isFalse);
    expect(nftListing.isChainBackedListing, isTrue);
  });
}
