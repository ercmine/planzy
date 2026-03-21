import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/location/location_models.dart';
import 'map_discovery_models.dart';

enum CollectibleRarity { common, uncommon, rare, epic }

enum PlayerArchetype { explorer, creator }

class DistrictZone {
  const DistrictZone({
    required this.id,
    required this.name,
    required this.centerLat,
    required this.centerLng,
    required this.radiusMeters,
    required this.color,
    required this.energy,
    required this.scene,
    required this.completion,
  });

  final String id;
  final String name;
  final double centerLat;
  final double centerLng;
  final double radiusMeters;
  final Color color;
  final double energy;
  final String scene;
  final double completion;
}

class CollectibleItem {
  const CollectibleItem({
    required this.id,
    required this.placeId,
    required this.placeName,
    required this.title,
    required this.family,
    required this.rarity,
    required this.assetPath,
    required this.latitude,
    required this.longitude,
    required this.district,
    required this.category,
    required this.spawnRule,
    required this.cooldownMinutes,
    required this.source,
    this.collected = false,
    this.clusterCount = 1,
  });

  final String id;
  final String placeId;
  final String placeName;
  final String title;
  final String family;
  final CollectibleRarity rarity;
  final String assetPath;
  final double latitude;
  final double longitude;
  final String district;
  final String category;
  final String spawnRule;
  final int cooldownMinutes;
  final String source;
  final bool collected;
  final int clusterCount;

  CollectibleItem copyWith({bool? collected, int? clusterCount}) {
    return CollectibleItem(
      id: id,
      placeId: placeId,
      placeName: placeName,
      title: title,
      family: family,
      rarity: rarity,
      assetPath: assetPath,
      latitude: latitude,
      longitude: longitude,
      district: district,
      category: category,
      spawnRule: spawnRule,
      cooldownMinutes: cooldownMinutes,
      source: source,
      collected: collected ?? this.collected,
      clusterCount: clusterCount ?? this.clusterCount,
    );
  }
}

class PlayerLoadout {
  const PlayerLoadout({
    required this.title,
    required this.level,
    required this.archetype,
    required this.bodyColor,
    required this.auraColor,
    required this.accentColor,
    required this.ringAsset,
    required this.trailLabel,
    required this.unlockedCosmetics,
  });

  final String title;
  final int level;
  final PlayerArchetype archetype;
  final Color bodyColor;
  final Color auraColor;
  final Color accentColor;
  final String ringAsset;
  final String trailLabel;
  final List<String> unlockedCosmetics;
}

class InventorySummary {
  const InventorySummary({
    required this.totalCollected,
    required this.totalVisible,
    required this.districtProgress,
    required this.rareFinds,
    required this.cosmeticUnlocks,
  });

  final int totalCollected;
  final int totalVisible;
  final int districtProgress;
  final int rareFinds;
  final int cosmeticUnlocks;
}

class MapWorldState {
  const MapWorldState({
    required this.districts,
    required this.collectibles,
    required this.loadout,
    required this.summary,
    required this.analytics,
    required this.tuning,
  });

  final List<DistrictZone> districts;
  final List<CollectibleItem> collectibles;
  final PlayerLoadout loadout;
  final InventorySummary summary;
  final Map<String, Object> analytics;
  final Map<String, Object> tuning;
}

class MapWorldEngine {
  const MapWorldEngine();

  MapWorldState build({required List<MapPin> pins, required MapViewport viewport, AppLocation? location}) {
    final districts = _buildDistricts(pins, viewport);
    final collectibles = _buildCollectibles(pins, districts, viewport, location);
    final collected = collectibles.where((item) => item.collected).toList(growable: false);
    final rareFinds = collectibles.where((item) => item.rarity.index >= CollectibleRarity.rare.index).length;
    final summary = InventorySummary(
      totalCollected: collected.length,
      totalVisible: collectibles.length,
      districtProgress: districts.where((zone) => zone.completion >= 0.8).length,
      rareFinds: rareFinds,
      cosmeticUnlocks: 3 + (collected.length ~/ 3),
    );

    return MapWorldState(
      districts: districts,
      collectibles: collectibles,
      loadout: _buildLoadout(summary: summary),
      summary: summary,
      analytics: {
        'map_engagement_surface': 'world_map',
        'collectible_discovery_rate': collectibles.length,
        'rare_item_visible_count': rareFinds,
        'collection_conversion_opportunities': pins.where((pin) => pin.hasReviews || pin.hasCreatorMedia).length,
      },
      tuning: const {
        'spawn_cap_dense_area': 5,
        'spawn_cap_sparse_area': 2,
        'cooldown_same_place_minutes': 90,
        'proximity_collect_radius_meters': 70,
        'anti_spoof_velocity_guard': 'server_authoritative',
      },
    );
  }

  bool canCollect({required CollectibleItem item, required Set<String> recentlyCollectedPlaceIds}) {
    if (recentlyCollectedPlaceIds.contains(item.placeId)) return false;
    return true;
  }

  List<DistrictZone> _buildDistricts(List<MapPin> pins, MapViewport viewport) {
    if (pins.isEmpty) {
      return [
        DistrictZone(
          id: 'fallback',
          name: 'Discovery Field',
          centerLat: viewport.centerLat,
          centerLng: viewport.centerLng,
          radiusMeters: 420,
          color: const Color(0xFF6C5CE7),
          energy: 0.55,
          scene: 'Open exploration',
          completion: 0.32,
        ),
      ];
    }

    final buckets = <String, List<MapPin>>{};
    for (final pin in pins) {
      final key = (pin.neighborhood ?? pin.city ?? pin.region ?? 'Nearby').trim();
      buckets.putIfAbsent(key, () => <MapPin>[]).add(pin);
    }

    final palette = <Color>[
      const Color(0xFF6C5CE7),
      const Color(0xFF00B8D9),
      const Color(0xFFFF8A65),
      const Color(0xFFFFC857),
    ];

    final zones = <DistrictZone>[];
    var index = 0;
    for (final entry in buckets.entries.take(4)) {
      final items = entry.value;
      final avgLat = items.map((pin) => pin.latitude).reduce((a, b) => a + b) / items.length;
      final avgLng = items.map((pin) => pin.longitude).reduce((a, b) => a + b) / items.length;
      zones.add(
        DistrictZone(
          id: 'district_$index',
          name: entry.key,
          centerLat: avgLat,
          centerLng: avgLng,
          radiusMeters: 220 + (items.length * 24),
          color: palette[index % palette.length],
          energy: (0.35 + (items.length * 0.08)).clamp(0.0, 0.95),
          scene: _sceneFor(items.first.category),
          completion: (items.where((pin) => pin.hasReviews || pin.hasCreatorMedia).length / items.length).clamp(0.18, 1.0),
        ),
      );
      index += 1;
    }
    return zones;
  }

  List<CollectibleItem> _buildCollectibles(
    List<MapPin> pins,
    List<DistrictZone> districts,
    MapViewport viewport,
    AppLocation? location,
  ) {
    final dense = pins.length > 10;
    final maxItems = dense ? 5 : 2;
    final items = <CollectibleItem>[];
    final placeCounts = <String, int>{};

    for (final pin in pins) {
      if ((placeCounts[pin.canonicalPlaceId] ?? 0) >= 1) continue;
      final district = districts.firstWhere(
        (zone) => zone.name == (pin.neighborhood ?? pin.city ?? pin.region ?? 'Nearby'),
        orElse: () => districts.first,
      );
      final rarity = _rarityFor(pin);
      final nearUser = _distanceMeters(location?.lat, location?.lng, pin.latitude, pin.longitude);
      final collected = nearUser != null && nearUser < 95 && pin.hasReviews;
      final family = _familyFor(pin.category, rarity: rarity);
      items.add(
        CollectibleItem(
          id: 'item_${pin.canonicalPlaceId}',
          placeId: pin.canonicalPlaceId,
          placeName: pin.name,
          title: '${district.name} ${family.title}',
          family: family,
          rarity: rarity,
          assetPath: _assetPathFor(pin.category, rarity),
          latitude: pin.latitude + (dense ? 0.00008 : 0.00004),
          longitude: pin.longitude - (dense ? 0.00006 : 0.00003),
          district: district.name,
          category: pin.category,
          spawnRule: dense ? 'cluster_suppressed' : 'place_linked',
          cooldownMinutes: 90,
          source: '${pin.categoryLabel} • canonical place ${pin.canonicalPlaceId}',
          collected: collected,
          clusterCount: dense ? min(3, 1 + (pin.reviewCount ~/ 5)) : 1,
        ),
      );
      placeCounts[pin.canonicalPlaceId] = 1;
      if (items.length >= maxItems) break;
    }

    if (items.isEmpty) {
      items.add(
        CollectibleItem(
          id: 'item_fallback',
          placeId: 'viewport_anchor',
          placeName: 'Discovery Field',
          title: 'World Seed',
          family: 'district relic',
          rarity: CollectibleRarity.common,
          assetPath: 'assets/game_world/collectibles/common/district_relic_orbit.svg',
          latitude: viewport.centerLat,
          longitude: viewport.centerLng,
          district: 'Discovery Field',
          category: 'exploration',
          spawnRule: 'viewport_seed',
          cooldownMinutes: 90,
          source: 'Viewport fallback',
        ),
      );
    }

    return items;
  }

  PlayerLoadout _buildLoadout({required InventorySummary summary}) {
    final creatorHeavy = summary.rareFinds >= 2;
    return PlayerLoadout(
      title: creatorHeavy ? 'Scene Vanguard' : 'District Runner',
      level: 8 + summary.totalCollected,
      archetype: creatorHeavy ? PlayerArchetype.creator : PlayerArchetype.explorer,
      bodyColor: creatorHeavy ? const Color(0xFFFF8A65) : const Color(0xFF6C5CE7),
      auraColor: creatorHeavy ? const Color(0xFFFFD180) : const Color(0xFF80D8FF),
      accentColor: creatorHeavy ? const Color(0xFFFFC857) : const Color(0xFF00E5FF),
      ringAsset: 'assets/game_world/player/player_ring_prestige.svg',
      trailLabel: creatorHeavy ? 'Creator signal' : 'Explorer pulse',
      unlockedCosmetics: const ['North Loop Halo', 'Night Scene Orbit', 'Creator Crest'],
    );
  }

  CollectibleRarity _rarityFor(MapPin pin) {
    if (pin.creatorVideoCount >= 2 || pin.rating >= 0.9) return CollectibleRarity.epic;
    if (pin.reviewCount >= 10 || pin.hasCreatorMedia) return CollectibleRarity.rare;
    if (pin.reviewCount >= 4 || pin.hasReviews) return CollectibleRarity.uncommon;
    return CollectibleRarity.common;
  }

  String _familyFor(String category, {required CollectibleRarity rarity}) {
    if (category.contains('coffee')) return rarity.index >= CollectibleRarity.rare.index ? 'crema crest' : 'cuisine charm';
    if (category.contains('museum') || category.contains('park')) return 'scene sigil';
    if (category.contains('night')) return 'afterglow emblem';
    return 'district relic';
  }

  String _assetPathFor(String category, CollectibleRarity rarity) {
    final tier = switch (rarity) {
      CollectibleRarity.common => 'common',
      CollectibleRarity.uncommon => 'uncommon',
      CollectibleRarity.rare => 'rare',
      CollectibleRarity.epic => 'epic',
    };
    if (category.contains('coffee')) return 'assets/game_world/collectibles/$tier/cuisine_charm_bean.svg';
    if (category.contains('museum') || category.contains('park')) return 'assets/game_world/collectibles/$tier/scene_token_sun.svg';
    if (category.contains('night')) return 'assets/game_world/collectibles/$tier/hotspot_emblem_moon.svg';
    return 'assets/game_world/collectibles/$tier/district_relic_orbit.svg';
  }

  String _sceneFor(String category) {
    if (category.contains('coffee')) return 'Coffee constellation';
    if (category.contains('night')) return 'Night pulse';
    if (category.contains('museum')) return 'Culture corridor';
    if (category.contains('park')) return 'Open-air trail';
    return 'Mixed discovery';
  }

  double? _distanceMeters(double? fromLat, double? fromLng, double toLat, double toLng) {
    if (fromLat == null || fromLng == null) return null;
    const earthRadiusMeters = 6371000.0;
    final dLat = _toRadians(toLat - fromLat);
    final dLng = _toRadians(toLng - fromLng);
    final a = (sin(dLat / 2) * sin(dLat / 2)) + cos(_toRadians(fromLat)) * cos(_toRadians(toLat)) * (sin(dLng / 2) * sin(dLng / 2));
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  double _toRadians(double value) => value * pi / 180;
}
