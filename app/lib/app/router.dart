import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/perbug_learn_more_page.dart';
import '../features/auth/perbug_wallet_entry_page.dart';
import '../core/identity/identity_provider.dart';
import '../features/dryad/chain/dryad_chain_providers.dart';
import '../features/home/home_page.dart';
import '../features/home/perbug_flow_pages.dart';
import '../features/home/perbug_navigation_debug_page.dart';
import 'app_routes.dart';

final authGateProvider = Provider<ChangeNotifier>((ref) {
  final gate = ValueNotifier<int>(0);
  ref.listen<String?>(
    walletAddressProvider,
    (_, __) => gate.value++,
    fireImmediately: true,
  );
  ref.listen<EntryAuthMode>(
    entryAuthModeProvider,
    (_, __) => gate.value++,
    fireImmediately: true,
  );
  ref.onDispose(gate.dispose);
  return gate;
});

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = ref.watch(authGateProvider);

  return GoRouter(
    initialLocation: AppRoutes.entry,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final path = state.uri.path;
      final wallet = ref.read(walletAddressProvider);
      final authMode = ref.read(entryAuthModeProvider);
      final hasWalletSession = wallet != null && wallet.trim().isNotEmpty;
      final hasDemoSession = authMode == EntryAuthMode.demo;
      final onEntry = path == AppRoutes.entry;
      final onLearnMore = path == AppRoutes.learnMore;
      final isAllowedUnauthed = onEntry || onLearnMore;
      final canEnterGame = hasWalletSession || hasDemoSession;

      if (!canEnterGame && !isAllowedUnauthed) return AppRoutes.entry;
      if (canEnterGame && onEntry) return AppRoutes.liveMap;
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.entry, name: 'entry', builder: (context, state) => const PerbugWalletEntryPage()),
      GoRoute(path: AppRoutes.home, name: 'home', builder: (context, state) => const HomePage()),
      GoRoute(path: AppRoutes.liveMap, name: 'live-map', builder: (context, state) => const HomePage(initialTab: HomeTab.world)),
      GoRoute(path: AppRoutes.world, name: 'world', builder: (context, state) => const HomePage(initialTab: HomeTab.world)),
      GoRoute(path: AppRoutes.collection, name: 'collection', builder: (context, state) => const HomePage(initialTab: HomeTab.collection)),
      GoRoute(path: AppRoutes.profile, name: 'profile', builder: (context, state) => const HomePage(initialTab: HomeTab.profile)),
      GoRoute(path: AppRoutes.squad, name: 'squad', builder: (context, state) => const PerbugSquadPage()),
      GoRoute(path: AppRoutes.inventory, name: 'inventory', builder: (context, state) => const PerbugInventoryPage()),
      GoRoute(path: AppRoutes.crafting, name: 'crafting', builder: (context, state) => const PerbugCraftingPage()),
      GoRoute(path: AppRoutes.marketplace, name: 'marketplace', builder: (context, state) => const PerbugMarketplacePage()),
      GoRoute(path: AppRoutes.progression, name: 'progression', builder: (context, state) => const PerbugProgressionPage()),
      GoRoute(path: AppRoutes.nodeDetails, name: 'node-details', builder: (context, state) => const PerbugNodeDetailsPage()),
      GoRoute(path: AppRoutes.encounter, name: 'encounter', builder: (context, state) => const PerbugEncounterPage()),
      GoRoute(path: AppRoutes.wallet, name: 'wallet', builder: (context, state) => const PerbugWalletPage()),
      GoRoute(path: AppRoutes.learnMore, name: 'learn-more', builder: (context, state) => const PerbugLearnMorePage()),
      GoRoute(path: '/debug/navigation', name: 'debug-navigation', builder: (context, state) => const PerbugNavigationDebugPage()),
    ],
  );
});
