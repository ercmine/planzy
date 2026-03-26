import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/features/premium/premium_copy.dart';
import 'package:dryad/features/premium/premium_models.dart';
import 'package:dryad/models/entitlement_summary.dart';

void main() {
  test('PremiumPlan parses plan metadata and formats pricing', () {
    final plan = PremiumPlan.fromJson({
      'id': 'user-plus',
      'targetType': 'USER',
      'displayName': 'Plus',
      'priceAmount': 999,
      'interval': 'MONTHLY',
      'entitlements': {'feature.ai_itinerary_generation': true},
    });

    expect(plan.id, 'user-plus');
    expect(plan.priceLabel, '\$10/month');
    expect(plan.entitlements['feature.ai_itinerary_generation'], true);
  });

  test('EntitlementSummary exposes feature lock metadata', () {
    final summary = EntitlementSummary.fromJson({
      'context': {
        'plan': {'id': 'user-free', 'code': 'free', 'tier': 'FREE', 'status': 'FREE'}
      },
      'ads': {'adsEnabled': true},
      'features': [
        {
          'key': 'feature.ai_itinerary_generation',
          'enabled': false,
          'lockReason': 'PLAN_REQUIRED',
          'suggestedPlanId': 'user-plus',
          'upgradeable': true,
        }
      ],
      'quotas': [
        {'key': 'quota.lists.saved_lists', 'used': 3, 'remaining': 0, 'limit': 3}
      ]
    });

    expect(summary.featureByKey('feature.ai_itinerary_generation')?.suggestedPlanId, 'user-plus');
    expect(summary.quotas.first.remaining, 0);
  });

  test('locked feature copy routes to family specific messaging', () {
    final creator = contextForLockedFeature('feature.creator.analytics');
    final fallback = contextForLockedFeature('feature.unknown');

    expect(creator.recommendedFamily, 'CREATOR');
    expect(fallback.recommendedFamily, 'USER');
  });
}
