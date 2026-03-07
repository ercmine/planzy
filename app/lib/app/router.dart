import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/home/home_page.dart';
import '../features/invite/invite_page.dart';
import '../features/sessions/session_page.dart';
import '../features/sessions/sessions_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final path = state.uri.path;
      if (path.startsWith('/invite/')) {
        return null;
      }
      return null;
    },
    routes: [
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
        path: '/sessions',
        name: 'sessions',
        builder: (context, state) => const SessionsPage(),
      ),
      GoRoute(
        path: '/sessions/:id',
        name: 'session',
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return SessionPage(sessionId: sessionId);
        },
      ),
    ],
  );
});
