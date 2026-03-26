import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';

class DryadWalletPage extends ConsumerWidget {
  const DryadWalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(dryadContractConfigProvider);
    final wallet = ref.watch(walletAddressProvider);
    final snapshot = ref.watch(groveNftSnapshotProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Dryad Wallet',
          subtitle: 'Live on-chain NFT status and artwork sourced from tokenURI/image_data SVG.',
          badge: AppPill(label: 'Wallet', icon: Icons.account_balance_wallet_outlined),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Network: ${config.networkName} (${config.chainId})'),
              const SizedBox(height: 6),
              SelectableText('RPC: ${config.rpcUrl}'),
              const SizedBox(height: 4),
              SelectableText('NFT: ${config.groveNftAddress}'),
              if (wallet != null) ...[
                const SizedBox(height: 4),
                SelectableText('Connected wallet: $wallet'),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        snapshot.when(
          data: (value) {
            if (value == null) return const AppCard(child: Text('No wallet connected in onboarding yet.'));
            final svg = value.artwork?.svgMarkup;
            if (svg == null) {
              return AppCard(child: Text(value.hasNft ? 'NFT found but no SVG render path was available.' : 'No NFT owned yet.'));
            }
            return AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Token #${value.tokenId}'),
                  const SizedBox(height: 8),
                  Center(child: SvgPicture.string(svg, height: 240)),
                ],
              ),
            );
          },
          error: (error, _) => AppCard(child: Text('Could not read NFT from contract: $error')),
          loading: () => const AppCard(child: LinearProgressIndicator()),
        ),
      ],
    );
  }
}
