import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';

class PlannerPage extends StatelessWidget {
  const PlannerPage({super.key});

  @override
  Widget build(BuildContext context) {
    const steps = <Map<String, String>>[
      {'title': 'Pick a vibe', 'desc': 'Cozy coffee, date night, or quick eats'},
      {'title': 'Blend signals', 'desc': 'Top creator reviews, distance, and saved lists'},
      {'title': 'Build your guide', 'desc': 'Save picks into a shareable plan and invite friends'},
    ];

    return AppScaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Planner')),
      body: ListView(
        children: [
          const AppSectionHeader(
            title: 'Plan your next outing',
            subtitle: 'Turn discovery into a simple guide in a few taps.',
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
                  child: Transform.translate(offset: Offset(0, 10 * (1 - value)), child: child),
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
        ],
      ),
    );
  }
}
