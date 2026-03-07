import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeState {
  const HomeState({
    required this.counter,
    required this.statusMessage,
  });

  factory HomeState.initial() {
    return const HomeState(counter: 0, statusMessage: 'Welcome to Perbug');
  }

  final int counter;
  final String statusMessage;

  HomeState copyWith({
    int? counter,
    String? statusMessage,
  }) {
    return HomeState(
      counter: counter ?? this.counter,
      statusMessage: statusMessage ?? this.statusMessage,
    );
  }
}

class HomeController extends StateNotifier<HomeState> {
  HomeController() : super(HomeState.initial());

  void increment() {
    final nextCounter = state.counter + 1;
    state = state.copyWith(
      counter: nextCounter,
      statusMessage: 'Counter is now $nextCounter',
    );
  }
}

final homeControllerProvider =
    StateNotifierProvider<HomeController, HomeState>((ref) {
  return HomeController();
});
