import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connectivity_state.dart';

class ConnectivityController extends StateNotifier<ConnectivityState> {
  ConnectivityController({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity(),
        super(ConnectivityState.initial()) {
    Future<void>.microtask(_initialize);
  }

  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  Future<void> _initialize() async {
    final current = await _connectivity.checkConnectivity();
    _setOnlineState(current);

    _subscription = _connectivity.onConnectivityChanged.listen(_setOnlineState);
  }

  void _setOnlineState(List<ConnectivityResult> results) {
    final online = results.any((result) => result != ConnectivityResult.none);
    if (online == state.isOnline) {
      return;
    }

    state = state.copyWith(
      isOnline: online,
      lastChangedAt: DateTime.now(),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
