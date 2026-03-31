import 'package:flutter/foundation.dart';

import '../core/env/env.dart';
import '../core/env/env_keys.dart';

@immutable
class PerbugContractConfig {
  const PerbugContractConfig({
    required this.chainId,
    required this.networkName,
    required this.nativeSymbol,
    required this.explorerBaseUrl,
    required this.rpcUrl,
    required this.perbugTokenAddress,
    required this.groveNftAddress,
    required this.mintMethodSignature,
  });

  final int chainId;
  final String networkName;
  final String nativeSymbol;
  final String explorerBaseUrl;
  final String rpcUrl;
  final String perbugTokenAddress;
  final String groveNftAddress;
  final String mintMethodSignature;

  String tokenExplorerUrl(String address) => '$explorerBaseUrl/token/$address';
  String addressExplorerUrl(String address) => '$explorerBaseUrl/address/$address';
}

class PerbugChainConfig {
  static const PerbugContractConfig mainnet = PerbugContractConfig(
    chainId: 1,
    networkName: 'Ethereum Mainnet',
    nativeSymbol: 'ETH',
    explorerBaseUrl: 'https://etherscan.io',
    rpcUrl: 'https://ethereum.publicnode.com',
    perbugTokenAddress: '0x3ce1a70b2fa66bddc7d2e870af47838863915051',
    groveNftAddress: '0x24858795997a0d9c7686451c010fa78de2a9584d',
    mintMethodSignature: 'plant(bytes32)',
  );

  static PerbugContractConfig fromEnv(EnvConfig env) {
    final map = env.rawEnv;
    final chainId = int.tryParse(map[EnvKeys.perbugChainId] ?? '') ?? mainnet.chainId;
    return PerbugContractConfig(
      chainId: chainId,
      networkName: map[EnvKeys.perbugNetworkName] ?? mainnet.networkName,
      nativeSymbol: map[EnvKeys.perbugNativeSymbol] ?? mainnet.nativeSymbol,
      explorerBaseUrl: map[EnvKeys.perbugExplorerBaseUrl] ?? mainnet.explorerBaseUrl,
      rpcUrl: map[EnvKeys.perbugRpcUrl] ?? mainnet.rpcUrl,
      perbugTokenAddress: map[EnvKeys.perbugTokenAddress] ?? mainnet.perbugTokenAddress,
      groveNftAddress: map[EnvKeys.perbugNftAddress] ?? mainnet.groveNftAddress,
      mintMethodSignature: map[EnvKeys.perbugMintMethodSignature] ?? mainnet.mintMethodSignature,
    );
  }
}
