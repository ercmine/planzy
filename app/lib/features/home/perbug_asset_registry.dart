import 'package:flutter/material.dart';

import '../../app/assets.dart';
import '../../app/theme/tokens.dart';
import 'perbug_game_models.dart';

class PerbugVisualAssetRef {
  const PerbugVisualAssetRef({
    required this.id,
    required this.sheet,
    required this.frame,
    this.assetPath,
  });

  final String id;
  final String sheet;
  final int frame;
  final String? assetPath;
}

class PerbugNodeVisual {
  const PerbugNodeVisual({
    required this.type,
    required this.label,
    required this.icon,
    required this.color,
    required this.iconRef,
    required this.tileRef,
  });

  final PerbugNodeType type;
  final String label;
  final IconData icon;
  final Color color;
  final PerbugVisualAssetRef iconRef;
  final PerbugVisualAssetRef tileRef;
}

class PerbugRoleVisual {
  const PerbugRoleVisual({
    required this.role,
    required this.label,
    required this.icon,
    required this.sheetRef,
    required this.portraitRef,
  });

  final UnitRole role;
  final String label;
  final IconData icon;
  final PerbugVisualAssetRef sheetRef;
  final PerbugVisualAssetRef portraitRef;
}

class PerbugAssetRegistry {
  const PerbugAssetRegistry._();

  static const PerbugNodeVisual fallbackNode = PerbugNodeVisual(
    type: PerbugNodeType.encounter,
    label: 'Unknown node',
    icon: Icons.help_outline_rounded,
    color: Color(0xFF5E8BFF),
    iconRef: PerbugVisualAssetRef(
      id: 'node_icon_fallback',
      sheet: 'perbug_node_icon_sheet',
      frame: 0,
      assetPath: AppAssets.perbugNodeIconSheet,
    ),
    tileRef: PerbugVisualAssetRef(
      id: 'node_tile_fallback',
      sheet: 'perbug_node_tiles_sheet',
      frame: 0,
      assetPath: AppAssets.perbugNodeTileSheet,
    ),
  );

  static final Map<PerbugNodeType, PerbugNodeVisual> nodeVisualByType = {
    PerbugNodeType.encounter: PerbugNodeVisual(
      type: PerbugNodeType.encounter,
      label: 'Encounter',
      icon: Icons.flash_on_rounded,
      color: AppSemanticColors.mapNode['encounter'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_encounter', sheet: 'perbug_node_icon_sheet', frame: 0, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_encounter', sheet: 'perbug_node_tiles_sheet', frame: 0, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.resource: PerbugNodeVisual(
      type: PerbugNodeType.resource,
      label: 'Resource',
      icon: Icons.forest_rounded,
      color: AppSemanticColors.mapNode['resource'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_resource', sheet: 'perbug_node_icon_sheet', frame: 1, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_resource', sheet: 'perbug_node_tiles_sheet', frame: 1, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.mission: PerbugNodeVisual(
      type: PerbugNodeType.mission,
      label: 'Mission',
      icon: Icons.flag_circle_rounded,
      color: AppSemanticColors.mapNode['mission'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_mission', sheet: 'perbug_node_icon_sheet', frame: 2, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_mission', sheet: 'perbug_node_tiles_sheet', frame: 2, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.shop: PerbugNodeVisual(
      type: PerbugNodeType.shop,
      label: 'Shop',
      icon: Icons.storefront_rounded,
      color: AppSemanticColors.mapNode['shop'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_shop', sheet: 'perbug_node_icon_sheet', frame: 3, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_shop', sheet: 'perbug_node_tiles_sheet', frame: 3, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.rare: PerbugNodeVisual(
      type: PerbugNodeType.rare,
      label: 'Rare',
      icon: Icons.auto_awesome_rounded,
      color: AppSemanticColors.mapNode['rare'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_rare', sheet: 'perbug_node_icon_sheet', frame: 4, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_rare', sheet: 'perbug_node_tiles_sheet', frame: 4, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.boss: PerbugNodeVisual(
      type: PerbugNodeType.boss,
      label: 'Boss',
      icon: Icons.health_and_safety_rounded,
      color: AppSemanticColors.mapNode['boss'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_boss', sheet: 'perbug_node_icon_sheet', frame: 5, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_boss', sheet: 'perbug_node_tiles_sheet', frame: 5, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.rest: PerbugNodeVisual(
      type: PerbugNodeType.rest,
      label: 'Rest',
      icon: Icons.nightlight_round,
      color: AppSemanticColors.mapNode['rest'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_rest', sheet: 'perbug_node_icon_sheet', frame: 6, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_rest', sheet: 'perbug_node_tiles_sheet', frame: 6, assetPath: AppAssets.perbugNodeTileSheet),
    ),
    PerbugNodeType.event: PerbugNodeVisual(
      type: PerbugNodeType.event,
      label: 'Event',
      icon: Icons.celebration_rounded,
      color: AppSemanticColors.mapNode['event'] ?? fallbackNode.color,
      iconRef: const PerbugVisualAssetRef(id: 'node_icon_event', sheet: 'perbug_node_icon_sheet', frame: 7, assetPath: AppAssets.perbugNodeIconSheet),
      tileRef: const PerbugVisualAssetRef(id: 'node_tile_event', sheet: 'perbug_node_tiles_sheet', frame: 7, assetPath: AppAssets.perbugNodeTileSheet),
    ),
  };

  static final Map<UnitRole, PerbugRoleVisual> roleVisualByType = {
    UnitRole.tank: const PerbugRoleVisual(role: UnitRole.tank, label: 'Tank', icon: Icons.shield_rounded, sheetRef: PerbugVisualAssetRef(id: 'tank_sheet', sheet: 'perbug_tank_sheet', frame: 0, assetPath: AppAssets.perbugTankSheet), portraitRef: PerbugVisualAssetRef(id: 'tank_portrait', sheet: 'perbug_portrait_sheet', frame: 0, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.scout: const PerbugRoleVisual(role: UnitRole.scout, label: 'Scout', icon: Icons.explore_rounded, sheetRef: PerbugVisualAssetRef(id: 'scout_sheet', sheet: 'perbug_scout_sheet', frame: 0, assetPath: AppAssets.perbugScoutSheet), portraitRef: PerbugVisualAssetRef(id: 'scout_portrait', sheet: 'perbug_portrait_sheet', frame: 1, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.striker: const PerbugRoleVisual(role: UnitRole.striker, label: 'Warrior', icon: Icons.sports_martial_arts_rounded, sheetRef: PerbugVisualAssetRef(id: 'warrior_sheet', sheet: 'perbug_warrior_sheet', frame: 0, assetPath: AppAssets.perbugWarriorSheet), portraitRef: PerbugVisualAssetRef(id: 'warrior_portrait', sheet: 'perbug_portrait_sheet', frame: 2, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.support: const PerbugRoleVisual(role: UnitRole.support, label: 'Support', icon: Icons.health_and_safety_outlined, sheetRef: PerbugVisualAssetRef(id: 'support_sheet', sheet: 'perbug_support_sheet', frame: 0, assetPath: AppAssets.perbugSupportSheet), portraitRef: PerbugVisualAssetRef(id: 'support_portrait', sheet: 'perbug_portrait_sheet', frame: 3, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.engineer: const PerbugRoleVisual(role: UnitRole.engineer, label: 'Engineer', icon: Icons.precision_manufacturing_rounded, sheetRef: PerbugVisualAssetRef(id: 'engineer_sheet', sheet: 'perbug_engineer_sheet', frame: 0, assetPath: AppAssets.perbugEngineerSheet), portraitRef: PerbugVisualAssetRef(id: 'engineer_portrait', sheet: 'perbug_portrait_sheet', frame: 4, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.caster: const PerbugRoleVisual(role: UnitRole.caster, label: 'Caster', icon: Icons.auto_fix_high_rounded, sheetRef: PerbugVisualAssetRef(id: 'caster_sheet', sheet: 'perbug_caster_sheet', frame: 0, assetPath: AppAssets.perbugCasterSheet), portraitRef: PerbugVisualAssetRef(id: 'caster_portrait', sheet: 'perbug_portrait_sheet', frame: 5, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.controller: const PerbugRoleVisual(role: UnitRole.controller, label: 'Cleric', icon: Icons.psychology_alt_rounded, sheetRef: PerbugVisualAssetRef(id: 'cleric_sheet', sheet: 'perbug_cleric_sheet', frame: 0, assetPath: AppAssets.perbugClericSheet), portraitRef: PerbugVisualAssetRef(id: 'cleric_portrait', sheet: 'perbug_portrait_sheet', frame: 6, assetPath: AppAssets.perbugPortraitSheet)),
    UnitRole.assassin: const PerbugRoleVisual(role: UnitRole.assassin, label: 'Assassin', icon: Icons.flash_on_rounded, sheetRef: PerbugVisualAssetRef(id: 'assassin_sheet', sheet: 'perbug_assassin_sheet', frame: 0, assetPath: AppAssets.perbugAssassinSheet), portraitRef: PerbugVisualAssetRef(id: 'assassin_portrait', sheet: 'perbug_portrait_sheet', frame: 7, assetPath: AppAssets.perbugPortraitSheet)),
  };

  static PerbugNodeVisual nodeVisual(PerbugNodeType type) => nodeVisualByType[type] ?? fallbackNode;

  static PerbugRoleVisual roleVisual(UnitRole role) =>
      roleVisualByType[role] ??
      const PerbugRoleVisual(
        role: UnitRole.support,
        label: 'Fallback',
        icon: Icons.person,
        sheetRef: PerbugVisualAssetRef(id: 'fallback_sheet', sheet: 'perbug_support_sheet', frame: 0, assetPath: AppAssets.perbugSupportSheet),
        portraitRef: PerbugVisualAssetRef(id: 'fallback_portrait', sheet: 'perbug_portrait_sheet', frame: 0, assetPath: AppAssets.perbugPortraitSheet),
      );
}
