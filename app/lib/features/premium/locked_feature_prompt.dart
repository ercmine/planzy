import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/entitlement_summary.dart';
import 'premium_copy.dart';

class LockedFeaturePrompt extends StatelessWidget {
  const LockedFeaturePrompt({
    super.key,
    required this.featureKey,
    required this.entitlements,
    required this.source,
  });

  final String featureKey;
  final EntitlementSummary entitlements;
  final String source;

  @override
  Widget build(BuildContext context) {
    final feature = entitlements.featureByKey(featureKey);
    final lockContext = contextForLockedFeature(featureKey);
    final suggestedPlan = feature?.suggestedPlanId;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lockContext.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(lockContext.description),
            if (feature?.lockReason != null) ...[
              const SizedBox(height: 6),
              Text('Reason: ${feature!.lockReason!}'),
            ],
            if (suggestedPlan != null) ...[
              const SizedBox(height: 6),
              Text('Recommended plan: $suggestedPlan'),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.go('/pricing?family=${lockContext.recommendedFamily}&feature=$featureKey&source=$source'),
              child: const Text('Compare plans'),
            ),
          ],
        ),
      ),
    );
  }
}
