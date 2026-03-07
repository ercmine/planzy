import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/idea.dart';

class IdeaListTile extends StatelessWidget {
  const IdeaListTile({
    required this.idea,
    required this.onDelete,
    super.key,
  });

  final IdeaItem idea;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(idea.createdAtISO)?.toLocal();
    final subtitleLines = <String>[
      if (idea.description?.trim().isNotEmpty ?? false) idea.description!.trim(),
      if (idea.category?.trim().isNotEmpty ?? false) 'Category: ${idea.category}',
      if (idea.websiteLink?.trim().isNotEmpty ?? false) 'Website: ${idea.websiteLink}',
      if (idea.callLink?.trim().isNotEmpty ?? false) 'Call: ${idea.callLink}',
      if (date != null) 'Added ${DateFormat.yMMMd().add_jm().format(date)}',
    ];

    return Dismissible(
      key: ValueKey<String>(idea.ideaId),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      background: Container(
        color: Theme.of(context).colorScheme.errorContainer,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        child: Icon(
          Icons.delete,
          color: Theme.of(context).colorScheme.onErrorContainer,
        ),
      ),
      child: ListTile(
        title: Text(idea.title),
        subtitle: subtitleLines.isEmpty ? null : Text(subtitleLines.join('\n')),
        isThreeLine: subtitleLines.length > 1,
        trailing: IconButton(
          onPressed: onDelete,
          icon: const Icon(Icons.delete_outline),
          tooltip: 'Delete idea',
        ),
      ),
    );
  }
}
