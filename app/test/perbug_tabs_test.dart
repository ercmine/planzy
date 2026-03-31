import 'package:perbug/features/perbug/chain/perbug_chain_providers.dart';
import 'package:perbug/features/perbug/models/perbug_models.dart';
import 'package:perbug/features/perbug/perbug_providers.dart';
import 'package:perbug/features/home/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const wallet = '0x1111111111111111111111111111111111111111';
  final ownedTree = PerbugTree(
    id: 'tree-001',
    name: 'Perbug Tree 1001',
    placeName: 'Oracle Meadow, SF',
    locationLabel: 'Oracle Meadow, SF',
    latitude: 37.7,
    longitude: -122.4,
    founderHandle: wallet,
    ownerHandle: wallet,
    growthLevel: 3,
    contributionCount: 8,
    rarity: 'Rare',
    category: 'Location',
    saleStatus: TreeSaleStatus.notListed,
    claimState: TreeClaimState.planted,
    lifecycleState: TreeLifecycleState.planted,
    isPortable: false,
    lastWateredAt: DateTime.now().subtract(const Duration(hours: 8)),
    nextWateringAvailableAt: DateTime.now().subtract(const Duration(minutes: 1)),
    waterCooldownSeconds: 21600,
  );

  testWidgets('bottom nav is tree-centric and renders map/tend/market/my trees/creator', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          walletAddressProvider.overrideWith((ref) => wallet),
          ownedTreesProvider.overrideWith((ref) async => [ownedTree]),
          marketplaceTreesProvider.overrideWith((ref) async => [ownedTree.copyWithForTest(saleStatus: TreeSaleStatus.listed, lifecycleState: TreeLifecycleState.listed, priceEth: 0.5)]),
        ],
        child: const MaterialApp(home: HomePage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Map'), findsWidgets);
    expect(find.text('Creator'), findsWidgets);
    expect(find.text('Tend'), findsWidgets);

    await tester.tap(find.text('Tend').last);
    await tester.pumpAndSettle();
    expect(find.text('Water now'), findsOneWidget);
    expect(find.text('Perbug Tree 1001'), findsOneWidget);

    await tester.tap(find.text('My Trees').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('Perbug Tree 1001'), findsOneWidget);

    await tester.tap(find.text('Marketplace').last);
    await tester.pumpAndSettle();
    expect(find.text('Buy from anywhere'), findsOneWidget);
  });

  testWidgets('tactical HUD toggle hides and restores RPG controls', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: HomePage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Node details'), findsOneWidget);
    expect(find.byTooltip('Hide tactical HUD'), findsOneWidget);

    await tester.tap(find.byTooltip('Hide tactical HUD'));
    await tester.pumpAndSettle();

    expect(find.text('Node details'), findsNothing);
    expect(find.text('Tactical RPG HUD: Off'), findsOneWidget);

    await tester.tap(find.byTooltip('Show tactical HUD'));
    await tester.pumpAndSettle();

    expect(find.text('Node details'), findsOneWidget);
    expect(find.text('Tactical RPG HUD: On'), findsOneWidget);
  });
}

extension on PerbugTree {
  PerbugTree copyWithForTest({
    TreeSaleStatus? saleStatus,
    TreeLifecycleState? lifecycleState,
    double? priceEth,
  }) {
    return PerbugTree(
      id: id,
      name: name,
      placeName: placeName,
      locationLabel: locationLabel,
      latitude: latitude,
      longitude: longitude,
      founderHandle: founderHandle,
      ownerHandle: ownerHandle,
      growthLevel: growthLevel,
      contributionCount: contributionCount,
      rarity: rarity,
      category: category,
      saleStatus: saleStatus ?? this.saleStatus,
      claimState: claimState,
      lifecycleState: lifecycleState ?? this.lifecycleState,
      isPortable: isPortable,
      currentSpotId: currentSpotId,
      priceEth: priceEth ?? this.priceEth,
      pricePerbug: pricePerbug,
      treeImageUrl: treeImageUrl,
      digUpTxHash: digUpTxHash,
      lastWateredAt: lastWateredAt,
      nextWateringAvailableAt: nextWateringAvailableAt,
      waterCooldownSeconds: waterCooldownSeconds,
    );
  }
}
