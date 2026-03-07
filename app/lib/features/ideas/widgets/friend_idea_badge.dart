import 'package:flutter/material.dart';

import '../../../models/plan.dart';

bool isFriendIdea(Plan plan) {
  final kind = plan.metadata?['kind']?.toString().toLowerCase();
  return plan.source.toLowerCase() == 'byo' || kind == 'user_idea';
}

class FriendIdeaBadge extends StatelessWidget {
  const FriendIdeaBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Friend idea',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSecondaryContainer,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
