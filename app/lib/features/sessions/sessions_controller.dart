import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/session.dart';
import '../../repositories/sessions_repository.dart';

class SessionsState {
  const SessionsState({
    required this.sessions,
    required this.isLoading,
    this.errorMessage,
  });

  factory SessionsState.initial() => const SessionsState(
        sessions: <Session>[],
        isLoading: true,
      );

  final List<Session> sessions;
  final bool isLoading;
  final String? errorMessage;

  SessionsState copyWith({
    List<Session>? sessions,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SessionsState(
      sessions: sessions ?? this.sessions,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SessionsController extends StateNotifier<SessionsState> {
  SessionsController({required SessionsRepository sessionsRepository})
      : _sessionsRepository = sessionsRepository,
        super(SessionsState.initial()) {
    Future<void>.microtask(loadSessions);
  }

  final SessionsRepository _sessionsRepository;

  Future<void> loadSessions() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final sessions = await _sessionsRepository.listActive();
      state = state.copyWith(
        sessions: sessions,
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }
}
