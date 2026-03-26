import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';

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
          title: 'Wallet',
          subtitle: 'Connect mainstream wallets for claim/plant/list/buy signing.',
          badge: AppPill(label: 'Wallet Connect', icon: Icons.account_balance_wallet_outlined),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Target network: ${config.networkName} (${config.chainId})'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton(onPressed: () => _launchWallet('metamask://'), child: const Text('MetaMask')),
                  FilledButton(onPressed: () => _launchWallet('phantom://'), child: const Text('Phantom')),
                  OutlinedButton(onPressed: () => _launchWallet('https://go.cb-w.com/'), child: const Text('Coinbase Wallet')),
                ],
              ),
              const SizedBox(height: 8),
              SelectableText('Connected wallet: ${wallet ?? 'Disconnected'}'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        snapshot.when(
          data: (value) {
            if (value == null) return const AppCard(child: Text('Connect wallet from onboarding or paste wallet there to load on-chain tree artwork.'));
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

  Future<void> _launchWallet(String uri) async {
    await launchUrl(Uri.parse(uri), mode: LaunchMode.externalApplication);
  }
}
