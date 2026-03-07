import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../models/plan.dart';
import '../results_state.dart';

class ResultsPlanTile extends StatelessWidget {
  const ResultsPlanTile({
    required this.item,
    required this.isLocked,
    required this.onTap,
    required this.onLockIn,
    super.key,
  });

  final PlanScoreView item;
  final bool isLocked;
  final VoidCallback onTap;
  final VoidCallback onLockIn;

  @override
  Widget build(BuildContext context) {
    final plan = item.plan;
    final sponsored = plan.metadata?['sponsored'] == true;

    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(plan.title, style: Theme.of(context).textTheme.titleMedium),
                  ),
                  if (sponsored)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.s,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Sponsored'),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(plan.category),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Score ${item.score.toStringAsFixed(1)} • '
                'Yes ${item.yesCount} • Maybe ${item.maybeCount}',
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Distance ${_distanceLabel(plan)} • Rating ${plan.rating?.toStringAsFixed(1) ?? '-'}',
              ),
              const SizedBox(height: AppSpacing.s),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: isLocked ? null : onLockIn,
                  child: Text(isLocked ? 'Locked In' : 'Lock In'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _distanceLabel(Plan plan) {
    final distance = plan.distanceMeters;
    if (distance == null) {
      return '-';
    }
    return '${(distance / 1000).toStringAsFixed(1)}km';
  }
}
