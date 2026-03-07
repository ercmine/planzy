import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/identity/identity_provider.dart';
import '../features/deck/deck_page.dart';
import '../features/home/home_page.dart';
import '../features/invite/invite_page.dart';
import '../features/onboarding/onboarding_intro_page.dart';
import '../features/onboarding/onboarding_permissions_page.dart';
import '../features/onboarding/onboarding_signin_page.dart';
import '../features/results/results_page.dart';
import '../features/sessions/create_session/create_session_page.dart';
import '../features/sessions/join_session/join_session_page.dart';
import '../features/sessions/session_page.dart';
import '../features/sessions/session_settings/session_settings_page.dart';
import '../features/sessions/sessions_page.dart';

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
      final onboardingState = ref.read(onboardingCompletedProvider);

      if (onboardingState.isLoading) {
        return isOnboardingRoute ? null : '/onboarding';
      }

      final hasCompleted = onboardingState.valueOrNull ?? false;

      if (!hasCompleted && !isOnboardingRoute) {
        return '/onboarding';
      }

      if (hasCompleted && path == '/onboarding') {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingIntroPage(),
      ),
      GoRoute(
        path: '/onboarding/permissions',
        name: 'onboarding-permissions',
        builder: (context, state) => const OnboardingPermissionsPage(),
      ),
      GoRoute(
        path: '/onboarding/signin',
        name: 'onboarding-signin',
        builder: (context, state) => const OnboardingSignInPage(),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/invite/:code',
        name: 'invite',
        builder: (context, state) {
          final code = state.pathParameters['code'] ?? '';
          return InvitePage(code: code);
        },
      ),
      GoRoute(
        path: '/join/:id',
        name: 'join',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return JoinSessionPage(sessionId: id);
        },
      ),
      GoRoute(
        path: '/sessions',
        name: 'sessions',
        builder: (context, state) => const SessionsPage(),
      ),
      GoRoute(
        path: '/sessions/create',
        name: 'create-session',
        builder: (context, state) => const CreateSessionPage(),
      ),
      GoRoute(
        path: '/sessions/:id',
        name: 'session',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return SessionPage(sessionId: sessionId);
        },
      ),
      GoRoute(
        path: '/sessions/:id/deck',
        name: 'session-deck',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return DeckPage(sessionId: sessionId);
        },
      ),
      GoRoute(
        path: '/sessions/:id/results',
        name: 'session-results',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return ResultsPage(sessionId: sessionId);
        },
      ),
      GoRoute(
        path: '/sessions/:id/settings',
        name: 'session-settings',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return SessionSettingsPage(sessionId: sessionId);
        },
      ),
    ],
  );
});
