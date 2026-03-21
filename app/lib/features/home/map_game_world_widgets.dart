import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../app/theme/widgets.dart';
import 'map_game_world.dart';

class MapWorldHud extends StatelessWidget {
  const MapWorldHud({
    super.key,
    required this.world,
    required this.onOpenInventory,
  });

  final MapWorldState world;
  final VoidCallback onOpenInventory;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      gradient: LinearGradient(
        colors: [
          theme.colorScheme.surface.withOpacity(0.92),
          theme.colorScheme.surfaceContainerHigh.withOpacity(0.92),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${world.loadout.title} • Lv ${world.loadout.level}',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  '${world.summary.totalVisible} collectibles live • ${world.summary.rareFinds} rare signals • ${world.summary.cosmeticUnlocks} cosmetics unlocked',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          FilledButton.icon(
            onPressed: onOpenInventory,
            icon: const Icon(Icons.backpack_rounded),
            label: const Text('Inventory'),
          ),
        ],
      ),
    );
  }
}

class DistrictLegendCard extends StatelessWidget {
  const DistrictLegendCard({super.key, required this.world});

  final MapWorldState world;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('District energy', style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          SizedBox(
            height: 54,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: world.districts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final zone = world.districts[index];
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    gradient: LinearGradient(colors: [zone.color.withOpacity(0.92), zone.color.withOpacity(0.45)]),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(zone.name, style: theme.textTheme.labelLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                      Text(zone.scene, style: theme.textTheme.labelSmall?.copyWith(color: Colors.white.withOpacity(0.88))),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class CollectibleMarkerSprite extends StatelessWidget {
  const CollectibleMarkerSprite({super.key, required this.item, required this.selected, this.onTap});

  final CollectibleItem item;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final rarityColor = switch (item.rarity) {
      CollectibleRarity.common => const Color(0xFF80D8FF),
      CollectibleRarity.uncommon => const Color(0xFF69F0AE),
      CollectibleRarity.rare => const Color(0xFFFFC857),
      CollectibleRarity.epic => const Color(0xFFFF8A80),
    };
    return GestureDetector(
      onTap: onTap,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 180),
        scale: selected ? 1.08 : 1,
        child: Container(
          width: 58,
          height: 72,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(colors: [rarityColor.withOpacity(0.95), const Color(0xFF121A35)]),
            boxShadow: [
              BoxShadow(color: rarityColor.withOpacity(0.38), blurRadius: 22, offset: const Offset(0, 10)),
            ],
            border: Border.all(color: Colors.white.withOpacity(selected ? 0.94 : 0.55), width: selected ? 2 : 1.2),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                top: 8,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.18)),
                  padding: const EdgeInsets.all(6),
                  child: SvgPicture.asset(item.assetPath),
                ),
              ),
              Positioned(
                bottom: 8,
                child: Column(
                  children: [
                    Text(
                      item.family.toUpperCase(),
                      style: const TextStyle(fontSize: 7.5, color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                    ),
                    if (item.clusterCount > 1)
                      Text('x${item.clusterCount}', style: const TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PlayerAvatarMarker extends StatelessWidget {
  const PlayerAvatarMarker({super.key, required this.loadout});

  final PlayerLoadout loadout;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 74,
      height: 74,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 74,
            height: 74,
            decoration: BoxDecoration(shape: BoxShape.circle, color: loadout.auraColor.withOpacity(0.18)),
          ),
          SvgPicture.asset(loadout.ringAsset, width: 68, height: 68),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [loadout.bodyColor, loadout.accentColor]),
              border: Border.all(color: Colors.white, width: 2.5),
              boxShadow: [
                BoxShadow(color: loadout.auraColor.withOpacity(0.45), blurRadius: 18, offset: const Offset(0, 8)),
              ],
            ),
            child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 18),
          ),
          Positioned(
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF0F1733),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white24),
              ),
              child: Text(
                loadout.trailLabel,
                style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MapWorldInventorySheet extends StatelessWidget {
  const MapWorldInventorySheet({super.key, required this.world});

  final MapWorldState world;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Explorer inventory', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(
              'Collectibles are anchored to canonical places, district scenes, creator activity, and trusted progression rules.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AppPill(label: '${world.summary.totalCollected} collected', icon: Icons.check_circle_rounded),
                AppPill(label: '${world.summary.rareFinds} rare visible', icon: Icons.auto_awesome_rounded),
                AppPill(label: '${world.summary.districtProgress} districts mastered', icon: Icons.location_city_rounded),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.separated(
                itemCount: world.collectibles.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = world.collectibles[index];
                  return AppCard(
                    child: Row(
                      children: [
                        Container(
                          width: 54,
                          height: 54,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            color: theme.colorScheme.surfaceContainerHighest,
                          ),
                          child: SvgPicture.asset(item.assetPath),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Text('${item.placeName} • ${item.district} • ${item.source}', style: theme.textTheme.bodySmall),
                              const SizedBox(height: 6),
                              Text('Spawn: ${item.spawnRule} • Cooldown: ${item.cooldownMinutes}m', style: theme.textTheme.labelSmall),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        AppPill(
                          label: item.collected ? 'Collected' : item.rarity.name,
                          icon: item.collected ? Icons.task_alt_rounded : Icons.stars_rounded,
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
