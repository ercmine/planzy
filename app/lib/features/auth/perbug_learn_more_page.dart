import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../core/identity/identity_provider.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../home/perbug_asset_models.dart';
import '../home/perbug_game_controller.dart';

class PerbugLearnMorePage extends ConsumerWidget {
  const PerbugLearnMorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFF0E0A18),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFFFFE2A6),
        title: const Text('What is Perbug?'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text(
              'A fantasy strategy RPG layered over the real world map.',
              style: theme.textTheme.titleLarge?.copyWith(
                color: const Color(0xFFFFE2A6),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 14),
            _LoreCard(
              title: 'World Loop',
              body:
                  'Scout nearby regions, jump node-to-node, and resolve encounters to earn Perbug, materials, and squad XP.',
              icon: Icons.public,
            ),
            _LoreCard(
              title: 'Squad Tactics',
              body:
                  'Build a team of specialized units, upgrade them over time, and route around rare, boss, and resource nodes.',
              icon: Icons.shield_moon,
            ),
            _LoreCard(
              title: 'Wallet Link',
              body:
                  'Your wallet ties your identity to live progression and asset-linked systems so your campaign can travel with you.',
              icon: Icons.account_balance_wallet,
            ),
            _LoreCard(
              title: 'Demo Mode',
              body:
                  'No wallet available yet? Enter Demo Mode to open the live map, try squad systems, and explore progression offline.',
              icon: Icons.videogame_asset,
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => _enterDemoMode(context, ref),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Try Demo Mode'),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back_rounded),
              label: const Text('Back to Entry Gate'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _enterDemoMode(BuildContext context, WidgetRef ref) async {
    final store = await ref.read(identityStoreProvider.future);
    await store.getOrCreateDemoSessionId();
    await store.setWalletSessionAddress(null);
    await store.setAuthMode('demo');
    ref.read(walletAddressProvider.notifier).state = null;
    ref.read(entryAuthModeProvider.notifier).state = EntryAuthMode.demo;
    await ref.read(perbugGameControllerProvider.notifier).setWalletLink(status: AssetLinkStatus.pendingSync);
    if (!context.mounted) return;
    context.go(AppRoutes.liveMap);
  }
}

class _LoreCard extends StatelessWidget {
  const _LoreCard({
    required this.title,
    required this.body,
    required this.icon,
  });

  final String title;
  final String body;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: const Color(0xCC1E1631),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFF7FD9FF)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: const Color(0xFFFFE2A6),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70, height: 1.35),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
