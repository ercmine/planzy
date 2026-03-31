import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../core/location/location_models.dart';
import '../perbug_game_models.dart';
import 'world_map_scene_generator.dart';
import 'world_map_scene_models.dart';

@immutable
class WorldMapSceneState {
  const WorldMapSceneState({
    required this.data,
    required this.camera,
    required this.selectedNodeId,
    required this.focusedNodeId,
    required this.showDebug,
    required this.lowSpecMode,
  });

  final WorldMapSceneData data;
  final WorldCameraState camera;
  final String? selectedNodeId;
  final String? focusedNodeId;
  final bool showDebug;
  final bool lowSpecMode;

  WorldMapNode? get selectedNode => selectedNodeId == null ? null : data.nodeById[selectedNodeId!];
  WorldMapNode? get focusedNode => focusedNodeId == null ? null : data.nodeById[focusedNodeId!];

  WorldMapSceneState copyWith({
    WorldMapSceneData? data,
    WorldCameraState? camera,
    String? selectedNodeId,
    String? focusedNodeId,
    bool clearSelection = false,
    bool clearFocus = false,
    bool? showDebug,
    bool? lowSpecMode,
  }) {
    return WorldMapSceneState(
      data: data ?? this.data,
      camera: camera ?? this.camera,
      selectedNodeId: clearSelection ? null : (selectedNodeId ?? this.selectedNodeId),
      focusedNodeId: clearFocus ? null : (focusedNodeId ?? this.focusedNodeId),
      showDebug: showDebug ?? this.showDebug,
      lowSpecMode: lowSpecMode ?? this.lowSpecMode,
    );
  }
}

class WorldMapSceneController extends ValueNotifier<WorldMapSceneState> {
  WorldMapSceneController({required WorldMapSceneGenerator generator})
      : _generator = generator,
        super(
          WorldMapSceneState(
            data: generator.generate(
              location: null,
              demoAnchor: const GeoCoordinate(lat: 30.2672, lng: -97.7431),
              seed: 7,
            ),
            camera: const WorldCameraState(center: WorldCoordinate(x: 0.5, y: 0.5), zoom: 1.4),
            selectedNodeId: null,
            focusedNodeId: null,
            showDebug: kDebugMode,
            lowSpecMode: false,
          ),
        );

  final WorldMapSceneGenerator _generator;

  void regenerate({required AppLocation? location, required bool demoMode, int seed = 7}) {
    final next = _generator.generate(
      location: demoMode ? null : location,
      demoAnchor: const GeoCoordinate(lat: 30.2672, lng: -97.7431),
      seed: seed,
    );
    value = value.copyWith(data: next, camera: const WorldCameraState(center: WorldCoordinate(x: 0.5, y: 0.5), zoom: 1.4), clearSelection: true, clearFocus: true);
  }

  void pan(Offset delta, Size size) {
    value = value.copyWith(camera: value.camera.pan(delta, size));
  }

  void zoom(double factor) {
    value = value.copyWith(camera: value.camera.scale(factor));
  }

  void selectNode(String? nodeId) {
    value = value.copyWith(selectedNodeId: nodeId, focusedNodeId: nodeId);
  }

  void focusNode(String? nodeId) {
    value = value.copyWith(focusedNodeId: nodeId);
  }

  void toggleDebug() => value = value.copyWith(showDebug: !value.showDebug);

  void setLowSpecMode(bool enabled) => value = value.copyWith(lowSpecMode: enabled);

  Map<String, Set<String>> asGraph() {
    final graph = <String, Set<String>>{};
    for (final route in value.data.routes) {
      graph.putIfAbsent(route.fromNodeId, () => <String>{}).add(route.toNodeId);
      graph.putIfAbsent(route.toNodeId, () => <String>{}).add(route.fromNodeId);
    }
    return graph;
  }

  List<PerbugNode> asPerbugNodes() {
    return value.data.nodes
        .map(
          (node) => PerbugNode(
            id: node.id,
            placeId: node.id,
            label: node.label,
            latitude: node.geo.lat,
            longitude: node.geo.lng,
            region: node.regionId,
            city: node.regionId,
            neighborhood: node.districtId,
            country: value.data.isDemoMode ? 'Demo' : 'Live',
            nodeType: node.perbugType,
            difficulty: node.difficulty,
            state: PerbugNodeState.available,
            energyReward: 2,
            movementCost: node.energyCost,
            rarityScore: node.rarity,
            tags: {node.category.name, node.districtId},
            metadata: {'desc': node.description},
          ),
        )
        .toList(growable: false);
  }
}
