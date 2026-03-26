import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/core/location/location_models.dart';
import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/map_discovery_widgets.dart';
import 'package:dryad/features/home/map_game_world.dart';
import 'package:dryad/features/home/map_game_world_widgets.dart';

void main() {
  const pins = [
    MapPin(
      canonicalPlaceId: 'cp_coffee',
      name: 'North Loop Coffee',
      category: 'coffee-shop',
      latitude: 30.2701,
      longitude: -97.7422,
      rating: 0.91,
      neighborhood: 'North Loop',
      hasCreatorMedia: true,
      hasReviews: true,
      reviewCount: 12,
      creatorVideoCount: 2,
    ),
    MapPin(
      canonicalPlaceId: 'cp_park',
      name: 'Waterfront Park',
      category: 'park',
      latitude: 30.2711,
      longitude: -97.7415,
      rating: 0.8,
      neighborhood: 'Waterfront',
      hasReviews: true,
      reviewCount: 5,
    ),
  ];

  test('builds place-linked collectibles and district zones', () {
    final world = const MapWorldEngine().build(
      pins: pins,
      viewport: const MapViewport(centerLat: 30.27, centerLng: -97.74, zoom: 14),
      location: const AppLocation(lat: 30.2701, lng: -97.7422),
    );

    expect(world.collectibles, isNotEmpty);
    expect(world.collectibles.first.placeId, 'cp_coffee');
    expect(world.collectibles.first.source, contains('canonical place'));
    expect(world.districts.map((zone) => zone.name), contains('North Loop'));
  });

  test('dense areas suppress item counts and anti-abuse blocks duplicate place collection', () {
    final densePins = List.generate(
      12,
      (index) => MapPin(
        canonicalPlaceId: 'cp_$index',
        name: 'Place $index',
        category: index.isEven ? 'nightlife' : 'coffee-shop',
        latitude: 30.27 + (index * 0.0001),
        longitude: -97.74 - (index * 0.0001),
        rating: 0.75,
        neighborhood: 'Downtown',
        reviewCount: index,
      ),
    );
    final world = const MapWorldEngine().build(
      pins: densePins,
      viewport: const MapViewport(centerLat: 30.27, centerLng: -97.74, zoom: 12),
    );

    expect(world.collectibles.length, lessThanOrEqualTo(5));
    expect(const MapWorldEngine().canCollect(item: world.collectibles.first, recentlyCollectedPlaceIds: {world.collectibles.first.placeId}), isFalse);
  });

  testWidgets('inventory sheet renders collectibles and player unlock state', (tester) async {
    final world = const MapWorldEngine().build(
      pins: pins,
      viewport: const MapViewport(centerLat: 30.27, centerLng: -97.74, zoom: 14),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MapWorldInventorySheet(world: world),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Explorer inventory'), findsOneWidget);
    expect(find.textContaining('canonical places'), findsOneWidget);
    expect(find.textContaining('North Loop'), findsWidgets);
  });

  testWidgets('player avatar marker renders prestige ring asset', (tester) async {
    const loadout = PlayerLoadout(
      title: 'Scene Vanguard',
      level: 12,
      archetype: PlayerArchetype.creator,
      bodyColor: Colors.orange,
      auraColor: Colors.amber,
      accentColor: Colors.deepOrange,
      ringAsset: 'assets/game_world/player/player_ring_prestige.svg',
      trailLabel: 'Creator signal',
      unlockedCosmetics: ['Halo'],
    );

    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Center(child: PlayerAvatarMarker(loadout: loadout)))));
    await tester.pumpAndSettle();

    expect(find.text('Creator signal'), findsOneWidget);
    expect(find.byType(Stack), findsWidgets);
  });

  testWidgets('district legend cards are tappable for exploration actions', (tester) async {
    final world = const MapWorldEngine().build(
      pins: const [],
      viewport: const MapViewport(centerLat: 30.27, centerLng: -97.74, zoom: 14),
    );
    DistrictZone? selected;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DistrictLegendCard(
            world: world,
            onSelectDistrict: (zone) => selected = zone,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Discovery Field'));
    await tester.pumpAndSettle();

    expect(selected?.scene, 'Open exploration');
  });

  testWidgets('collapsible overlay toggles between expanded and collapsed content', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CollapsibleMapOverlay(
            title: 'Discovery controls',
            isCollapsed: false,
            onToggle: () {},
            child: const Text('Expanded content'),
            collapsedChild: const Text('Collapsed summary'),
          ),
        ),
      ),
    );

    expect(find.text('Expanded content'), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CollapsibleMapOverlay(
            title: 'Discovery controls',
            isCollapsed: true,
            onToggle: () {},
            child: const Text('Expanded content'),
            collapsedChild: const Text('Collapsed summary'),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Collapsed summary'), findsOneWidget);
  });
}
