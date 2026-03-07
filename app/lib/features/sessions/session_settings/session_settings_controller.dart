import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/session.dart';
import '../../../models/session_filters.dart';
import '../../../repositories/sessions_repository.dart';

class SessionSettingsState {
  const SessionSettingsState({
    this.session,
    this.isLoading = true,
    this.isSaving = false,
    this.errorMessage,
  });

  final Session? session;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  SessionSettingsState copyWith({
    Session? session,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SessionSettingsState(
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SessionSettingsController extends StateNotifier<SessionSettingsState> {
  SessionSettingsController({
    required this.sessionId,
    required SessionsRepository repository,
  })  : _repository = repository,
        super(const SessionSettingsState()) {
    Future<void>.microtask(load);
  }

  final String sessionId;
  final SessionsRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repository.getById(sessionId);
      state = state.copyWith(isLoading: false, session: session);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> updateFilters(SessionFilters filters) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repository.updateFilters(sessionId, filters);
      await load();
      state = state.copyWith(isSaving: false);
    } catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.toString());
    }
  }

  Future<void> leaveSession() async {
    await _repository.leaveSession(sessionId);
  }

  Future<void> deleteSession() async {
    await _repository.deleteLocalSession(sessionId);
  }
}
