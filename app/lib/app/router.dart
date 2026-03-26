import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/identity/identity_provider.dart';
import '../features/dryad/pages/tree_page.dart';
import '../features/home/home_page.dart';
import '../features/onboarding/bootstrap_page.dart';
import '../features/onboarding/onboarding_discovery_page.dart';
import '../features/onboarding/onboarding_interests_page.dart';
import '../features/onboarding/onboarding_intro_page.dart';
import '../features/onboarding/onboarding_location_page.dart';

final onboardingGateProvider = Provider<ChangeNotifier>((ref) {
  final gate = ValueNotifier<int>(0);
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
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final path = state.uri.path;
      final isOnboardingRoute = path == '/onboarding' || path.startsWith('/onboarding/');
      final isBootstrapRoute = path == '/bootstrap';
      final onboardingState = ref.read(onboardingCompletedProvider);

      if (onboardingState.isLoading || onboardingState.hasError) {
        return isBootstrapRoute ? null : '/bootstrap';
      }

      final hasCompleted = onboardingState.valueOrNull ?? false;

      if (!hasCompleted && !isOnboardingRoute) return '/onboarding';
      if (hasCompleted && (path == '/onboarding' || isBootstrapRoute)) return '/';
      if (!hasCompleted && isBootstrapRoute) return '/onboarding';
      return null;
    },
    routes: [
      GoRoute(path: '/bootstrap', name: 'bootstrap', builder: (context, state) => const BootstrapPage()),
      GoRoute(path: '/onboarding', name: 'onboarding', builder: (context, state) => const OnboardingIntroPage()),
      GoRoute(path: '/onboarding/interests', name: 'onboarding-interests', builder: (context, state) => const OnboardingInterestsPage()),
      GoRoute(path: '/onboarding/location', name: 'onboarding-location', builder: (context, state) => const OnboardingLocationPage()),
      GoRoute(path: '/onboarding/discovery', name: 'onboarding-discovery', builder: (context, state) => const OnboardingDiscoveryPage()),
      GoRoute(path: '/', name: 'home', builder: (context, state) => const HomePage()),
      GoRoute(path: '/map', name: 'map', builder: (context, state) => const HomePage(initialTab: HomeTab.map)),
      GoRoute(path: '/market', name: 'market', builder: (context, state) => const HomePage(initialTab: HomeTab.market)),
      GoRoute(path: '/wallet', name: 'wallet', builder: (context, state) => const HomePage(initialTab: HomeTab.wallet)),
      GoRoute(path: '/grove', name: 'grove', builder: (context, state) => const HomePage(initialTab: HomeTab.grove)),
      GoRoute(path: '/profile', name: 'profile', builder: (context, state) => const HomePage(initialTab: HomeTab.profile)),
      GoRoute(
        path: '/tree/:id',
        name: 'tree',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return DryadTreePage(treeId: id);
        },
      ),
    ],
  );
});
