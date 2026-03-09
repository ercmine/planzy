import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeState {
  const HomeState({
    required this.activePulse,
    required this.statusMessage,
  });

  factory HomeState.initial() {
    return const HomeState(
      activePulse: 0,
      statusMessage: 'Your launch dashboard is live',
    );
  }

  final int activePulse;
  final String statusMessage;

  HomeState copyWith({
    int? activePulse,
    String? statusMessage,
  }) {
    return HomeState(
      activePulse: activePulse ?? this.activePulse,
      statusMessage: statusMessage ?? this.statusMessage,
    );
  }
}

class HomeController extends StateNotifier<HomeState> {
  HomeController() : super(HomeState.initial());

  void refreshPulse() {
    final nextPulse = state.activePulse + 1;
    state = state.copyWith(
      activePulse: nextPulse,
      statusMessage: 'Updated just now · pulse #$nextPulse',
    );
  }
}

final homeControllerProvider =
    StateNotifierProvider<HomeController, HomeState>((ref) {
  return HomeController();
});
