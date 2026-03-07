import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';

class DeckActionsBar extends StatelessWidget {
  const DeckActionsBar({
    required this.isDisabled,
    required this.canUndo,
    required this.onNo,
    required this.onYes,
    required this.onMaybe,
    required this.onUndo,
    required this.onSuperYes,
    super.key,
  });

  final bool isDisabled;
  final bool canUndo;
  final VoidCallback onNo;
  final VoidCallback onYes;
  final VoidCallback onMaybe;
  final VoidCallback onUndo;
  final VoidCallback onSuperYes;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: isDisabled ? null : onNo,
            icon: const Icon(Icons.close),
            label: const Text('No'),
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: isDisabled ? null : onMaybe,
            icon: const Icon(Icons.north),
            label: const Text('Maybe'),
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: FilledButton.icon(
            onPressed: isDisabled ? null : onYes,
            icon: const Icon(Icons.favorite),
            label: const Text('Yes'),
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        IconButton(
          onPressed: canUndo ? onUndo : null,
          icon: const Icon(Icons.undo),
        ),
        IconButton(
          onPressed: isDisabled ? null : onSuperYes,
          icon: const Icon(Icons.bolt),
        ),
      ],
    );
  }
}
