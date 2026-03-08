import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';

class YesNoMaybeButtons extends StatelessWidget {
  const YesNoMaybeButtons({
    required this.onYes,
    required this.onNo,
    required this.onMaybe,
    this.spacing = AppSpacing.s,
    super.key,
  });

  final VoidCallback? onYes;
  final VoidCallback? onNo;
  final VoidCallback? onMaybe;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _DecisionIconButton(
          onPressed: onNo,
          semanticsLabel: 'No',
          tooltip: 'No',
          icon: Icons.close,
          backgroundColor: Colors.red.shade700,
        ),
        SizedBox(width: spacing),
        _DecisionIconButton(
          onPressed: onMaybe,
          semanticsLabel: 'Maybe',
          tooltip: 'Maybe',
          icon: Icons.help_outline,
          backgroundColor: Colors.grey.shade700,
        ),
        SizedBox(width: spacing),
        _DecisionIconButton(
          onPressed: onYes,
          semanticsLabel: 'Yes',
          tooltip: 'Yes',
          icon: Icons.check,
          backgroundColor: Colors.green.shade700,
        ),
      ],
    );
  }
}

class _DecisionIconButton extends StatelessWidget {
  const _DecisionIconButton({
    required this.onPressed,
    required this.semanticsLabel,
    required this.tooltip,
    required this.icon,
    required this.backgroundColor,
  });

  final VoidCallback? onPressed;
  final String semanticsLabel;
  final String tooltip;
  final IconData icon;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: semanticsLabel,
      child: Tooltip(
        message: tooltip,
        child: FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            minimumSize: const Size(56, 56),
            maximumSize: const Size(56, 56),
            tapTargetSize: MaterialTapTargetSize.padded,
            backgroundColor: backgroundColor,
            foregroundColor: Colors.white,
            disabledBackgroundColor: backgroundColor.withValues(alpha: 0.45),
            disabledForegroundColor: Colors.white.withValues(alpha: 0.72),
            padding: EdgeInsets.zero,
            shape: const CircleBorder(),
          ),
          child: Icon(icon, size: 28),
        ),
      ),
    );
  }
}
