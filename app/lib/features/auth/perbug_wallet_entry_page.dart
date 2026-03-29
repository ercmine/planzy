import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/assets.dart';
import '../../app/theme/rpg_bar.dart';
import '../../core/identity/identity_provider.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../home/perbug_asset_models.dart';
import '../home/perbug_game_controller.dart';

class PerbugWalletEntryPage extends ConsumerStatefulWidget {
  const PerbugWalletEntryPage({super.key});

  @override
  ConsumerState<PerbugWalletEntryPage> createState() => _PerbugWalletEntryPageState();
}

class _PerbugWalletEntryPageState extends ConsumerState<PerbugWalletEntryPage> {
  bool _restoring = true;
  bool _connecting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final store = await ref.read(identityStoreProvider.future);
      final restored = await store.getWalletSessionAddress();
      if (!mounted) return;
      if (restored != null && restored.trim().isNotEmpty) {
        ref.read(walletAddressProvider.notifier).state = restored;
        await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
          walletAddress: restored,
          status: AssetLinkStatus.linked,
        );
        if (!mounted) return;
        context.go(AppRoutes.liveMap);
        return;
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Session restore failed. You can reconnect your wallet manually.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _restoring = false;
        });
      }
    }
  }

  Future<void> _connectWallet({String? walletId}) async {
    final connector = ref.read(walletConnectorProvider);
    setState(() {
      _error = null;
      _connecting = true;
    });

    try {
      final account = await connector.connectWallet(walletId: walletId);
      if (!mounted) return;
      ref.read(walletAddressProvider.notifier).state = account;
      final store = await ref.read(identityStoreProvider.future);
      await store.setWalletSessionAddress(account);
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
        walletAddress: account,
        status: AssetLinkStatus.linked,
      );
      if (!mounted) return;
      context.go(AppRoutes.liveMap);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not connect wallet: $error';
      });
      await ref.read(perbugGameControllerProvider.notifier).setWalletLink(
        status: AssetLinkStatus.failed,
      );
    } finally {
      if (mounted) {
        setState(() {
          _connecting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.file(
            File(AppAssets.perbugLoginBackdropAbsolutePath),
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF120A20), Color(0xFF261537), Color(0xFF56366D)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
          Container(color: Colors.black.withOpacity(0.48)),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Spacer(),
                      Text(
                        'Perbug',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.displayLarge?.copyWith(
                          color: const Color(0xFFFFE2A6),
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3.2,
                          shadows: const [
                            Shadow(color: Color(0xDD000000), blurRadius: 14, offset: Offset(0, 3)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'Command the frontier. Connect your wallet to deploy into the live world map.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 24),
                      RpgBarButton(
                        label: _restoring ? 'Restoring session…' : 'Connect Wallet',
                        isLoading: _restoring || _connecting,
                        icon: const Icon(Icons.account_balance_wallet_rounded),
                        onPressed: (_restoring || _connecting) ? null : () => _connectWallet(),
                      ),
                      const SizedBox(height: 10),
                      RpgBarButton(
                        label: 'Connect with MetaMask',
                        variant: RpgButtonVariant.secondary,
                        onPressed: (_restoring || _connecting) ? null : () => _connectWallet(walletId: 'metamask'),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFFFFD5D5)),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        'No onboarding gate. Login enters the live map directly.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
