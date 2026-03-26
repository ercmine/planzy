import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/identity/identity_provider.dart';
import '../features/deck/deck_page.dart';
import '../features/economy/perbug_economy_hub_page.dart';
import '../features/home/home_page.dart';
import '../features/hubs/activity_page.dart';
import '../features/hubs/planner_page.dart';
import '../features/hubs/role_hub_page.dart';
import '../features/ideas/ideas_page.dart';
import '../features/invite/invite_page.dart';
import '../features/onboarding/bootstrap_page.dart';
import '../features/onboarding/onboarding_intro_page.dart';
import '../features/onboarding/onboarding_interests_page.dart';
import '../features/onboarding/onboarding_location_page.dart';
import '../features/onboarding/onboarding_discovery_page.dart';
import '../features/place_review_editor/place_review_video_editor_screen.dart';
import '../features/results/results_page.dart';
import '../features/rewards/creator_rewards_page.dart';
import '../features/settings/settings_page.dart';
import '../features/sessions/create_session/create_session_page.dart';
import '../features/sessions/join_session/join_session_page.dart';
import '../features/sessions/session_page.dart';
import '../features/sessions/session_settings/session_settings_page.dart';
import '../features/sessions/sessions_page.dart';
import '../features/video_platform/video_models.dart';
import '../features/viewer_rewards/viewer_rewards_dashboard_page.dart';

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

      if (!hasCompleted && !isOnboardingRoute) {
        return '/onboarding';
      }

      if (hasCompleted && (path == '/onboarding' || isBootstrapRoute)) {
        return '/';
      }

      if (!hasCompleted && isBootstrapRoute) {
        return '/onboarding';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/bootstrap',
        name: 'bootstrap',
        builder: (context, state) => const BootstrapPage(),
      ),
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingIntroPage(),
      ),
      GoRoute(
        path: '/onboarding/interests',
        name: 'onboarding-interests',
        builder: (context, state) => const OnboardingInterestsPage(),
      ),
      GoRoute(
        path: '/onboarding/location',
        name: 'onboarding-location',
        builder: (context, state) => const OnboardingLocationPage(),
      ),
      GoRoute(
        path: '/onboarding/discovery',
        name: 'onboarding-discovery',
        builder: (context, state) => const OnboardingDiscoveryPage(),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const HomePage(initialTab: HomeTab.profile),
      ),
      GoRoute(
        path: '/studio',
        redirect: (_, __) => '/profile',
      ),
      GoRoute(
        path: '/reviews/create',
        name: 'place-review-editor',
        builder: (context, state) => PlaceReviewVideoEditorScreen(
          recoverLatestDraft: true,
          initialPlace: state.extra is PlaceSearchResult ? state.extra as PlaceSearchResult : null,
        ),
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
        path: '/activity',
        name: 'activity',
        builder: (context, state) => const ActivityPage(),
      ),
      GoRoute(
        path: '/planner',
        name: 'planner',
        builder: (context, state) => const PlannerPage(),
      ),
      GoRoute(
        path: '/hub/:family',
        name: 'role-hub',
        builder: (context, state) {
          final family = (state.pathParameters['family'] ?? 'user').toUpperCase();
          if (family == 'CREATOR') {
            return const RoleHubPage(family: 'CREATOR');
          }
          return const RoleHubPage(family: 'USER');
        },
      ),
      GoRoute(
        path: '/creator/rewards',
        name: 'creator-rewards',
        builder: (context, state) => const CreatorRewardsPage(),
      ),
      GoRoute(
        path: '/viewer/rewards',
        name: 'viewer-rewards',
        builder: (context, state) => const ViewerRewardsDashboardPage(),
      ),
      GoRoute(
        path: '/economy',
        name: 'economy',
        builder: (context, state) => const PerbugEconomyHubPage(),
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsPage(),
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
        path: '/sessions/:id/ideas',
        name: 'session-ideas',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return IdeasPage(sessionId: sessionId);
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
