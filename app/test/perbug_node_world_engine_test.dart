import 'package:perbug/features/home/map_discovery_models.dart';
import 'package:perbug/features/home/perbug_game_models.dart';
import 'package:perbug/features/home/perbug_node_world_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const engine = PerbugNodeWorldEngine();

  const pins = [
    MapPin(
      canonicalPlaceId: 'cp_coffee',
      name: 'North Loop Coffee',
      category: 'coffee-shop',
      latitude: 30.2701,
      longitude: -97.7422,
      rating: 0.91,
      neighborhood: 'North Loop',
      city: 'Austin',
      region: 'Texas',
      hasCreatorMedia: true,
      hasReviews: true,
    ),
    MapPin(
      canonicalPlaceId: 'cp_park',
      name: 'Waterfront Park',
      category: 'park',
      latitude: 30.2711,
      longitude: -97.7415,
      rating: 0.8,
      neighborhood: 'Waterfront',
      city: 'Austin',
      region: 'Texas',
      hasReviews: true,
    ),
    MapPin(
      canonicalPlaceId: 'cp_shop',
      name: 'Market Arcade',
      category: 'market',
      latitude: 30.2721,
      longitude: -97.7430,
      rating: 0.79,
      neighborhood: 'Downtown',
      city: 'Austin',
      region: 'Texas',
    ),
  ];

  test('generates deterministic node ids and graph links from same inputs', () {
    const context = PerbugNodeGenerationContext(
      anchorLat: 30.2672,
      anchorLng: -97.7431,
      playerLevel: 5,
      maxNodes: 12,
      minNodeSpacingMeters: 80,
      maxLinkDistanceMeters: 1300,
    );
    final first = engine.build(pins: pins, context: context, anchorArea: const ReverseGeocodeResult(displayName: 'Austin, Texas, United States'));
    final second = engine.build(pins: pins, context: context, anchorArea: const ReverseGeocodeResult(displayName: 'Austin, Texas, United States'));

    expect(first.nodes.map((n) => n.id).toList(), equals(second.nodes.map((n) => n.id).toList()));
    expect(first.connections, equals(second.connections));
    expect(first.debug['selected_nodes'], 3);
  });

  test('assigns gameplay node types with region metadata', () {
    const context = PerbugNodeGenerationContext(
      anchorLat: 30.2672,
      anchorLng: -97.7431,
      playerLevel: 4,
      maxNodes: 8,
      minNodeSpacingMeters: 80,
      maxLinkDistanceMeters: 1200,
    );
    final world = engine.build(pins: pins, context: context, anchorArea: const ReverseGeocodeResult(displayName: 'Austin, Texas, United States'));

    expect(world.nodes, isNotEmpty);
    expect(world.nodes.any((n) => n.nodeType == PerbugNodeType.resource), isTrue);
    expect(world.nodes.any((n) => n.nodeType == PerbugNodeType.shop), isTrue);
    expect(world.nodes.every((n) => n.city.isNotEmpty && n.region.isNotEmpty && n.country.isNotEmpty), isTrue);
  });

  test('filters overly-dense candidates and avoids duplicate spacing', () {
    final densePins = List.generate(
      12,
      (index) => MapPin(
        canonicalPlaceId: 'cp_dense_$index',
        name: 'Dense $index',
        category: 'cafe',
        latitude: 30.27 + (index * 0.00001),
        longitude: -97.74 - (index * 0.00001),
        rating: 0.5,
      ),
    );

    const context = PerbugNodeGenerationContext(
      anchorLat: 30.27,
      anchorLng: -97.74,
      playerLevel: 2,
      maxNodes: 12,
      minNodeSpacingMeters: 160,
      maxLinkDistanceMeters: 1200,
    );
    final world = engine.build(pins: densePins, context: context);

    expect(world.nodes.length, lessThan(12));
    expect((world.debug['filtered_out'] as int), greaterThan(0));
  });
}
