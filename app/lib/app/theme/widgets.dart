import 'package:flutter/material.dart';

import 'spacing.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return _PressScale(
      child: FilledButton.icon(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusM),
          ),
        ),
        icon: isLoading
            ? const SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : icon ?? const SizedBox.shrink(),
        label: Text(label),
      ),
    );
  }
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return _PressScale(
      child: OutlinedButton.icon(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusM),
          ),
        ),
        icon: isLoading
            ? const SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : icon ?? const SizedBox.shrink(),
        label: Text(label),
      ),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({required this.child, this.padding, super.key});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: padding ?? const EdgeInsets.all(AppSpacing.m),
        child: child,
      ),
    );
  }
}

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.body,
    this.appBar,
    this.floatingActionButton,
    this.padding = const EdgeInsets.all(AppSpacing.m),
    super.key,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    const backgroundGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color(0xFF1E3A8A),
        Color(0xFF020617),
      ],
    );

    return Scaffold(
      appBar: appBar,
      floatingActionButton: floatingActionButton,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: backgroundGradient),
        child: SafeArea(
          child: DefaultTextStyle.merge(
            style: const TextStyle(color: Colors.white),
            child: IconTheme.merge(
              data: const IconThemeData(color: Colors.white),
              child: Padding(
                padding: padding,
                child: body,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({required this.title, this.subtitle, super.key});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        if (subtitle != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ],
    );
  }
}

class AppPill extends StatelessWidget {
  const AppPill({
    required this.label,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
    super.key,
  });

  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = backgroundColor ?? scheme.secondaryContainer;
    final fg = foregroundColor ?? scheme.onSecondaryContainer;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: fg)),
        ],
      ),
    );
  }
}

class AppIconButton extends StatelessWidget {
  const AppIconButton({required this.icon, this.onPressed, this.tooltip, super.key});

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return IconButton.filledTonal(
      onPressed: onPressed,
      tooltip: tooltip,
      icon: Icon(icon),
      style: IconButton.styleFrom(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusM),
        ),
      ),
    );
  }
}

class _PressScale extends StatefulWidget {
  const _PressScale({required this.child});

  final Widget child;

  @override
  State<_PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<_PressScale> {
  var _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _down = true),
      onTapUp: (_) => setState(() => _down = false),
      onTapCancel: () => setState(() => _down = false),
      child: AnimatedScale(
        duration: const Duration(milliseconds: 120),
        scale: _down ? 0.98 : 1,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 120),
          opacity: _down ? 0.94 : 1,
          child: widget.child,
        ),
      ),
    );
  }
}
