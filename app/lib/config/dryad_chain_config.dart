import 'package:flutter/foundation.dart';

import '../core/env/env.dart';
import '../core/env/env_keys.dart';

@immutable
class DryadContractConfig {
  const DryadContractConfig({
    required this.chainId,
    required this.networkName,
    required this.nativeSymbol,
    required this.explorerBaseUrl,
    required this.rpcUrl,
    required this.dryadTokenAddress,
    required this.groveNftAddress,
    required this.mintMethodSignature,
  });

  final int chainId;
  final String networkName;
  final String nativeSymbol;
  final String explorerBaseUrl;
  final String rpcUrl;
  final String dryadTokenAddress;
  final String groveNftAddress;
  final String mintMethodSignature;

  String tokenExplorerUrl(String address) => '$explorerBaseUrl/token/$address';
  String addressExplorerUrl(String address) => '$explorerBaseUrl/address/$address';
}

class DryadChainConfig {
  static const DryadContractConfig mainnet = DryadContractConfig(
    chainId: 1,
    networkName: 'Ethereum Mainnet',
    nativeSymbol: 'ETH',
    explorerBaseUrl: 'https://etherscan.io',
    rpcUrl: 'https://ethereum.publicnode.com',
    dryadTokenAddress: '0x3ce1a70b2fa66bddc7d2e870af47838863915051',
    groveNftAddress: '0x24858795997a0d9c7686451c010fa78de2a9584d',
    mintMethodSignature: 'mint()',
  );

  static DryadContractConfig fromEnv(EnvConfig env) {
    final map = env.rawEnv;
    final chainId = int.tryParse(map[EnvKeys.dryadChainId] ?? '') ?? mainnet.chainId;
    return DryadContractConfig(
      chainId: chainId,
      networkName: map[EnvKeys.dryadNetworkName] ?? mainnet.networkName,
      nativeSymbol: map[EnvKeys.dryadNativeSymbol] ?? mainnet.nativeSymbol,
      explorerBaseUrl: map[EnvKeys.dryadExplorerBaseUrl] ?? mainnet.explorerBaseUrl,
      rpcUrl: map[EnvKeys.dryadRpcUrl] ?? mainnet.rpcUrl,
      dryadTokenAddress: map[EnvKeys.dryadTokenAddress] ?? mainnet.dryadTokenAddress,
      groveNftAddress: map[EnvKeys.dryadNftAddress] ?? mainnet.groveNftAddress,
      mintMethodSignature: map[EnvKeys.dryadMintMethodSignature] ?? mainnet.mintMethodSignature,
    );
  }
}
