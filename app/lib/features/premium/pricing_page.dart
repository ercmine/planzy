import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'premium_copy.dart';
import 'premium_models.dart';

final premiumFamilyProvider = StateProvider<String>((_) => 'USER');

class PricingPage extends ConsumerStatefulWidget {
  const PricingPage({super.key, this.initialFamily});

  final String? initialFamily;

  @override
  ConsumerState<PricingPage> createState() => _PricingPageState();
}

class _PricingPageState extends ConsumerState<PricingPage> {
  @override
  void initState() {
    super.initState();
    final initial = widget.initialFamily;
    if (initial != null && initial.isNotEmpty) {
      Future.microtask(() => ref.read(premiumFamilyProvider.notifier).state = initial);
    }
  }

  @override
  Widget build(BuildContext context) {
    final family = ref.watch(premiumFamilyProvider);
    final plansAsync = ref.watch(premiumPlansProvider(family));
    final entitlementsAsync = ref.watch(entitlementSummaryFamilyProvider(family));

    return Scaffold(
      appBar: AppBar(title: const Text('Premium plans')),
      body: Column(
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'USER', label: Text('User')),
              ButtonSegment(value: 'CREATOR', label: Text('Creator')),
              ButtonSegment(value: 'BUSINESS', label: Text('Business')),
            ],
            selected: {family},
            onSelectionChanged: (value) => ref.read(premiumFamilyProvider.notifier).state = value.first,
          ),
          Expanded(
            child: plansAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text('Failed to load plans: $error')),
              data: (plans) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text('Choose the plan that fits your ${family.toLowerCase()} goals.', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    ...plans.map((plan) => _PlanCard(plan: plan, currentPlanId: entitlementsAsync.valueOrNull?.planId)).toList(),
                    const SizedBox(height: 20),
                    Text('Plan comparison', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    _ComparisonTable(plans: plans),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends ConsumerWidget {
  const _PlanCard({required this.plan, required this.currentPlanId});

  final PremiumPlan plan;
  final String? currentPlanId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCurrent = currentPlanId == plan.id;
    return Card(
      child: ListTile(
        title: Text(plan.displayName),
        subtitle: Text('${plan.audienceLabel} • ${plan.priceLabel}'),
        trailing: FilledButton(
          onPressed: isCurrent || !plan.saleable
              ? null
              : () async {
                  final repository = await ref.read(premiumRepositoryProvider.future);
                  await repository.startPlanChange(plan.id);
                  ref.invalidate(subscriptionOverviewProvider);
                  ref.invalidate(entitlementSummaryFamilyProvider(plan.targetType));
                },
          child: Text(isCurrent ? 'Current' : 'Upgrade'),
        ),
      ),
    );
  }
}

class _ComparisonTable extends StatelessWidget {
  const _ComparisonTable({required this.plans});

  final List<PremiumPlan> plans;

  @override
  Widget build(BuildContext context) {
    final keys = premiumFeatureLabels.keys.toList(growable: false);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: [
          const DataColumn(label: Text('Feature')),
          ...plans.map((plan) => DataColumn(label: Text(plan.displayName))),
        ],
        rows: keys
            .map(
              (key) => DataRow(
                cells: [
                  DataCell(Text(premiumFeatureLabels[key] ?? key)),
                  ...plans.map((plan) {
                    final value = plan.entitlements[key];
                    final label = value == true
                        ? 'Included'
                        : value == false
                            ? '—'
                            : (value?.toString() ?? '—');
                    return DataCell(Text(label));
                  }),
                ],
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}
