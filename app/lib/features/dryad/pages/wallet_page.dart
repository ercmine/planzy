import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../../../config/dryad_chain_config.dart';
import '../data/dryad_seed_data.dart';

class DryadWalletPage extends StatelessWidget {
  const DryadWalletPage({super.key});

  @override
  Widget build(BuildContext context) {
    final config = DryadChainConfig.defaultConfig;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Dryad Wallet',
          subtitle: 'Manage DRYAD, ETH, supported ERC-20 balances, and tree NFT ownership.',
          badge: AppPill(label: 'Wallet', icon: Icons.account_balance_wallet_outlined),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Network: ${config.networkName} (${config.chainId})'),
              const SizedBox(height: 6),
              SelectableText('Dryad token: ${config.dryadTokenAddress}'),
              const SizedBox(height: 4),
              SelectableText('Grove/tree NFT: ${config.groveNftAddress}'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ...DryadSeedData.walletAssets.map(
          (asset) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: ListTile(
                title: Text(asset.symbol),
                subtitle: Text(asset.fiatValue),
                trailing: Text(asset.balance),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
