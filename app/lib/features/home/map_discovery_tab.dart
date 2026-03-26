import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/widgets.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../dryad/dryad_providers.dart';
import '../dryad/models/dryad_models.dart';

class MapDiscoveryTab extends ConsumerStatefulWidget {
  const MapDiscoveryTab({super.key});

  @override
  ConsumerState<MapDiscoveryTab> createState() => _MapDiscoveryTabState();
}

class _MapDiscoveryTabState extends ConsumerState<MapDiscoveryTab> {
  String _sort = 'distance';
  bool _listedOnly = false;

  @override
  Widget build(BuildContext context) {
    final treesAsync = ref.watch(plantingTreesProvider);
    final wallet = ref.watch(walletAddressProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Planting',
          subtitle: 'Search-area results are now your Dryad planting surface. Discover local trees, claim, plant, and buy listed trees.',
          badge: AppPill(label: 'Claim + Plant', icon: Icons.spa_outlined),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Wrap(
            alignment: WrapAlignment.spaceBetween,
            runSpacing: 10,
            spacing: 10,
            children: [
              DropdownButton<String>(
                value: _sort,
                onChanged: (value) => setState(() => _sort = value ?? 'distance'),
                items: const [
                  DropdownMenuItem(value: 'distance', child: Text('Sort: Distance')),
                  DropdownMenuItem(value: 'newest', child: Text('Sort: Newest')),
                  DropdownMenuItem(value: 'price_low', child: Text('Sort: Price ↑')),
                ],
              ),
              FilterChip(
                label: const Text('Listed only'),
                selected: _listedOnly,
                onSelected: (value) => setState(() => _listedOnly = value),
              ),
              AppPill(
                label: wallet == null ? 'Wallet disconnected' : 'Wallet connected',
                icon: wallet == null ? Icons.link_off : Icons.link,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        treesAsync.when(
          data: (trees) {
            final ordered = [...trees];
            if (_listedOnly) {
              ordered.retainWhere((tree) => tree.isListed);
            }
            switch (_sort) {
              case 'price_low':
                ordered.sort((a, b) => (a.priceEth ?? 0).compareTo(b.priceEth ?? 0));
                break;
              case 'newest':
                ordered.sort((a, b) => b.id.compareTo(a.id));
                break;
            }

            if (ordered.isEmpty) {
              return const AppCard(child: Text('No trees match your filters in this area yet.'));
            }
            return Column(children: ordered.map((tree) => _PlantingTreeCard(tree: tree)).toList(growable: false));
          },
          error: (error, _) => AppCard(child: Text('Could not load planting area: $error')),
          loading: () => const AppCard(child: LinearProgressIndicator()),
        ),
      ],
    );
  }
}

class _PlantingTreeCard extends ConsumerWidget {
  const _PlantingTreeCard({required this.tree});

  final DryadTree tree;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wallet = ref.watch(walletAddressProvider);

    Future<void> claimAndPlant() async {
      if (wallet == null || wallet.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connect wallet first to claim and plant.')));
        return;
      }
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.claimAndPlant(tree.id, wallet: wallet);
      ref.invalidate(plantingTreesProvider);
      ref.invalidate(treeDetailProvider(tree.id));
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: _TreeImage(tree: tree),
              ),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(tree.name),
              subtitle: Text('${tree.placeName} • ${tree.locationLabel}'),
              trailing: AppPill(label: tree.statusLabel, icon: Icons.location_on_outlined),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AppPill(label: 'Owner ${tree.ownerHandle}', icon: Icons.person_outline),
                if (tree.isListed)
                  AppPill(label: '${tree.priceEth?.toStringAsFixed(2)} ETH', icon: Icons.sell_outlined)
                else
                  const AppPill(label: 'Not listed', icon: Icons.inventory_2_outlined),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: tree.claimState == TreeClaimState.unavailable ? null : claimAndPlant,
                    icon: const Icon(Icons.forest_outlined),
                    label: const Text('CLAIM AND PLANT'),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => context.push('/tree/${tree.id}'),
                  child: const Text('Details'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


class _TreeImage extends StatelessWidget {
  const _TreeImage({required this.tree});

  final DryadTree tree;

  @override
  Widget build(BuildContext context) {
    final image = tree.treeImageUrl;
    if (image == null || image.isEmpty) {
      return Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56));
    }
    final url = image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/${image.replaceFirst('ipfs://', '')}' : image;
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56)),
    );
  }
}
