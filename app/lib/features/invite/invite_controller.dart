import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';

class InviteState {
  const InviteState({
    required this.code,
    required this.isValid,
    required this.isJoining,
    this.status,
    this.errorMessage,
  });

  factory InviteState.initial(String code) => InviteState(
        code: code,
        isValid: _validateCode(code),
        isJoining: false,
        status: 'Invite ready',
      );

  final String code;
  final bool isValid;
  final bool isJoining;
  final String? status;
  final String? errorMessage;

  static bool _validateCode(String code) {
    final trimmed = code.trim();
    return trimmed.isNotEmpty && trimmed.length <= 120;
  }

  InviteState copyWith({
    String? code,
    bool? isValid,
    bool? isJoining,
    String? status,
    String? errorMessage,
    bool clearError = false,
  }) {
    return InviteState(
      code: code ?? this.code,
      isValid: isValid ?? this.isValid,
      isJoining: isJoining ?? this.isJoining,
      status: status ?? this.status,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class InviteController extends StateNotifier<InviteState> {
  InviteController({
    required String code,
    required Ref ref,
  })  : _ref = ref,
        super(InviteState.initial(code));

  final Ref _ref;

  Future<String?> joinSession() async {
    if (!state.isValid || state.isJoining) {
      return null;
    }

    state = state.copyWith(isJoining: true, status: 'Joining...', clearError: true);

    try {
      final session = await _ref
          .read(sessionsRepositoryProvider)
          .joinSession(state.code.trim());
      await _ref.read(sessionsControllerProvider.notifier).loadSessions();
      state = state.copyWith(
        isJoining: false,
        status: 'Invite accepted',
      );
      return session.sessionId;
    } catch (error) {
      state = state.copyWith(
        isJoining: false,
        status: 'Unable to join',
        errorMessage: error.toString(),
      );
      return null;
    }
  }
}

final inviteControllerProvider =
    StateNotifierProvider.family<InviteController, InviteState, String>(
  (ref, code) => InviteController(code: code, ref: ref),
);
