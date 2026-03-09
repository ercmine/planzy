class RolloutDecision {
  const RolloutDecision({
    required this.featureKey,
    required this.enabled,
    required this.reason,
  });

  final String featureKey;
  final bool enabled;
  final String reason;

  factory RolloutDecision.fromJson(Map<String, dynamic> json) {
    return RolloutDecision(
      featureKey: json['featureKey'] as String? ?? '',
      enabled: json['enabled'] == true,
      reason: json['reason'] as String? ?? 'unknown',
    );
  }
}

class RolloutSummary {
  const RolloutSummary({required this.environment, required this.features});

  final String environment;
  final Map<String, RolloutDecision> features;

  factory RolloutSummary.fromJson(Map<String, dynamic> json) {
    final rawFeatures = (json['features'] as Map<String, dynamic>? ?? const <String, dynamic>{});
    return RolloutSummary(
      environment: json['environment'] as String? ?? 'unknown',
      features: rawFeatures.map((key, value) {
        final map = value is Map<String, dynamic> ? value : <String, dynamic>{};
        return MapEntry(key, RolloutDecision.fromJson({...map, 'featureKey': map['featureKey'] ?? key}));
      }),
    );
  }

  RolloutDecision feature(String key) =>
      features[key] ?? RolloutDecision(featureKey: key, enabled: false, reason: 'unknown_feature');
}
