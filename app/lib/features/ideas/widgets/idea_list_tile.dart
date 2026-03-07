import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../models/idea.dart';

class IdeaListTile extends StatelessWidget {
  const IdeaListTile({
    required this.idea,
    this.onDelete,
    super.key,
  });

  final IdeaItem idea;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.s),
      child: ListTile(
        title: Text(idea.title),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (idea.category?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text('Category: ${idea.category}'),
            ],
            if (idea.description?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                idea.description!,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (idea.websiteLink?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text('Website: ${idea.websiteLink}'),
            ],
            if (idea.callLink?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text('Call: ${idea.callLink}'),
            ],
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline),
          tooltip: 'Delete idea',
          onPressed: onDelete,
        ),
      ),
    );
  }
}
