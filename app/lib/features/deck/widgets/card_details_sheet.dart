import 'package:flutter/material.dart';

import '../../../models/plan.dart';
import '../../ideas/widgets/friend_idea_badge.dart';

class CardDetailsSheet extends StatelessWidget {
  const CardDetailsSheet({required this.plan, super.key});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    plan.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (isFriendIdea(plan)) const FriendIdeaBadge(),
              ],
            ),
            const SizedBox(height: 8),
            Text(plan.category),
            if (isFriendIdea(plan)) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Friend idea\nAdded by someone in your session',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
            if (plan.description?.isNotEmpty ?? false) ...[
              const SizedBox(height: 12),
              Text(plan.description!),
            ],
          ],
        ),
      ),
    );
  }
}
