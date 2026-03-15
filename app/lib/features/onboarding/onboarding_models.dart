enum DiscoveryMode { mostlyLocal, balanced, globalInspiration }

class OnboardingPreferences {
  const OnboardingPreferences({
    required this.onboardingCompleted,
    required this.city,
    required this.region,
    required this.interestCategoryIds,
    required this.discoveryMode,
    required this.creatorContentMode,
    this.lat,
    this.lng,
    this.locationSource = 'unknown',
  });

  final bool onboardingCompleted;
  final String? city;
  final String? region;
  final double? lat;
  final double? lng;
  final String locationSource;
  final List<String> interestCategoryIds;
  final DiscoveryMode discoveryMode;
  final String creatorContentMode;

  Map<String, Object?> toJson() {
    return {
      'onboardingCompleted': onboardingCompleted,
      'preferredLocation': {
        'city': city,
        'region': region,
        'lat': lat,
        'lng': lng,
        'source': locationSource,
      },
      'interestCategoryIds': interestCategoryIds,
      'discoveryMode': switch (discoveryMode) {
        DiscoveryMode.mostlyLocal => 'mostly_local',
        DiscoveryMode.globalInspiration => 'global_inspiration',
        DiscoveryMode.balanced => 'balanced',
      },
      'creatorContentMode': creatorContentMode,
    };
  }
}
