import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';

class YesNoMaybeButtons extends StatelessWidget {
  const YesNoMaybeButtons({
    required this.onYes,
    required this.onNo,
    required this.onMaybe,
    this.yesLabel = 'Yes',
    this.noLabel = 'No',
    this.maybeLabel = 'Maybe',
    this.spacing = AppSpacing.s,
    super.key,
  });

  final VoidCallback? onYes;
  final VoidCallback? onNo;
  final VoidCallback? onMaybe;
  final String yesLabel;
  final String noLabel;
  final String maybeLabel;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ActionButton(
            onPressed: onNo,
            label: noLabel,
            semanticsLabel: 'No',
            icon: Icons.close,
            backgroundColor: Colors.red.shade700,
          ),
        ),
        SizedBox(width: spacing),
        Expanded(
          child: _ActionButton(
            onPressed: onMaybe,
            label: maybeLabel,
            semanticsLabel: 'Maybe',
            icon: Icons.help_outline,
            backgroundColor: Colors.grey.shade700,
          ),
        ),
        SizedBox(width: spacing),
        Expanded(
          child: _ActionButton(
            onPressed: onYes,
            label: yesLabel,
            semanticsLabel: 'Yes',
            icon: Icons.check,
            backgroundColor: Colors.green.shade700,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.onPressed,
    required this.label,
    required this.semanticsLabel,
    required this.icon,
    required this.backgroundColor,
  });

  final VoidCallback? onPressed;
  final String label;
  final String semanticsLabel;
  final IconData icon;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: semanticsLabel,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          tapTargetSize: MaterialTapTargetSize.padded,
          backgroundColor: backgroundColor,
          foregroundColor: Colors.white,
          disabledBackgroundColor: backgroundColor.withValues(alpha: 0.45),
          disabledForegroundColor: Colors.white.withValues(alpha: 0.72),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusM),
          ),
        ),
        icon: Icon(icon),
        label: Text(label),
      ),
    );
  }
}
