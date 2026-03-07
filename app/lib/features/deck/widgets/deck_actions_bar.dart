import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../app/theme/widgets.dart';

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
          child: SecondaryButton(
            onPressed: onNoTap,
            icon: const Icon(Icons.close),
            label: 'No',
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: SecondaryButton(
            onPressed: onMaybeTap,
            icon: const Icon(Icons.keyboard_double_arrow_up_rounded),
            label: 'Maybe',
          ),
        ),
        const SizedBox(width: AppSpacing.s),
        Expanded(
          child: PrimaryButton(
            onPressed: onYesTap,
            icon: const Icon(Icons.favorite),
            label: 'Yes',
          ),
        ),
        const SizedBox(width: AppSpacing.xs),
        AppIconButton(
          onPressed: canUndo ? onUndo : null,
          icon: Icons.undo,
          tooltip: 'Undo',
        ),
      ],
    );
  }
}
