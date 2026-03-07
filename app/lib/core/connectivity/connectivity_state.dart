class ConnectivityState {
  const ConnectivityState({
    required this.isOnline,
    this.lastChangedAt,
  });

  factory ConnectivityState.initial() {
    return ConnectivityState(
      isOnline: true,
      lastChangedAt: DateTime.now(),
    );
  }

  final bool isOnline;
  final DateTime? lastChangedAt;

  ConnectivityState copyWith({
    bool? isOnline,
    DateTime? lastChangedAt,
  }) {
    return ConnectivityState(
      isOnline: isOnline ?? this.isOnline,
      lastChangedAt: lastChangedAt ?? this.lastChangedAt,
    );
  }
}
