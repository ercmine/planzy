enum LocationStatus {
  loading,
  ready,
  error,
  permissionDenied,
  serviceDisabled,
}

class AppLocation {
  const AppLocation({
    required this.lat,
    required this.lng,
    this.capturedAt,
    this.isOverride = false,
  });

  final double lat;
  final double lng;
  final DateTime? capturedAt;
  final bool isOverride;

  AppLocation copyWith({
    double? lat,
    double? lng,
    DateTime? capturedAt,
    bool? isOverride,
  }) {
    return AppLocation(
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      capturedAt: capturedAt ?? this.capturedAt,
      isOverride: isOverride ?? this.isOverride,
    );
  }
}
