class PremiumPlan {
  const PremiumPlan({
    required this.id,
    required this.code,
    required this.targetType,
    required this.tier,
    required this.displayName,
    required this.interval,
    required this.priceAmount,
    required this.priceCurrency,
    required this.active,
    required this.saleable,
    required this.entitlements,
    required this.upgradePlanIds,
    required this.downgradePlanIds,
  });

  final String id;
  final String code;
  final String targetType;
  final String tier;
  final String displayName;
  final String interval;
  final int priceAmount;
  final String priceCurrency;
  final bool active;
  final bool saleable;
  final Map<String, dynamic> entitlements;
  final List<String> upgradePlanIds;
  final List<String> downgradePlanIds;

  factory PremiumPlan.fromJson(Map<String, dynamic> json) {
    return PremiumPlan(
      id: (json['id'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      targetType: (json['targetType'] ?? 'USER').toString(),
      tier: (json['tier'] ?? 'FREE').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      interval: (json['interval'] ?? 'NONE').toString(),
      priceAmount: (json['priceAmount'] as num?)?.toInt() ?? 0,
      priceCurrency: (json['priceCurrency'] ?? 'USD').toString(),
      active: json['isActive'] != false,
      saleable: json['saleable'] != false,
      entitlements: (json['entitlements'] as Map?)?.cast<String, dynamic>() ?? const {},
      upgradePlanIds: (json['upgradePlanIds'] as List?)?.map((e) => e.toString()).toList(growable: false) ?? const [],
      downgradePlanIds: (json['downgradePlanIds'] as List?)?.map((e) => e.toString()).toList(growable: false) ?? const [],
    );
  }

  String get audienceLabel => switch (targetType) {
        'CREATOR' => 'For creators',
        'BUSINESS' => 'For businesses',
        _ => 'For users',
      };

  String get priceLabel {
    if (priceAmount <= 0 || interval == 'NONE') {
      return 'Free';
    }
    final dollars = (priceAmount / 100).toStringAsFixed(0);
    final suffix = interval == 'YEARLY' ? '/year' : '/month';
    return '\$$dollars$suffix';
  }
}

class SubscriptionOverview {
  const SubscriptionOverview({
    required this.planId,
    required this.status,
    required this.renewalStatus,
    required this.cancelEffectiveAt,
    required this.renewsAt,
    required this.trialEndAt,
    required this.graceEndAt,
  });

  final String planId;
  final String status;
  final String renewalStatus;
  final String? cancelEffectiveAt;
  final String? renewsAt;
  final String? trialEndAt;
  final String? graceEndAt;

  factory SubscriptionOverview.fromJson(Map<String, dynamic> json) {
    final sub = (json['subscription'] as Map?)?.cast<String, dynamic>() ?? const {};
    return SubscriptionOverview(
      planId: (sub['planId'] ?? '').toString(),
      status: (sub['status'] ?? 'FREE').toString(),
      renewalStatus: (sub['renewalStatus'] ?? 'UNKNOWN').toString(),
      cancelEffectiveAt: sub['cancelEffectiveAt']?.toString(),
      renewsAt: sub['renewsAt']?.toString(),
      trialEndAt: sub['trialEndAt']?.toString(),
      graceEndAt: sub['graceEndAt']?.toString(),
    );
  }
}

class LockedFeatureContext {
  const LockedFeatureContext({
    required this.featureKey,
    required this.title,
    required this.description,
    required this.recommendedFamily,
  });

  final String featureKey;
  final String title;
  final String description;
  final String recommendedFamily;
}
