import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'widgets/results_plan_tile.dart';

class ResultsPage extends ConsumerWidget {
  const ResultsPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(resultsControllerProvider(sessionId));
    final controller = ref.read(resultsControllerProvider(sessionId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Results')),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state.topPicks.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('Start swiping to see results.')),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.all(AppSpacing.m),
              children: [
                if (state.lockedPlanId != null) ...[
                  MaterialBanner(
                    content: Text(
                      'Locked in: ${state.topPicks.firstWhere((p) => p.plan.id == state.lockedPlanId, orElse: () => state.topPicks.first).plan.title}',
                    ),
                    actions: const [SizedBox.shrink()],
                  ),
                  const SizedBox(height: AppSpacing.s),
                ],
                for (final item in state.topPicks)
                  ResultsPlanTile(
                    item: item,
                    isLocked: state.lockedPlanId == item.plan.id,
                    onTap: () => _showCardDetailsSheet(context, item.plan),
                    onLockIn: () => controller.lockIn(item.plan),
                  ),
                if (state.errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.m),
                    child: Text(state.errorMessage!),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  void _showCardDetailsSheet(BuildContext context, Plan plan) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => CardDetailsSheet(plan: plan),
    );
  }
}

class CardDetailsSheet extends StatelessWidget {
  const CardDetailsSheet({required this.plan, super.key});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(plan.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            Text('Category: ${plan.category}'),
            if (plan.description != null) ...[
              const SizedBox(height: AppSpacing.s),
              Text(plan.description!),
            ],
            const SizedBox(height: AppSpacing.s),
            Text('Rating: ${plan.rating?.toStringAsFixed(1) ?? '-'}'),
            const SizedBox(height: AppSpacing.m),
          ],
        ),
      ),
    );
  }
}
