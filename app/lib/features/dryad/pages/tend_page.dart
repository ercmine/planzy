import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';
import '../dryad_providers.dart';
import '../models/dryad_models.dart';

class DryadTendPage extends ConsumerStatefulWidget {
  const DryadTendPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  ConsumerState<DryadTendPage> createState() => _DryadTendPageState();
}

class _DryadTendPageState extends ConsumerState<DryadTendPage> {
  final Set<String> _watering = <String>{};

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletAddressProvider);
    final treesAsync = ref.watch(ownedTreesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(ownedTreesProvider);
        ref.invalidate(plantingTreesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'Tend',
            subtitle: 'Water your trees from anywhere and keep your grove alive.',
            badge: AppPill(label: 'Remote care', icon: Icons.water_drop_outlined),
          ),
          const SizedBox(height: 12),
          treesAsync.when(
            data: (trees) {
              if (wallet == null || wallet.trim().isEmpty) {
                return const AppCard(child: Text('Connect your wallet to tend your trees from anywhere.'));
              }
              if (trees.isEmpty) {
                return const AppCard(child: Text('No trees to tend yet. Claim or buy a tree first.'));
              }
              final sorted = [...trees]..sort((a, b) {
                  if (a.canWaterNow == b.canWaterNow) return a.name.compareTo(b.name);
                  return a.canWaterNow ? -1 : 1;
                });
              return Column(
                children: sorted
                    .map(
                      (tree) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _TendTreeCard(
                          tree: tree,
                          isWatering: _watering.contains(tree.id),
                          onOpenTree: widget.onOpenTree,
                          onWater: () => _waterTree(tree),
                        ),
                      ),
                    )
                    .toList(growable: false),
              );
            },
            error: (error, _) => AppCard(child: Text('Unable to load trees to tend: $error')),
            loading: () => const AppCard(child: LinearProgressIndicator()),
          ),
        ],
      ),
    );
  }

  Future<void> _waterTree(DryadTree tree) async {
    final wallet = ref.read(walletAddressProvider);
    if (wallet == null || wallet.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connect wallet to water trees.')));
      return;
    }
    setState(() => _watering.add(tree.id));
    try {
      final repo = await ref.read(dryadRepositoryProvider.future);
      final eligibility = await repo.waterEligibility(tree.id, wallet: wallet);
      if (eligibility['eligible'] != true) {
        final reason = (eligibility['reason'] ?? 'Tree is not eligible to water right now.').toString();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(reason)));
        return;
      }
      await repo.waterTree(tree.id, wallet: wallet);
      ref.invalidate(ownedTreesProvider);
      ref.invalidate(plantingTreesProvider);
      ref.invalidate(marketplaceTreesProvider);
      ref.invalidate(treeDetailProvider(tree.id));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tree watered successfully.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Watering failed: $error')));
      }
    } finally {
      if (mounted) setState(() => _watering.remove(tree.id));
    }
  }
}

class _TendTreeCard extends StatelessWidget {
  const _TendTreeCard({
    required this.tree,
    required this.isWatering,
    required this.onOpenTree,
    required this.onWater,
  });

  final DryadTree tree;
  final bool isWatering;
  final ValueChanged<String> onOpenTree;
  final VoidCallback onWater;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final next = tree.nextWateringAvailableAt;
    final canWater = tree.canWaterNow;
    final cooldownText = next == null
        ? 'Ready now'
        : canWater
            ? 'Ready now'
            : 'Ready in ${next.difference(now).inMinutes.clamp(1, 9999)}m';
    final lastWatered = tree.lastWateredAt == null ? 'Never watered' : 'Last watered ${_relative(tree.lastWateredAt!, now)}';
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(tree.name),
            subtitle: Text('${tree.placeName} • ${tree.locationLabel}'),
            trailing: TextButton(onPressed: () => onOpenTree(tree.id), child: const Text('Details')),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppPill(label: tree.lifecycleLabel, icon: Icons.forest_outlined),
              AppPill(label: tree.isPortable ? 'Portable' : 'Planted', icon: Icons.place_outlined),
              AppPill(label: tree.isListed ? 'Listed' : 'Unlisted', icon: Icons.sell_outlined),
              AppPill(label: cooldownText, icon: Icons.water_drop_outlined),
            ],
          ),
          const SizedBox(height: 8),
          Text(lastWatered),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: isWatering || !canWater ? null : onWater,
            icon: isWatering
                ? const SizedBox.square(
                    dimension: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.water_drop),
            label: Text(isWatering ? 'Watering…' : canWater ? 'Water now' : 'Cooldown active'),
          ),
        ],
      ),
    );
  }

  String _relative(DateTime time, DateTime now) {
    final diff = now.difference(time);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
