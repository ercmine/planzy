import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/identity/identity_provider.dart';
import '../features/home/home_page.dart';
import '../features/onboarding/bootstrap_page.dart';
import '../features/onboarding/onboarding_intro_page.dart';

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
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final path = state.uri.path;
      final isOnboardingRoute = path == '/onboarding' || path.startsWith('/onboarding/');
      final isBootstrapRoute = path == '/bootstrap';
      final introGateState = ref.read(onboardingIntroRequiredProvider);

      if (introGateState.isLoading || introGateState.hasError) {
        return isBootstrapRoute ? null : '/bootstrap';
      }

      final requiresIntro = introGateState.valueOrNull ?? false;
      if (requiresIntro && !isOnboardingRoute) return '/onboarding';
      if (!requiresIntro && (isOnboardingRoute || isBootstrapRoute)) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/bootstrap', name: 'bootstrap', builder: (context, state) => const BootstrapPage()),
      GoRoute(path: '/onboarding', name: 'onboarding', builder: (context, state) => const OnboardingIntroPage()),
      GoRoute(path: '/', name: 'home', builder: (context, state) => const HomePage()),
      GoRoute(path: '/world', name: 'world', builder: (context, state) => const HomePage(initialTab: HomeTab.world)),
      GoRoute(path: '/collection', name: 'collection', builder: (context, state) => const HomePage(initialTab: HomeTab.collection)),
      GoRoute(path: '/profile', name: 'profile', builder: (context, state) => const HomePage(initialTab: HomeTab.profile)),
    ],
  );
});
