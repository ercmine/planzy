class EntitlementSummary {
  const EntitlementSummary({
    required this.planCode,
    required this.adsEnabled,
    required this.planId,
    required this.planTier,
    required this.planStatus,
    required this.features,
    required this.quotas,
  });

  final String planCode;
  final String planId;
  final String planTier;
  final String planStatus;
  final bool adsEnabled;
  final List<EntitledFeature> features;
  final List<EntitlementQuota> quotas;

  EntitledFeature? featureByKey(String key) {
    for (final item in features) {
      if (item.key == key) {
        return item;
      }
    }
    return null;
  }

  factory EntitlementSummary.fromJson(Map<String, dynamic> json) {
    final context = json['context'];
    final plan = context is Map<String, dynamic> ? context['plan'] : null;
    final ads = json['ads'];
    final rawFeatures = json['features'];
    final rawQuotas = json['quotas'];

    return EntitlementSummary(
      planId: plan is Map<String, dynamic> ? (plan['id'] ?? '').toString() : '',
      planCode: plan is Map<String, dynamic> ? (plan['code'] ?? 'free').toString() : 'free',
      planTier: plan is Map<String, dynamic> ? (plan['tier'] ?? 'FREE').toString() : 'FREE',
      planStatus: plan is Map<String, dynamic> ? (plan['status'] ?? 'FREE').toString() : 'FREE',
      adsEnabled: ads is Map<String, dynamic> ? ads['adsEnabled'] == true : true,
      features: rawFeatures is List
          ? rawFeatures
              .whereType<Map<String, dynamic>>()
              .map(EntitledFeature.fromJson)
              .toList(growable: false)
          : const [],
      quotas: rawQuotas is List
          ? rawQuotas
              .whereType<Map<String, dynamic>>()
              .map(EntitlementQuota.fromJson)
              .toList(growable: false)
          : const [],
    );
  }
}

class EntitledFeature {
  const EntitledFeature({
    required this.key,
    required this.enabled,
    required this.lockReason,
    required this.suggestedPlanId,
    required this.upgradeable,
  });

  final String key;
  final bool enabled;
  final String? lockReason;
  final String? suggestedPlanId;
  final bool upgradeable;

  factory EntitledFeature.fromJson(Map<String, dynamic> json) {
    return EntitledFeature(
      key: (json['key'] ?? '').toString(),
      enabled: json['enabled'] == true,
      lockReason: json['lockReason']?.toString(),
      suggestedPlanId: json['suggestedPlanId']?.toString(),
      upgradeable: json['upgradeable'] == true,
    );
  }
}

class EntitlementQuota {
  const EntitlementQuota({
    required this.key,
    required this.used,
    required this.remaining,
    required this.limit,
  });

  final String key;
  final int used;
  final int remaining;
  final int limit;

  factory EntitlementQuota.fromJson(Map<String, dynamic> json) {
    return EntitlementQuota(
      key: (json['key'] ?? '').toString(),
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
    );
  }
}
