import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/widgets.dart';
import '../../core/identity/identity_provider.dart';
import '../perbug/chain/perbug_chain_providers.dart';
import '../home/perbug_asset_models.dart';
import '../home/perbug_game_controller.dart';

class PerbugLearnMorePage extends ConsumerWidget {
  const PerbugLearnMorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return AppScaffold(
      backgroundStyle: PerbugBackgroundStyle.strongerScrim,
      padding: EdgeInsets.zero,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFFFFE2A6),
        title: const Text('Perbug World Primer'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            PremiumHeader(
              title: 'The map is the game',
              subtitle: 'Perbug turns your world into an RPG strategy board with districts, nodes, events, and progression loops.',
              badge: const AppPill(label: 'Web + Mobile world map', icon: Icons.public),
            ),
            const SizedBox(height: 12),
            Text(
              'Command Loop',
              style: theme.textTheme.titleLarge?.copyWith(
                color: const Color(0xFFFFE2A6),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            const _LoreCard(
              title: '1) Launch + Identity',
              body: 'Connect wallet or continue in demo mode. Both paths keep the map playable and unlock a stable game entry.',
              icon: Icons.login,
            ),
            const _LoreCard(
              title: '2) Enter World Map',
              body: 'Inspect districts, routes, and categorized nodes. Choose where to travel based on energy and mission priorities.',
              icon: Icons.map,
            ),
            const _LoreCard(
              title: '3) Resolve Encounters',
              body: 'Launch encounters, harvest resources, and complete objectives. Rewards feed inventory, crafting, and squad power.',
              icon: Icons.sports_martial_arts,
            ),
            const _LoreCard(
              title: '4) Progress Campaign',
              body: 'Upgrade your squad, craft gear, and push into tougher routes. Return to map for the next tactical decision.',
              icon: Icons.trending_up,
            ),
            const SizedBox(height: 8),
            AppCard(
              tone: AppCardTone.collection,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Mode Support', style: TextStyle(fontWeight: FontWeight.w700)),
                  SizedBox(height: 8),
                  Text('• Real-world anchored mode via location permission.'),
                  Text('• Demo region fallback if location is denied/unavailable.'),
                  Text('• Switch to location mode anytime from the world map CTA.'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => _enterDemoMode(context, ref),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Continue in Demo Mode'),
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
    return AppCard(
      margin: const EdgeInsets.only(bottom: 12),
      tone: AppCardTone.muted,
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
    );
  }
}
