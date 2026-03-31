import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'chain/perbug_chain_providers.dart';
import 'perbug_repository.dart';
import 'models/perbug_models.dart';

final perbugRepositoryProvider = FutureProvider<PerbugRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return PerbugRepository(apiClient: apiClient);
});

final plantingTreesProvider = FutureProvider<List<PerbugTree>>((ref) async {
  final repo = await ref.watch(perbugRepositoryProvider.future);
  return repo.fetchPlanting();
});

final marketplaceTreesProvider = FutureProvider<List<PerbugTree>>((ref) async {
  final repo = await ref.watch(perbugRepositoryProvider.future);
  return repo.fetchMarketplace();
});

final ownedTreesProvider = FutureProvider<List<PerbugTree>>((ref) async {
  final wallet = ref.watch(walletAddressProvider);
  if (wallet == null || wallet.trim().isEmpty) return const <PerbugTree>[];
  final repo = await ref.watch(perbugRepositoryProvider.future);
  return repo.fetchOwnedTrees(wallet: wallet);
});

final treeDetailProvider = FutureProvider.family<PerbugTree?, String>((ref, treeId) async {
  final repo = await ref.watch(perbugRepositoryProvider.future);
  return repo.fetchTree(treeId);
});

final connectedWalletLabelProvider = Provider<String>((ref) {
  final wallet = ref.watch(walletAddressProvider);
  if (wallet == null || wallet.isEmpty) return 'Disconnected';
  final prefix = wallet.substring(0, 6);
  final suffix = wallet.substring(wallet.length - 4);
  return '$prefix...$suffix';
});
