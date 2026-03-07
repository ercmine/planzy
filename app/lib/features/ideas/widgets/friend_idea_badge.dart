import 'package:flutter/material.dart';

import '../../../models/plan.dart';

bool isFriendIdea(Plan plan) {
  return plan.source == 'byo' || plan.metadata?['kind'] == 'user_idea';
}

class FriendIdeaBadge extends StatelessWidget {
  const FriendIdeaBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Friend idea',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Theme.of(context).colorScheme.onTertiaryContainer,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
