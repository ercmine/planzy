import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../app/theme/widgets.dart';
import '../chain/perbug_chain_providers.dart';
import '../perbug_providers.dart';
import '../models/perbug_models.dart';

class PerbugMapPage extends ConsumerStatefulWidget {
  const PerbugMapPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  ConsumerState<PerbugMapPage> createState() => _PerbugMapPageState();
}

class _PerbugMapPageState extends ConsumerState<PerbugMapPage> {
  PerbugTree? _selectedTree;

  @override
  Widget build(BuildContext context) {
    final plantingAsync = ref.watch(plantingTreesProvider);
    final marketplaceAsync = ref.watch(marketplaceTreesProvider);
    final wallet = ref.watch(walletAddressProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(plantingTreesProvider);
        ref.invalidate(marketplaceTreesProvider);
        ref.invalidate(ownedTreesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'Map',
            subtitle: 'Planting is now map-native. Explore global trees, local opportunities, and act in one tap.',
            badge: AppPill(label: 'Live tree atlas', icon: Icons.public),
          ),
          const SizedBox(height: 12),
          plantingAsync.when(
            data: (trees) {
              if (trees.isEmpty) {
                return const AppCard(
                  tone: AppCardTone.featured,
                  child: Text('No planted trees are available in this area yet. Pull to refresh and try again.'),
                );
              }

              final selected = _selectedTree ?? trees.first;
              if (!trees.any((tree) => tree.id == selected.id)) {
                _selectedTree = trees.first;
              }

              final local = _localTrees(trees, selected.latitude, selected.longitude);
              final claimable = trees.where((tree) => tree.claimState == TreeClaimState.claimable).toList(growable: false);
              final listed = trees.where((tree) => tree.isListed).toList(growable: false);
              final replantable = trees.where((tree) => tree.readyToReplant).toList(growable: false);

              return Column(
                children: [
                  _TreeAtlasCard(
                    trees: trees,
                    selectedTree: selected,
                    onSelect: (tree) => setState(() => _selectedTree = tree),
                  ),
                  const SizedBox(height: 12),
                  _SelectedTreeCard(
                    tree: selected,
                    wallet: wallet,
                    onOpenTree: widget.onOpenTree,
                    onSelect: () => widget.onOpenTree(selected.id),
                  ),
                  const SizedBox(height: 12),
                  _StateBuckets(
                    claimableCount: claimable.length,
                    listedCount: listed.length,
                    replantableCount: replantable.length,
                    localCount: local.length,
                  ),
                  const SizedBox(height: 12),
                  _Section(
                    title: 'Planting area results',
                    subtitle: 'Unclaimed, planted, listed, and creator-linked trees around this map focus.',
                    children: local.take(6).map((tree) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _PlantingCard(tree: tree, onOpenTree: widget.onOpenTree),
                      );
                    }).toList(growable: false),
                  ),
                ],
              );
            },
            error: (error, _) => AppCard(child: Text('Map data unavailable: $error')),
            loading: () => const AppCard(child: LinearProgressIndicator()),
          ),
          const SizedBox(height: 12),
          marketplaceAsync.when(
            data: (trees) {
              if (trees.isEmpty) return const SizedBox.shrink();
              return _Section(
                title: 'Marketplace movement',
                subtitle: 'Fresh listings visible directly from the map.',
                children: trees.take(4).map((tree) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(tree.name),
                    subtitle: Text('${tree.locationLabel} • ${tree.priceEth?.toStringAsFixed(2) ?? '--'} ETH'),
                    trailing: TextButton(onPressed: () => widget.onOpenTree(tree.id), child: const Text('Buy')),
                  );
                }).toList(growable: false),
              );
            },
            error: (_, __) => const SizedBox.shrink(),
            loading: () => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  List<PerbugTree> _localTrees(List<PerbugTree> trees, double centerLat, double centerLng) {
    final sorted = [...trees]
      ..sort((a, b) {
        final aDist = _distanceScore(a.latitude, a.longitude, centerLat, centerLng);
        final bDist = _distanceScore(b.latitude, b.longitude, centerLat, centerLng);
        return aDist.compareTo(bDist);
      });
    return sorted;
  }

  double _distanceScore(double lat, double lng, double centerLat, double centerLng) {
    return math.sqrt(math.pow(lat - centerLat, 2) + math.pow(lng - centerLng, 2));
  }
}

class _TreeAtlasCard extends StatelessWidget {
  const _TreeAtlasCard({required this.trees, required this.selectedTree, required this.onSelect});

  final List<PerbugTree> trees;
  final PerbugTree selectedTree;
  final ValueChanged<PerbugTree> onSelect;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.featured,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Global tree presence', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          SizedBox(
            height: 220,
            child: _TreeAtlasMap(
              trees: trees,
              selectedTree: selectedTree,
              onSelect: onSelect,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: trees.take(12).map((tree) {
                final isSelected = tree.id == selectedTree.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    selected: isSelected,
                    label: Text(tree.name),
                    onSelected: (_) => onSelect(tree),
                  ),
                );
              }).toList(growable: false),
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectedTreeCard extends ConsumerStatefulWidget {
  const _SelectedTreeCard({
    required this.tree,
    required this.wallet,
    required this.onOpenTree,
    required this.onSelect,
  });

  final PerbugTree tree;
  final String? wallet;
  final ValueChanged<String> onOpenTree;
  final VoidCallback onSelect;

  @override
  ConsumerState<_SelectedTreeCard> createState() => _SelectedTreeCardState();
}

class _SelectedTreeCardState extends ConsumerState<_SelectedTreeCard> {
  bool _working = false;

  Future<void> _water() async {
    final wallet = widget.wallet;
    if (wallet == null || wallet.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connect wallet to water trees.')));
      return;
    }
    setState(() => _working = true);
    try {
      final repo = await ref.read(perbugRepositoryProvider.future);
      await repo.waterTree(widget.tree.id, wallet: wallet);
      ref.invalidate(ownedTreesProvider);
      ref.invalidate(plantingTreesProvider);
      ref.invalidate(treeDetailProvider(widget.tree.id));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Watered successfully.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Watering failed: $error')));
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tree = widget.tree;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Selected tree', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(tree.name),
            subtitle: Text('${tree.locationLabel} • Creator ${tree.founderHandle}'),
            trailing: Text('${tree.priceEth?.toStringAsFixed(2) ?? '--'} ETH'),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppPill(label: tree.statusLabel, icon: Icons.park_outlined),
              AppPill(label: tree.lifecycleLabel, icon: Icons.sync_alt_outlined),
              if (tree.isListed) const AppPill(label: 'Buyable', icon: Icons.shopping_bag_outlined),
              if (tree.readyToReplant) const AppPill(label: 'Replant-ready', icon: Icons.my_location_outlined),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(onPressed: widget.onSelect, icon: const Icon(Icons.open_in_new), label: const Text('Open detail')),
              OutlinedButton.icon(
                onPressed: _working || !tree.canWaterNow ? null : _water,
                icon: const Icon(Icons.water_drop_outlined),
                label: Text(tree.canWaterNow ? 'Water' : 'Cooldown'),
              ),
              OutlinedButton.icon(onPressed: () => widget.onOpenTree(tree.id), icon: const Icon(Icons.person_outline), label: const Text('View creator')),
              if (tree.isListed)
                FilledButton.icon(onPressed: () => widget.onOpenTree(tree.id), icon: const Icon(Icons.shopping_cart_checkout), label: const Text('Buy')),
            ],
          ),
        ],
      ),
    );
  }
}

class _StateBuckets extends StatelessWidget {
  const _StateBuckets({required this.claimableCount, required this.listedCount, required this.replantableCount, required this.localCount});

  final int claimableCount;
  final int listedCount;
  final int replantableCount;
  final int localCount;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          AppPill(label: '$claimableCount claimable', icon: Icons.emoji_nature_outlined),
          AppPill(label: '$listedCount listed', icon: Icons.sell_outlined),
          AppPill(label: '$replantableCount replant opportunities', icon: Icons.place_outlined),
          AppPill(label: '$localCount in focus area', icon: Icons.my_location_outlined),
        ],
      ),
    );
  }
}

class _PlantingCard extends StatelessWidget {
  const _PlantingCard({required this.tree, required this.onOpenTree});

  final PerbugTree tree;
  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context) {
    final label = switch (tree.claimState) {
      TreeClaimState.claimable => 'Claim & plant',
      TreeClaimState.claimed => 'Plant now',
      TreeClaimState.planted => tree.isListed ? 'Buy listed tree' : 'Open tree',
      TreeClaimState.unavailable => 'Unavailable',
    };

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tree.name, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('${tree.placeName} • ${tree.locationLabel}'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppPill(label: tree.statusLabel, icon: Icons.park_outlined),
              AppPill(label: tree.lifecycleLabel, icon: Icons.sync),
              if (tree.isListed) AppPill(label: '${tree.priceEth?.toStringAsFixed(2) ?? '--'} ETH', icon: Icons.sell_outlined),
            ],
          ),
          const SizedBox(height: 10),
          FilledButton.icon(onPressed: () => onOpenTree(tree.id), icon: const Icon(Icons.forest_outlined), label: Text(label)),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}

class _TreeAtlasMap extends StatelessWidget {
  const _TreeAtlasMap({
    required this.trees,
    required this.selectedTree,
    required this.onSelect,
  });

  final List<PerbugTree> trees;
  final PerbugTree selectedTree;
  final ValueChanged<PerbugTree> onSelect;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        ),
        child: FlutterMap(
          options: MapOptions(
            initialCenter: LatLng(selectedTree.latitude, selectedTree.longitude),
            initialZoom: 2.2,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.drag | InteractiveFlag.pinchZoom),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.perbug.app',
            ),
            MarkerLayer(
              markers: trees.map((tree) {
                final selected = tree.id == selectedTree.id;
                return Marker(
                  point: LatLng(tree.latitude, tree.longitude),
                  width: selected ? 52 : 42,
                  height: selected ? 52 : 42,
                  alignment: Alignment.center,
                  child: GestureDetector(
                    onTap: () => onSelect(tree),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected ? Colors.white.withOpacity(0.85) : Colors.black.withOpacity(0.35),
                        border: Border.all(
                          color: selected ? const Color(0xFF94F6A7) : Colors.white.withOpacity(0.5),
                          width: selected ? 2.2 : 1.2,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(6),
                        child: Image.asset(_treeMarkerAsset(tree), fit: BoxFit.contain),
                      ),
                    ),
                  ),
                );
              }).toList(growable: false),
            ),
          ],
        ),
      ),
    );
  }
}

String _treeMarkerAsset(PerbugTree tree) {
  if (tree.isListed) return '../generated_assets/nodes/icons/shop.png';
  if (tree.readyToReplant) return '../generated_assets/nodes/icons/rest.png';
  return switch (tree.claimState) {
    TreeClaimState.claimable => '../generated_assets/nodes/icons/resource.png',
    TreeClaimState.claimed => '../generated_assets/nodes/icons/mission.png',
    TreeClaimState.planted => '../generated_assets/nodes/icons/encounter.png',
    TreeClaimState.unavailable => '../generated_assets/nodes/icons/boss.png',
  };
}
