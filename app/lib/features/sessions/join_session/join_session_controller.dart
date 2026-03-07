import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../repositories/sessions_repository.dart';

class JoinSessionState {
  const JoinSessionState({
    required this.code,
    required this.isValid,
    required this.isJoining,
    this.errorMessage,
  });

  factory JoinSessionState.initial(String code) => JoinSessionState(
        code: code,
        isValid: _validate(code),
        isJoining: false,
      );

  final String code;
  final bool isValid;
  final bool isJoining;
  final String? errorMessage;

  static bool _validate(String value) {
    final trimmed = value.trim();
    return trimmed.isNotEmpty && trimmed.length <= 120;
  }

  JoinSessionState copyWith({
    String? code,
    bool? isValid,
    bool? isJoining,
    String? errorMessage,
    bool clearError = false,
  }) {
    return JoinSessionState(
      code: code ?? this.code,
      isValid: isValid ?? this.isValid,
      isJoining: isJoining ?? this.isJoining,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class JoinSessionController extends StateNotifier<JoinSessionState> {
  JoinSessionController({required String code, required SessionsRepository repository})
      : _repository = repository,
        super(JoinSessionState.initial(code));

  final SessionsRepository _repository;

  Future<String?> join() async {
    if (!state.isValid) {
      return null;
    }

    state = state.copyWith(isJoining: true, clearError: true);
    try {
      final session = await _repository.joinSession(state.code.trim());
      state = state.copyWith(isJoining: false);
      return session.sessionId;
    } catch (error) {
      state = state.copyWith(isJoining: false, errorMessage: error.toString());
      return null;
    }
  }
}
