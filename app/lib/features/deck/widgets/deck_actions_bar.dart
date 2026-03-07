import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';

class DeckActionsBar extends StatelessWidget {
  const DeckActionsBar({
    this.onNo,
    this.onMaybe,
    this.onYes,
    this.onUndo,
    this.disabled = false,
    this.canUndo = false,
    super.key,
  });

  final VoidCallback? onNo;
  final VoidCallback? onMaybe;
  final VoidCallback? onYes;
  final VoidCallback? onUndo;
  final bool disabled;
  final bool canUndo;

  @override
  Widget build(BuildContext context) {
    final onNoTap = disabled ? null : onNo;
    final onMaybeTap = disabled ? null : onMaybe;
    final onYesTap = disabled ? null : onYes;

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onNoTap,
            icon: const Icon(Icons.close),
            label: const Text('No'),
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onMaybeTap,
            icon: const Icon(Icons.keyboard_double_arrow_up_rounded),
            label: const Text('Maybe'),
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: FilledButton.icon(
            onPressed: onYesTap,
            icon: const Icon(Icons.favorite),
            label: const Text('Yes'),
          ),
        ),
        IconButton(
          onPressed: canUndo ? onUndo : null,
          icon: const Icon(Icons.undo),
          tooltip: 'Undo',
        ),
      ],
    );
  }
}
