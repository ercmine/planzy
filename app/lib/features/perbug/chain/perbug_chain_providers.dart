import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/perbug_chain_config.dart';
import '../../../core/env/env.dart';
import '../../../providers/app_providers.dart';
import 'grove_nft_service.dart';
import 'wallet_connector.dart';

final perbugContractConfigProvider = Provider<PerbugContractConfig>((ref) {
  final env = ref.watch(envConfigProvider);
  return PerbugChainConfig.fromEnv(env);
});

final groveNftServiceProvider = Provider<GroveNftService>((ref) {
  return GroveNftService(
    httpClient: ref.watch(httpClientProvider),
    config: ref.watch(perbugContractConfigProvider),
  );
});

final walletAddressProvider = StateProvider<String?>((ref) => null);

final walletConnectorProvider = Provider<WalletConnector>((ref) => createWalletConnector());

final groveNftSnapshotProvider = FutureProvider<GroveNftSnapshot?>((ref) async {
  final wallet = ref.watch(walletAddressProvider);
  if (wallet == null || wallet.trim().isEmpty) return null;
  final service = ref.watch(groveNftServiceProvider);
  return service.fetchWalletSnapshot(wallet);
});
