import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';

class SubscriptionPage extends ConsumerWidget {
  const SubscriptionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptionAsync = ref.watch(subscriptionOverviewProvider);
    final entitlementsAsync = ref.watch(entitlementSummaryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription & billing')),
      body: subscriptionAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Unable to load subscription: $error')),
        data: (subscription) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: ListTile(
                  title: Text('Current plan: ${entitlementsAsync.valueOrNull?.planCode ?? subscription.planId}'),
                  subtitle: Text('Status: ${subscription.status} • Renewal: ${subscription.renewalStatus}'),
                ),
              ),
              if (subscription.trialEndAt != null) Text('Trial ends: ${subscription.trialEndAt}'),
              if (subscription.renewsAt != null) Text('Renews on: ${subscription.renewsAt}'),
              if (subscription.cancelEffectiveAt != null) Text('Cancels on: ${subscription.cancelEffectiveAt}'),
              if (subscription.graceEndAt != null) Text('Grace period until: ${subscription.graceEndAt}'),
              const SizedBox(height: 16),
              FilledButton.tonal(
                onPressed: () async {
                  final repository = await ref.read(premiumRepositoryProvider.future);
                  await repository.cancelAtPeriodEnd();
                  ref.invalidate(subscriptionOverviewProvider);
                },
                child: const Text('Cancel at period end'),
              ),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () async {
                  final repository = await ref.read(premiumRepositoryProvider.future);
                  await repository.resumeSubscription();
                  ref.invalidate(subscriptionOverviewProvider);
                },
                child: const Text('Resume subscription'),
              ),
            ],
          );
        },
      ),
    );
  }
}
