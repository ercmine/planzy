import 'dart:math' as math;

import 'map_discovery_models.dart';
import 'perbug_game_models.dart';

class PerbugNodeGenerationContext {
  const PerbugNodeGenerationContext({
    required this.anchorLat,
    required this.anchorLng,
    required this.playerLevel,
    required this.maxNodes,
    required this.minNodeSpacingMeters,
    required this.maxLinkDistanceMeters,
  });

  final double anchorLat;
  final double anchorLng;
  final int playerLevel;
  final int maxNodes;
  final double minNodeSpacingMeters;
  final double maxLinkDistanceMeters;
}

class PerbugNodeWorldSnapshot {
  const PerbugNodeWorldSnapshot({
    required this.nodes,
    required this.connections,
    required this.debug,
  });

  final List<PerbugNode> nodes;
  final Map<String, Set<String>> connections;
  final Map<String, Object> debug;
}

class PerbugNodeWorldEngine {
  const PerbugNodeWorldEngine();

  PerbugNodeWorldSnapshot build({
    required List<MapPin> pins,
    required PerbugNodeGenerationContext context,
    ReverseGeocodeResult? anchorArea,
  }) {
    final debug = <String, Object>{
      'input_candidates': pins.length,
      'anchor': {'lat': context.anchorLat, 'lng': context.anchorLng},
      'min_spacing_meters': context.minNodeSpacingMeters,
      'max_link_distance_meters': context.maxLinkDistanceMeters,
    };

    final candidates = pins
        .where((pin) => pin.name.trim().isNotEmpty)
        .where((pin) => !_isAdministrativeOnly(pin))
        .toList(growable: false);

    final sorted = [...candidates]..sort((a, b) {
      final byScore = _candidateScore(b, context).compareTo(_candidateScore(a, context));
      if (byScore != 0) return byScore;
      return a.canonicalPlaceId.compareTo(b.canonicalPlaceId);
    });

    final nodes = <PerbugNode>[];
    final filteredOut = <String, String>{};
    for (final pin in sorted) {
      if (nodes.length >= context.maxNodes) break;
      final tooClose = nodes.any((existing) {
        final d = haversineMeters(existing.latitude, existing.longitude, pin.latitude, pin.longitude);
        return d < context.minNodeSpacingMeters;
      });
      if (tooClose) {
        filteredOut[pin.canonicalPlaceId] = 'too_close_to_existing_node';
        continue;
      }
      nodes.add(_toNode(pin: pin, context: context, anchorArea: anchorArea));
    }

    final connections = _buildConnections(nodes, context.maxLinkDistanceMeters);
    final reachableCounts = <String, int>{
      for (final node in nodes) node.id: connections[node.id]?.length ?? 0,
    };

    debug.addAll({
      'usable_candidates': candidates.length,
      'selected_nodes': nodes.length,
      'filtered_out': filteredOut.length,
      'reachability_degree': reachableCounts,
      'type_counts': _nodeTypeCounts(nodes),
    });

    return PerbugNodeWorldSnapshot(nodes: nodes, connections: connections, debug: debug);
  }

  Map<String, Set<String>> _buildConnections(List<PerbugNode> nodes, double maxLinkDistanceMeters) {
    final connections = <String, Set<String>>{for (final node in nodes) node.id: <String>{}};

    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        final a = nodes[i];
        final b = nodes[j];
        final d = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
        if (d <= maxLinkDistanceMeters) {
          connections[a.id]!.add(b.id);
          connections[b.id]!.add(a.id);
        }
      }
    }

    for (final node in nodes) {
      final neighbors = connections[node.id]!;
      if (neighbors.isEmpty && nodes.length > 1) {
        final fallback = [...nodes]
          ..removeWhere((n) => n.id == node.id)
          ..sort((a, b) => haversineMeters(node.latitude, node.longitude, a.latitude, a.longitude)
              .compareTo(haversineMeters(node.latitude, node.longitude, b.latitude, b.longitude)));
        final nearest = fallback.first;
        neighbors.add(nearest.id);
        connections[nearest.id]!.add(node.id);
      }
    }

    return connections;
  }

  PerbugNode _toNode({
    required MapPin pin,
    required PerbugNodeGenerationContext context,
    ReverseGeocodeResult? anchorArea,
  }) {
    final type = _deriveType(pin, context: context);
    final rarityScore = _rarityScore(pin, type);
    final idSeed = '${pin.canonicalPlaceId}:${pin.latitude.toStringAsFixed(5)}:${pin.longitude.toStringAsFixed(5)}';

    return PerbugNode(
      id: _stableId(idSeed),
      placeId: pin.canonicalPlaceId,
      label: pin.name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      region: pin.region ?? anchorArea?.region ?? 'Unknown region',
      city: pin.city ?? anchorArea?.city ?? 'Unknown city',
      neighborhood: pin.neighborhood ?? pin.city ?? 'Nearby',
      country: _guessCountry(pin, anchorArea),
      nodeType: type,
      difficulty: _difficulty(pin, type, playerLevel: context.playerLevel),
      state: deriveNodeStateFromPin(pin),
      energyReward: pin.hasReviews ? 4 : 2,
      movementCost: _movementCost(type, pin),
      rarityScore: rarityScore,
      tags: {
        pin.category.toLowerCase(),
        if (pin.hasReviews) 'reviewed',
        if (pin.hasCreatorMedia) 'creator_media',
      },
      metadata: {
        'source': 'geo_nominatim',
        'candidate_score': _candidateScore(pin, context),
        'category': pin.category,
        'rating': pin.rating,
      },
    );
  }

  bool _isAdministrativeOnly(MapPin pin) {
    final c = pin.category.toLowerCase();
    return c.contains('administrative') || c == 'boundary';
  }

  int _candidateScore(MapPin pin, PerbugNodeGenerationContext context) {
    final distance = haversineMeters(context.anchorLat, context.anchorLng, pin.latitude, pin.longitude);
    final distanceScore = math.max(0, 10000 - distance).round();
    final qualityBoost = (pin.rating * 100).round();
    final socialBoost = (pin.hasCreatorMedia ? 35 : 0) + (pin.hasReviews ? 20 : 0);
    return distanceScore + qualityBoost + socialBoost;
  }

  PerbugNodeType _deriveType(MapPin pin, {required PerbugNodeGenerationContext context}) {
    final base = deriveNodeTypeFromPin(pin);
    if (base == PerbugNodeType.rare && context.playerLevel >= 8) return PerbugNodeType.event;
    if (base == PerbugNodeType.mission && pin.rating > 0.93 && context.playerLevel >= 10) return PerbugNodeType.boss;
    return base;
  }

  int _movementCost(PerbugNodeType type, MapPin pin) {
    final base = switch (type) {
      PerbugNodeType.rest => 1,
      PerbugNodeType.shop => 2,
      PerbugNodeType.resource => 2,
      PerbugNodeType.encounter => 3,
      PerbugNodeType.mission => 3,
      PerbugNodeType.event => 4,
      PerbugNodeType.rare => 4,
      PerbugNodeType.boss => 5,
    };
    final ratingTax = pin.rating > 0.9 ? 1 : 0;
    return (base + ratingTax).clamp(1, 7);
  }

  int _difficulty(MapPin pin, PerbugNodeType type, {required int playerLevel}) {
    final base = ((pin.rating * 2).round()).clamp(1, 4);
    final typeMod = switch (type) {
      PerbugNodeType.boss => 3,
      PerbugNodeType.rare => 2,
      PerbugNodeType.event => 2,
      PerbugNodeType.rest => -1,
      _ => 0,
    };
    final levelMod = (playerLevel / 6).floor();
    return (base + typeMod + levelMod).clamp(1, 10);
  }

  double _rarityScore(MapPin pin, PerbugNodeType type) {
    final byType = switch (type) {
      PerbugNodeType.boss => 0.98,
      PerbugNodeType.rare => 0.9,
      PerbugNodeType.event => 0.82,
      PerbugNodeType.shop => 0.35,
      PerbugNodeType.rest => 0.25,
      _ => 0.5,
    };
    return (byType + (pin.rating * 0.2)).clamp(0.0, 1.0);
  }

  String _stableId(String seed) {
    var hash = 2166136261;
    for (final code in seed.codeUnits) {
      hash ^= code;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return 'node_${hash.toRadixString(16)}';
  }

  String _guessCountry(MapPin pin, ReverseGeocodeResult? area) {
    final display = area?.displayName ?? '';
    final parts = display.split(',').map((part) => part.trim()).where((part) => part.isNotEmpty).toList(growable: false);
    if (parts.isNotEmpty) return parts.last;
    return pin.region ?? 'Unknown country';
  }

  Map<String, int> _nodeTypeCounts(List<PerbugNode> nodes) {
    final counts = <String, int>{};
    for (final node in nodes) {
      counts.update(node.nodeType.name, (value) => value + 1, ifAbsent: () => 1);
    }
    return counts;
  }
}
