import 'package:flutter/foundation.dart';

@immutable
class DryadContractConfig {
  const DryadContractConfig({
    required this.chainId,
    required this.networkName,
    required this.nativeSymbol,
    required this.explorerBaseUrl,
    required this.dryadTokenAddress,
    required this.groveNftAddress,
  });

  final int chainId;
  final String networkName;
  final String nativeSymbol;
  final String explorerBaseUrl;
  final String dryadTokenAddress;
  final String groveNftAddress;

  String tokenExplorerUrl(String address) => '$explorerBaseUrl/token/$address';
  String addressExplorerUrl(String address) => '$explorerBaseUrl/address/$address';
}

class DryadChainConfig {
  static const DryadContractConfig mainnet = DryadContractConfig(
    chainId: 1,
    networkName: 'Ethereum Mainnet',
    nativeSymbol: 'ETH',
    explorerBaseUrl: 'https://etherscan.io',
    dryadTokenAddress: '0x3ce1a70b2fa66bddc7d2e870af47838863915051',
    groveNftAddress: '0x24858795997a0d9c7686451c010fa78de2a9584d',
  );

  static const DryadContractConfig defaultConfig = mainnet;
}
