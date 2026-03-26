import 'package:flutter/material.dart';

import '../../core/env/env.dart';

class DryadMapCameraPreset {
  const DryadMapCameraPreset({
    required this.idleTilt,
    required this.idleBearing,
    required this.selectedTilt,
    required this.selectedBearing,
    required this.idleZoomBoost,
    required this.selectedZoomBoost,
  });

  final double idleTilt;
  final double idleBearing;
  final double selectedTilt;
  final double selectedBearing;
  final double idleZoomBoost;
  final double selectedZoomBoost;
}

class DryadMapTheme {
  const DryadMapTheme({
    required this.isDark,
    required this.styleUrl,
    required this.base,
    required this.road,
    required this.label,
    required this.marker,
    required this.overlay,
    required this.building,
    required this.terrain,
    required this.camera,
  });

  final bool isDark;
  final String styleUrl;
  final DryadBasePalette base;
  final DryadRoadPalette road;
  final DryadLabelPalette label;
  final DryadMarkerPalette marker;
  final DryadOverlayPalette overlay;
  final DryadBuildingPalette building;
  final DryadTerrainPalette terrain;
  final DryadMapCameraPreset camera;

  static DryadMapTheme resolve({required Brightness brightness, required MapStackConfig config}) {
    final isDark = brightness == Brightness.dark;
    return DryadMapTheme(
      isDark: isDark,
      styleUrl: isDark ? config.darkStyleUrl : config.styleUrl,
      base: isDark
          ? const DryadBasePalette(
              land: '#111625',
              landAccent: '#171D31',
              water: '#0B2D50',
              park: '#1A2E2C',
              boundary: '#2F3B59',
            )
          : const DryadBasePalette(
              land: '#F4F6FA',
              landAccent: '#E9EEF7',
              water: '#BFD8FF',
              park: '#DDEEE2',
              boundary: '#C8D1E4',
            ),
      road: isDark
          ? const DryadRoadPalette(
              minor: '#2A334A',
              major: '#3A4764',
              highway: '#596A91',
              casing: '#111625',
            )
          : const DryadRoadPalette(
              minor: '#FFFFFF',
              major: '#F8FBFF',
              highway: '#FFE6D5',
              casing: '#D9E0EE',
            ),
      label: isDark
          ? const DryadLabelPalette(primary: '#E8EEFF', secondary: '#A7B4D3', halo: '#0A1020')
          : const DryadLabelPalette(primary: '#1A2742', secondary: '#5C6C8E', halo: '#FFFFFF'),
      marker: isDark
          ? const DryadMarkerPalette(
              normal: '#63A6FF',
              selected: '#4F6CFF',
              sponsored: '#FFB768',
              reward: '#FF8B6B',
              quest: '#3ED8B4',
              collection: '#B59CFF',
              cluster: '#3F5BFF',
              user: '#6EC3FF',
              text: '#F7F9FF',
              outline: '#091124',
            )
          : const DryadMarkerPalette(
              normal: '#2563EB',
              selected: '#1D4ED8',
              sponsored: '#F59E0B',
              reward: '#F97316',
              quest: '#0EAF8D',
              collection: '#7C5CFF',
              cluster: '#335CFF',
              user: '#0EA5E9',
              text: '#FFFFFF',
              outline: '#F7FAFF',
            ),
      overlay: isDark
          ? const DryadOverlayPalette(
              district: '#6C82FF',
              districtEdge: '#9CB0FF',
              selectionHalo: '#6A7AFF',
              focusRing: '#FF9E67',
            )
          : const DryadOverlayPalette(
              district: '#4C66FF',
              districtEdge: '#7D8FFF',
              selectionHalo: '#3F5BFF',
              focusRing: '#FF8A4A',
            ),
      building: isDark
          ? const DryadBuildingPalette(wall: '#2A3A5F', roof: '#3A4F7C', edge: '#8AA3D6')
          : const DryadBuildingPalette(wall: '#B9C9E8', roof: '#D1DCF2', edge: '#8DA6CF'),
      terrain: isDark
          ? const DryadTerrainPalette(exaggeration: 1.16)
          : const DryadTerrainPalette(exaggeration: 1.1),
      camera: isDark
          ? const DryadMapCameraPreset(
              idleTilt: 44,
              idleBearing: 12,
              selectedTilt: 56,
              selectedBearing: 20,
              idleZoomBoost: 0,
              selectedZoomBoost: 0.35,
            )
          : const DryadMapCameraPreset(
              idleTilt: 40,
              idleBearing: 10,
              selectedTilt: 52,
              selectedBearing: 18,
              idleZoomBoost: 0,
              selectedZoomBoost: 0.3,
            ),
    );
  }
}

class DryadBasePalette {
  const DryadBasePalette({required this.land, required this.landAccent, required this.water, required this.park, required this.boundary});

  final String land;
  final String landAccent;
  final String water;
  final String park;
  final String boundary;
}

class DryadRoadPalette {
  const DryadRoadPalette({required this.minor, required this.major, required this.highway, required this.casing});

  final String minor;
  final String major;
  final String highway;
  final String casing;
}

class DryadLabelPalette {
  const DryadLabelPalette({required this.primary, required this.secondary, required this.halo});

  final String primary;
  final String secondary;
  final String halo;
}

class DryadMarkerPalette {
  const DryadMarkerPalette({
    required this.normal,
    required this.selected,
    required this.sponsored,
    required this.reward,
    required this.quest,
    required this.collection,
    required this.cluster,
    required this.user,
    required this.text,
    required this.outline,
  });

  final String normal;
  final String selected;
  final String sponsored;
  final String reward;
  final String quest;
  final String collection;
  final String cluster;
  final String user;
  final String text;
  final String outline;
}

class DryadOverlayPalette {
  const DryadOverlayPalette({required this.district, required this.districtEdge, required this.selectionHalo, required this.focusRing});

  final String district;
  final String districtEdge;
  final String selectionHalo;
  final String focusRing;
}

class DryadBuildingPalette {
  const DryadBuildingPalette({required this.wall, required this.roof, required this.edge});

  final String wall;
  final String roof;
  final String edge;
}

class DryadTerrainPalette {
  const DryadTerrainPalette({required this.exaggeration});

  final double exaggeration;
}
