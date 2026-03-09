import '../../api/api_client.dart';
import '../../models/entitlement_summary.dart';
import 'premium_models.dart';

class PremiumRepository {
  PremiumRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<PremiumPlan>> fetchPlans({required String family}) async {
    final response = await apiClient.getJson('/v1/subscription/plans');
    final plans = (response['plans'] as List?)?.whereType<Map<String, dynamic>>() ?? const [];
    return plans
        .map(PremiumPlan.fromJson)
        .where((plan) => plan.targetType == family)
        .toList(growable: false);
  }

  Future<SubscriptionOverview> fetchSubscriptionOverview() async {
    final response = await apiClient.getJson('/v1/subscription');
    return SubscriptionOverview.fromJson(response);
  }

  Future<EntitlementSummary> fetchEntitlements({required String family}) {
    return apiClient.fetchEntitlementSummary(targetType: family);
  }

  Future<void> startPlanChange(String planId) async {
    await apiClient.postJson('/v1/subscription/change', body: {'targetPlanId': planId});
  }

  Future<void> cancelAtPeriodEnd() async {
    await apiClient.postJson('/v1/subscription/cancel');
  }

  Future<void> resumeSubscription() async {
    await apiClient.postJson('/v1/subscription/resume');
  }
}
