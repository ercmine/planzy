import 'package:flutter_riverpod/flutter_riverpod.dart';

class SessionsState {
  const SessionsState({
    required this.sessions,
    required this.isLoading,
  });

  factory SessionsState.initial() {
    return const SessionsState(
      sessions: ['alpha', 'beta', 'gamma'],
      isLoading: false,
    );
  }

  final List<String> sessions;
  final bool isLoading;

  SessionsState copyWith({
    List<String>? sessions,
    bool? isLoading,
  }) {
    return SessionsState(
      sessions: sessions ?? this.sessions,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class SessionsController extends StateNotifier<SessionsState> {
  SessionsController() : super(SessionsState.initial());
}

class SessionState {
  const SessionState({
    required this.sessionId,
    required this.swipesCount,
  });

  final String sessionId;
  final int swipesCount;

  SessionState copyWith({
    String? sessionId,
    int? swipesCount,
  }) {
    return SessionState(
      sessionId: sessionId ?? this.sessionId,
      swipesCount: swipesCount ?? this.swipesCount,
    );
  }
}

class SessionController extends StateNotifier<SessionState> {
  SessionController({required String sessionId})
      : super(SessionState(sessionId: sessionId, swipesCount: 0));

  void incrementSwipeCount() {
    state = state.copyWith(swipesCount: state.swipesCount + 1);
  }
}

final sessionsControllerProvider =
    StateNotifierProvider<SessionsController, SessionsState>((ref) {
  return SessionsController();
});

final sessionControllerProvider =
    StateNotifierProvider.family<SessionController, SessionState, String>(
  (ref, sessionId) => SessionController(sessionId: sessionId),
);
