import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/identity/identity_provider.dart';
import '../features/home/home_page.dart';
import '../features/home/perbug_flow_pages.dart';
import '../features/home/perbug_navigation_debug_page.dart';
import '../features/onboarding/bootstrap_page.dart';
import '../features/onboarding/onboarding_discovery_page.dart';
import '../features/onboarding/onboarding_interests_page.dart';
import '../features/onboarding/onboarding_intro_page.dart';
import '../features/onboarding/onboarding_location_page.dart';
import '../features/onboarding/onboarding_permissions_page.dart';
import '../features/onboarding/onboarding_signin_page.dart';
import 'app_routes.dart';

final onboardingGateProvider = Provider<ChangeNotifier>((ref) {
  final gate = ValueNotifier<int>(0);
  ref.listen<AsyncValue<bool>>(
    onboardingIntroRequiredProvider,
    (_, __) => gate.value++,
    fireImmediately: true,
  );
  ref.listen<AsyncValue<bool>>(
    onboardingCompletedProvider,
    (_, __) => gate.value++,
    fireImmediately: true,
  );
  ref.onDispose(gate.dispose);
  return gate;
});

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = ref.watch(onboardingGateProvider);

  return GoRouter(
    initialLocation: AppRoutes.home,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final path = state.uri.path;
      final isOnboardingRoute = path == AppRoutes.onboarding || path.startsWith('${AppRoutes.onboarding}/');
      final isBootstrapRoute = path == AppRoutes.bootstrap;
      final introGateState = ref.read(onboardingIntroRequiredProvider);

      if (introGateState.isLoading || introGateState.hasError) {
        return isBootstrapRoute ? null : AppRoutes.bootstrap;
      }

      final requiresIntro = introGateState.valueOrNull ?? false;
      if (requiresIntro && !isOnboardingRoute) return AppRoutes.onboarding;
      if (!requiresIntro && (isOnboardingRoute || isBootstrapRoute)) return AppRoutes.liveMap;
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.bootstrap, name: 'bootstrap', builder: (context, state) => const BootstrapPage()),
      GoRoute(path: AppRoutes.onboarding, name: 'onboarding', builder: (context, state) => const OnboardingIntroPage()),
      GoRoute(path: AppRoutes.onboardingLocation, name: 'onboarding-location', builder: (context, state) => const OnboardingLocationPage()),
      GoRoute(path: AppRoutes.onboardingInterests, name: 'onboarding-interests', builder: (context, state) => const OnboardingInterestsPage()),
      GoRoute(path: AppRoutes.onboardingDiscovery, name: 'onboarding-discovery', builder: (context, state) => const OnboardingDiscoveryPage()),
      GoRoute(path: AppRoutes.onboardingPermissions, name: 'onboarding-permissions', builder: (context, state) => const OnboardingPermissionsPage()),
      GoRoute(path: AppRoutes.onboardingSignin, name: 'onboarding-signin', builder: (context, state) => const OnboardingSignInPage()),
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
      GoRoute(path: '/debug/navigation', name: 'debug-navigation', builder: (context, state) => const PerbugNavigationDebugPage()),
    ],
  );
});
