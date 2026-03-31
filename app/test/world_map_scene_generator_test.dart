import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/home/world/world_map_scene_generator.dart';
import 'package:perbug/features/home/world/world_map_scene_models.dart';

void main() {
  test('generates coherent chunked scene data in demo mode', () {
    const generator = WorldMapSceneGenerator();
    final scene = generator.generate(
      location: null,
      demoAnchor: const GeoCoordinate(lat: 30.2672, lng: -97.7431),
      seed: 42,
      radius: 1,
    );

    expect(scene.isDemoMode, isTrue);
    expect(scene.chunks.length, 9);
    expect(scene.nodes.length, greaterThan(40));
    expect(scene.routes.length, greaterThan(40));
    expect(scene.districts, isNotEmpty);
  });
}
