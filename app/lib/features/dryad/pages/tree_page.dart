import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';
import '../chain/seed_codec.dart';
import '../dryad_providers.dart';
import '../models/dryad_models.dart';

const _digUpFeeWei = '100000000000000000';
const _digUpRecipient = '0xB7cfa0de6975311DD0fFF05f71FD2110caC0B227';

class DryadTreePage extends ConsumerWidget {
  const DryadTreePage({super.key, required this.treeId});

  final String treeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treeAsync = ref.watch(treeDetailProvider(treeId));
    final wallet = ref.watch(walletAddressProvider);

    return AppScaffold(
      appBar: AppBar(title: const Text('Tree detail')),
      body: treeAsync.when(
        data: (tree) {
          if (tree == null) return const Center(child: Text('Tree not found.'));
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AspectRatio(aspectRatio: 16 / 9, child: _TreeImage(tree: tree)),
              ),
              const SizedBox(height: 10),
              AppCard(
                tone: AppCardTone.featured,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tree.name, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 6),
                    Text('${tree.placeName} • ${tree.locationLabel}'),
                    const SizedBox(height: 6),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      AppPill(label: tree.statusLabel, icon: Icons.park_outlined),
                      AppPill(label: tree.lifecycleLabel, icon: Icons.sync_alt_outlined),
                      AppPill(label: 'Owner ${tree.ownerHandle}', icon: Icons.person_outline),
                      if (tree.isPortable) const AppPill(label: 'Portable', icon: Icons.luggage_outlined),
                      if (tree.isListed) AppPill(label: '${tree.priceEth?.toStringAsFixed(2)} ETH', icon: Icons.sell_outlined),
                    ]),
                    const SizedBox(height: 8),
                    Text('Spot: ${tree.currentSpotId ?? 'Not planted'}'),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _Actions(tree: tree, wallet: wallet),
            ],
          );
        },
        error: (error, _) => Center(child: Text('Could not load tree: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _Actions extends ConsumerStatefulWidget {
  const _Actions({required this.tree, required this.wallet});

  final DryadTree tree;
  final String? wallet;

  @override
  ConsumerState<_Actions> createState() => _ActionsState();
}

class _ActionsState extends ConsumerState<_Actions> {
  bool _isProcessing = false;

  Future<void> _claimAndPlant() async {
    if (widget.wallet == null) return;
    final seedInput = await _promptPlantSeed();
    if (seedInput == null) return;
    final seedValidation = validatePlantSeed(seedInput);
    if (!seedValidation.isValid || seedValidation.normalizedSeedHex == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(seedValidation.errorMessage ?? 'Invalid seed.')));
      return;
    }
    final repo = await ref.read(dryadRepositoryProvider.future);
    await repo.claimAndPlant(widget.tree.id, wallet: widget.wallet!, seed: seedValidation.normalizedSeedHex!);
    _refresh();
  }

  Future<String?> _promptPlantSeed() async {
    final controller = TextEditingController();
    String? value;
    await showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final validation = validatePlantSeed(controller.text);
          return AlertDialog(
            title: const Text('Plant with seed'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Your seed is submitted to the live plant(bytes32) contract call and shapes the resulting tree.'),
                const SizedBox(height: 10),
                TextField(
                  controller: controller,
                  decoration: const InputDecoration(
                    labelText: 'Seed',
                    hintText: 'Text (<=32 bytes) or 0x + 64 hex chars',
                  ),
                  onChanged: (_) => setDialogState(() {}),
                ),
                if (!validation.isValid && controller.text.trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(validation.errorMessage ?? 'Invalid seed.', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: validation.isValid
                    ? () {
                        value = controller.text;
                        Navigator.pop(context);
                      }
                    : null,
                child: const Text('Continue'),
              ),
            ],
          );
        },
      ),
    );
    controller.dispose();
    return value;
  }

  Future<void> _buy() async {
    if (widget.wallet == null) return;
    final repo = await ref.read(dryadRepositoryProvider.future);
    await repo.buyTree(widget.tree.id, buyerWallet: widget.wallet!);
    _refresh();
  }

  Future<void> _list() async {
    if (widget.wallet == null) return;
    final repo = await ref.read(dryadRepositoryProvider.future);
    await repo.listTree(widget.tree.id, wallet: widget.wallet!, priceEth: widget.tree.priceEth ?? 0.2);
    _refresh();
  }

  Future<void> _unlist() async {
    if (widget.wallet == null) return;
    final repo = await ref.read(dryadRepositoryProvider.future);
    await repo.unlistTree(widget.tree.id, wallet: widget.wallet!);
    _refresh();
  }

  Future<void> _digUp() async {
    final wallet = widget.wallet;
    if (wallet == null) return;
    setState(() => _isProcessing = true);

    try {
      final config = ref.read(dryadContractConfigProvider);
      final connector = ref.read(walletConnectorProvider);
      final repo = await ref.read(dryadRepositoryProvider.future);

      if (!connector.isAvailable) throw StateError('Connect a browser wallet first.');
      final connectedChainId = await connector.readChainId();
      if (connectedChainId != config.chainId) throw StateError('Wrong network. Switch to chain ${config.chainId}.');

      final eligibility = await repo.digUpEligibility(widget.tree.id, wallet: wallet);
      if (eligibility['eligible'] != true) throw StateError('Tree is not eligible: ${eligibility['reason'] ?? 'unknown'}');

      final intent = await repo.createDigUpIntent(widget.tree.id, wallet: wallet, chainId: config.chainId);
      final txHash = await connector.sendTransaction(
        from: wallet,
        to: _digUpRecipient,
        data: '0x',
        valueHex: '0x${BigInt.parse(_digUpFeeWei).toRadixString(16)}',
      );

      await repo.confirmDigUpIntent(
        intentId: (intent['intentId'] ?? '').toString(),
        paymentTxHash: txHash,
        from: wallet,
        to: _digUpRecipient,
        valueWei: _digUpFeeWei,
        chainId: config.chainId,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Dig-up confirmed. Tree is now portable and ready to replant.')));
      _refresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Dig-up failed: $error')));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _startReplant() async {
    final wallet = widget.wallet;
    if (wallet == null) return;
    setState(() => _isProcessing = true);
    try {
      final repo = await ref.read(dryadRepositoryProvider.future);
      final spots = await repo.fetchUnclaimedSpots();
      final available = spots.where((spot) => spot.isUnclaimed).toList(growable: false);
      if (available.isEmpty) throw StateError('No unclaimed spots available.');

      String? selected = available.first.spotId;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Replant tree'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Select an unclaimed spot for this portable tree.'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selected,
                  items: available
                      .map((spot) => DropdownMenuItem<String>(
                            value: spot.spotId,
                            child: Text('${spot.label} (${spot.spotId})'),
                          ))
                      .toList(growable: false),
                  onChanged: (value) => setDialogState(() => selected = value),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm replant')),
            ],
          ),
        ),
      );
      if (confirmed != true || selected == null) return;

      final intentId = await repo.createReplantIntent(treeId: widget.tree.id, wallet: wallet, nextSpotId: selected!);
      await repo.confirmReplantIntent(intentId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Replant complete. Tree has a new planted location.')));
      _refresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Replant failed: $error')));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _refresh() {
    ref.invalidate(treeDetailProvider(widget.tree.id));
    ref.invalidate(marketplaceTreesProvider);
    ref.invalidate(plantingTreesProvider);
  }

  @override
  Widget build(BuildContext context) {
    final canDigUp = widget.wallet != null &&
        widget.tree.ownerHandle.toLowerCase() == widget.wallet!.toLowerCase() &&
        !widget.tree.isPortable &&
        !widget.tree.isListed;

    final canReplant = widget.wallet != null &&
        widget.tree.ownerHandle.toLowerCase() == widget.wallet!.toLowerCase() &&
        widget.tree.readyToReplant;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Ownership & marketplace actions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: _isProcessing || widget.wallet == null || widget.tree.claimState == TreeClaimState.unavailable ? null : _claimAndPlant,
                icon: const Icon(Icons.forest_outlined),
                label: const Text('CLAIM AND PLANT'),
              ),
              if (widget.tree.isListed)
                FilledButton.icon(onPressed: _isProcessing || widget.wallet == null ? null : _buy, icon: const Icon(Icons.shopping_cart_checkout), label: const Text('Buy')),
              if (!widget.tree.isListed)
                OutlinedButton.icon(onPressed: _isProcessing || widget.wallet == null ? null : _list, icon: const Icon(Icons.sell_outlined), label: const Text('List tree')),
              if (widget.tree.isListed)
                OutlinedButton.icon(onPressed: _isProcessing || widget.wallet == null ? null : _unlist, icon: const Icon(Icons.cancel_outlined), label: const Text('Unlist')),
              FilledButton.icon(
                onPressed: _isProcessing || !canDigUp ? null : _digUp,
                icon: const Icon(Icons.grass_outlined),
                label: const Text('DIG UP (0.1 ETH)'),
              ),
              OutlinedButton.icon(
                onPressed: _isProcessing || !canReplant ? null : _startReplant,
                icon: const Icon(Icons.my_location_outlined),
                label: const Text('Replant'),
              ),
            ],
          ),
          if (_isProcessing) ...const [SizedBox(height: 8), LinearProgressIndicator()],
          const SizedBox(height: 8),
          const Text('Dig up sends exactly 0.1 ETH to 0xB7cfa0de6975311DD0fFF05f71FD2110caC0B227.'),
        ],
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
    if (image == null || image.isEmpty) return Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56));
    final url = image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/${image.replaceFirst('ipfs://', '')}' : image;
    return Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56)));
  }
}
