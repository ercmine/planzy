import 'package:flutter/material.dart';

import 'link_types.dart';

class LinkConfirmSheet extends StatelessWidget {
  const LinkConfirmSheet({
    required this.type,
    required this.planTitle,
    required this.uri,
    super.key,
  });

  final LinkType type;
  final String planTitle;
  final Uri uri;

  static Future<bool> show(
    BuildContext context, {
    required LinkType type,
    required String planTitle,
    required Uri uri,
  }) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (_) => LinkConfirmSheet(type: type, planTitle: planTitle, uri: uri),
    );

    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final callout = switch (type) {
      LinkType.maps => 'Open maps app?',
      LinkType.website => 'Open website?',
      LinkType.call => 'Call this number?',
      LinkType.booking => 'Open booking link?',
      LinkType.ticket => 'Open ticket link?',
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(callout, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('You are leaving Perbug for "$planTitle".'),
          const SizedBox(height: 4),
          Text(
            uri.toString(),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
