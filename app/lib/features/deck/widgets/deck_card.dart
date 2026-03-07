import 'package:flutter/material.dart';

import '../../../models/plan.dart';
import '../../ideas/widgets/friend_idea_badge.dart';

class DeckCard extends StatelessWidget {
  const DeckCard({
    required this.plan,
    this.onTap,
    super.key,
  });

  final Plan plan;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        title: Row(
          children: [
            Expanded(child: Text(plan.title)),
            if (isFriendIdea(plan)) const FriendIdeaBadge(),
          ],
        ),
        subtitle: Text(plan.category),
      ),
    );
  }
}
