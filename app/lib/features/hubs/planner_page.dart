import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';

class PlannerPage extends StatelessWidget {
  const PlannerPage({super.key});

  @override
  Widget build(BuildContext context) {
    const steps = <Map<String, String>>[
      {'title': 'Pick mood', 'desc': 'Casual bites, date night, team outing'},
      {
        'title': 'Blend signals',
        'desc': 'Recommendations, trusted reviews, distance, and quotas'
      },
      {
        'title': 'Publish itinerary',
        'desc': 'Save to list, invite collaborators, and share'
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('AI Planner')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          const AppSectionHeader(
            title: 'Plan your next outing',
            subtitle: 'A guided itinerary builder with premium-aware limits and save flows.',
          ),
          const SizedBox(height: AppSpacing.m),
          ...steps.asMap().entries.map((entry) {
            final title = entry.value['title'] ?? '';
            final desc = entry.value['desc'] ?? '';
            return TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: Duration(milliseconds: 280 + (entry.key * 120)),
              builder: (context, value, child) {
                return Opacity(
                  opacity: value,
                  child: Transform.translate(
                    offset: Offset(0, 10 * (1 - value)),
                    child: child,
                  ),
                );
              },
              child: AppCard(
                child: ListTile(
                  leading: CircleAvatar(child: Text('${entry.key + 1}')),
                  title: Text(title),
                  subtitle: Text(desc),
                  trailing: const Icon(Icons.chevron_right_rounded),
                ),
              ),
            );
          }),
          const SizedBox(height: AppSpacing.m),
          const AppCard(
            child: ListTile(
              leading: Icon(Icons.workspace_premium_outlined),
              title: Text('Premium planner states'),
              subtitle: Text('When limits are reached, upgrade messaging is sourced from entitlement lock reasons.'),
            ),
          ),
        ],
      ),
    );
  }
}
