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
    this.accuracyMeters,
    this.speedMps,
    this.isMocked = false,
    this.isOverride = false,
  });

  final double lat;
  final double lng;
  final DateTime? capturedAt;
  final double? accuracyMeters;
  final double? speedMps;
  final bool isMocked;
  final bool isOverride;

  AppLocation copyWith({
    double? lat,
    double? lng,
    DateTime? capturedAt,
    double? accuracyMeters,
    double? speedMps,
    bool? isMocked,
    bool? isOverride,
  }) {
    return AppLocation(
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      capturedAt: capturedAt ?? this.capturedAt,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      speedMps: speedMps ?? this.speedMps,
      isMocked: isMocked ?? this.isMocked,
      isOverride: isOverride ?? this.isOverride,
    );
  }
}
