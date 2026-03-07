import 'package:flutter_riverpod/flutter_riverpod.dart';

class InviteState {
  const InviteState({
    required this.code,
    required this.status,
  });

  final String code;
  final String status;

  InviteState copyWith({
    String? code,
    String? status,
  }) {
    return InviteState(
      code: code ?? this.code,
      status: status ?? this.status,
    );
  }
}

class InviteController extends StateNotifier<InviteState> {
  InviteController({required String code})
      : super(InviteState(code: code, status: 'Invite ready'));

  void acceptInvite() {
    state = state.copyWith(status: 'Invite accepted');
  }
}

final inviteControllerProvider =
    StateNotifierProvider.family<InviteController, InviteState, String>(
  (ref, code) => InviteController(code: code),
);
