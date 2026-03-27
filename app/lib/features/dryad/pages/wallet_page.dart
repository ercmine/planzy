import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

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
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _attachWalletListeners();
    });
  }

  @override
  void dispose() {
    ref.read(walletConnectorProvider).detachSessionListeners();
    super.dispose();
  }

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
                    onPressed: _isConnecting ? null : () => _connectBrowserWallet(walletId: 'metamask'),
                    child: Text(_isConnecting ? 'Connecting…' : 'Connect MetaMask'),
                  ),
                  OutlinedButton(
                    onPressed: _isConnecting ? null : () => _connectBrowserWallet(walletId: 'phantom'),
                    child: const Text('Connect Phantom (EVM)'),
                  ),
                  OutlinedButton(
                    onPressed: _isConnecting ? null : () => _connectBrowserWallet(walletId: 'coinbase'),
                    child: const Text('Connect Coinbase Wallet'),
                  ),
                  OutlinedButton(
                    onPressed: _isConnecting ? null : () => _connectBrowserWallet(),
                    child: const Text('Connect detected wallet'),
                  ),
                ],
              ),
              if (!connector.isAvailable) ...[
                const SizedBox(height: 8),
                const Text('No injected EVM provider detected. Install MetaMask, Phantom EVM, or Coinbase Wallet extension and refresh.'),
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

  Future<void> _connectBrowserWallet({String? walletId}) async {
    final connector = ref.read(walletConnectorProvider);
    if (!connector.isAvailable) {
      setState(() {
        _connectionMessage = 'Wallet connect is unavailable in this environment. Install a supported browser extension and retry.';
      });
      return;
    }

    if (walletId != null && !connector.isWalletInstalled(walletId)) {
      setState(() {
        _connectionMessage = '$walletId is not installed in this browser.';
      });
      return;
    }

    setState(() {
      _isConnecting = true;
      _connectionMessage = null;
    });

    try {
      final account = await connector.connectWallet(walletId: walletId);
      _attachWalletListeners();
      ref.read(walletAddressProvider.notifier).state = account;
      final config = ref.read(dryadContractConfigProvider);
      final activeChain = await connector.readChainId(walletId: walletId);
      if (activeChain != config.chainId) {
        final switched = await connector.switchChain(
          chainId: config.chainId,
          chainName: config.networkName,
          rpcUrl: config.rpcUrl,
          nativeCurrencySymbol: config.nativeSymbol,
          explorerUrl: config.explorerBaseUrl,
          walletId: walletId,
        );
        final nextChain = await connector.readChainId(walletId: walletId);
        setState(() {
          _connectionMessage = switched
              ? 'Connected: $account • switched to ${config.networkName} (chain $nextChain)'
              : 'Connected: $account • wrong network (chain $activeChain). Switch to ${config.networkName}.';
        });
        return;
      }
      setState(() {
        _connectionMessage = 'Connected: $account • ${config.networkName}';
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

  void _attachWalletListeners() {
    final connector = ref.read(walletConnectorProvider);
    connector.attachSessionListeners(
      onAccountChanged: (account) {
        ref.read(walletAddressProvider.notifier).state = account;
        if (!mounted) return;
        setState(() {
          _connectionMessage = account == null ? 'Wallet disconnected.' : 'Active account: $account';
        });
      },
      onChainChanged: (chainId) {
        final expectedChain = ref.read(dryadContractConfigProvider).chainId;
        if (!mounted) return;
        setState(() {
          _connectionMessage = chainId == expectedChain
              ? 'Connected to expected network (chain $chainId).'
              : 'Wrong network detected (chain $chainId). Switch to chain $expectedChain.';
        });
      },
      onDisconnected: (reason) {
        ref.read(walletAddressProvider.notifier).state = null;
        if (!mounted) return;
        setState(() {
          _connectionMessage = 'Wallet disconnected: $reason';
        });
      },
    );
  }
}
