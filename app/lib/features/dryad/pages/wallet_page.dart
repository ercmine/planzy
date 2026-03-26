import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';

class DryadWalletPage extends ConsumerStatefulWidget {
  const DryadWalletPage({super.key});

  @override
  ConsumerState<DryadWalletPage> createState() => _DryadWalletPageState();
}

class _DryadWalletPageState extends ConsumerState<DryadWalletPage> {
  bool _isConnecting = false;
  String? _connectionMessage;

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(dryadContractConfigProvider);
    final wallet = ref.watch(walletAddressProvider);
    final snapshot = ref.watch(groveNftSnapshotProvider);
    final connector = ref.watch(walletConnectorProvider);

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
                  FilledButton(
                    onPressed: _isConnecting ? null : _connectBrowserWallet,
                    child: Text(_isConnecting ? 'Connecting…' : 'Connect wallet'),
                  ),
                  OutlinedButton(onPressed: () => _launchWallet('metamask://'), child: const Text('Open MetaMask')),
                  OutlinedButton(onPressed: () => _launchWallet('phantom://'), child: const Text('Open Phantom')),
                  OutlinedButton(onPressed: () => _launchWallet('https://go.cb-w.com/'), child: const Text('Open Coinbase Wallet')),
                ],
              ),
              if (!connector.isAvailable) ...[
                const SizedBox(height: 8),
                const Text('No browser wallet provider detected here. Install a wallet extension and use this page in a wallet-enabled browser, or connect from onboarding.'),
              ],
              if (_connectionMessage != null) ...[
                const SizedBox(height: 8),
                Text(_connectionMessage!),
              ],
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

  Future<void> _connectBrowserWallet() async {
    final connector = ref.read(walletConnectorProvider);
    if (!connector.isAvailable) {
      setState(() {
        _connectionMessage = 'Wallet app links only open the wallet. To actually connect, use the Connect wallet button in a browser with MetaMask/Phantom extension enabled.';
      });
      return;
    }

    setState(() {
      _isConnecting = true;
      _connectionMessage = null;
    });

    try {
      final account = await connector.connectWallet();
      ref.read(walletAddressProvider.notifier).state = account;
      setState(() {
        _connectionMessage = 'Connected: $account';
      });
    } catch (error) {
      setState(() {
        _connectionMessage = 'Wallet connection failed: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isConnecting = false;
        });
      }
    }
  }

  Future<void> _launchWallet(String uri) async {
    await launchUrl(Uri.parse(uri), mode: LaunchMode.externalApplication);
  }
}
