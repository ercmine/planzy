import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'chain/dryad_chain_providers.dart';
import 'dryad_repository.dart';
import 'models/dryad_models.dart';

final dryadRepositoryProvider = FutureProvider<DryadRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return DryadRepository(apiClient: apiClient);
});

final plantingTreesProvider = FutureProvider<List<DryadTree>>((ref) async {
  final repo = await ref.watch(dryadRepositoryProvider.future);
  return repo.fetchPlanting();
});

final marketplaceTreesProvider = FutureProvider<List<DryadTree>>((ref) async {
  final repo = await ref.watch(dryadRepositoryProvider.future);
  return repo.fetchMarketplace();
});

final ownedTreesProvider = FutureProvider<List<DryadTree>>((ref) async {
  final wallet = ref.watch(walletAddressProvider);
  if (wallet == null || wallet.trim().isEmpty) return const <DryadTree>[];
  final repo = await ref.watch(dryadRepositoryProvider.future);
  return repo.fetchOwnedTrees(wallet: wallet);
});

final treeDetailProvider = FutureProvider.family<DryadTree?, String>((ref, treeId) async {
  final repo = await ref.watch(dryadRepositoryProvider.future);
  return repo.fetchTree(treeId);
});

final connectedWalletLabelProvider = Provider<String>((ref) {
  final wallet = ref.watch(walletAddressProvider);
  if (wallet == null || wallet.isEmpty) return 'Disconnected';
  final prefix = wallet.substring(0, 6);
  final suffix = wallet.substring(wallet.length - 4);
  return '$prefix...$suffix';
});
