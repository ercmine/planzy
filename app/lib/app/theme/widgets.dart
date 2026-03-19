import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'color_scheme.dart';
import 'spacing.dart';
import 'tokens.dart';

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
    final scheme = Theme.of(context).colorScheme;
    return _PressScale(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              scheme.primary.withOpacity(0.94),
              scheme.secondary.withOpacity(0.86),
            ],
          ),
          borderRadius: BorderRadius.circular(AppRadius.large),
          boxShadow: AppElevation.card(scheme.shadow, glow: true),
        ),
        child: FilledButton.icon(
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(56),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.large)),
          ),
          icon: isLoading
              ? const SizedBox.square(
                  dimension: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : icon ?? const SizedBox.shrink(),
          label: Text(label),
        ),
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
    final scheme = Theme.of(context).colorScheme;
    return _PressScale(
      child: OutlinedButton.icon(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: scheme.surfaceContainerHigh.withOpacity(0.38),
          side: BorderSide(color: scheme.outlineVariant.withOpacity(0.8)),
          foregroundColor: scheme.onSurface,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.large)),
        ),
        icon: isLoading
            ? SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: scheme.primary),
              )
            : icon ?? const SizedBox.shrink(),
        label: Text(label),
      ),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    this.padding,
    this.glow = false,
    this.gradient,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final bool glow;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.large),
        gradient: gradient,
        color: gradient == null ? colorScheme.surfaceContainerLow.withOpacity(0.92) : null,
        border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.44)),
        boxShadow: AppElevation.card(colorScheme.shadow, glow: glow),
      ),
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
    this.bottomNavigationBar,
    this.padding = const EdgeInsets.all(AppSpacing.m),
    super.key,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      appBar: appBar,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.brandSurfaceGradient),
        child: Stack(
          children: [
            const Positioned(top: -96, right: -60, child: _GlowOrb(size: 220, color: AppColors.electricBlue)),
            const Positioned(bottom: -120, left: -70, child: _GlowOrb(size: 240, color: AppColors.vividOrange)),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withOpacity(0.02),
                      Colors.transparent,
                      Colors.black.withOpacity(0.10),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: padding,
                child: body,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({required this.title, this.subtitle, this.trailing, super.key});

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
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
    this.outlined = false,
    super.key,
  });

  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = backgroundColor ?? scheme.surfaceContainerHigh.withOpacity(0.86);
    final fg = foregroundColor ?? scheme.onSurface;

    return AnimatedContainer(
      duration: AppMotion.standard,
      curve: AppMotion.emphasized,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 8),
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : bg,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: outlined ? fg.withOpacity(0.22) : bg.withOpacity(0.92)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: AppIconSize.small, color: fg),
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
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        border: Border.all(color: scheme.outlineVariant.withOpacity(0.5)),
      ),
      child: IconButton(
        onPressed: onPressed,
        tooltip: tooltip,
        icon: Icon(icon),
        style: IconButton.styleFrom(
          backgroundColor: scheme.surfaceContainerHigh.withOpacity(0.72),
          foregroundColor: scheme.onSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.medium)),
        ),
      ),
    );
  }
}

class AppSkeleton extends StatefulWidget {
  const AppSkeleton({
    required this.height,
    this.width = double.infinity,
    this.radius = AppRadius.medium,
    super.key,
  });

  final double height;
  final double width;
  final double radius;

  @override
  State<AppSkeleton> createState() => _AppSkeletonState();
}

class _AppSkeletonState extends State<AppSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: AppMotion.extraSlow)..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final alignment = Alignment(-1 + (_controller.value * 2), 0);
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: alignment,
              end: Alignment(alignment.x + 1.1, 0),
              colors: [
                scheme.surfaceContainerHighest.withOpacity(0.34),
                scheme.primary.withOpacity(0.08),
                scheme.secondary.withOpacity(0.06),
                scheme.surfaceContainerHighest.withOpacity(0.34),
              ],
            ),
          ),
        );
      },
    );
  }
}

class BrandHeroCard extends StatelessWidget {
  const BrandHeroCard({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      glow: false,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          scheme.surfaceContainerHigh.withOpacity(0.96),
          scheme.surface.withOpacity(0.94),
          scheme.primary.withOpacity(0.08),
          scheme.secondary.withOpacity(0.06),
        ],
        stops: const [0, 0.56, 0.82, 1],
      ),
      child: child,
    );
  }
}

class BrandedModalContainer extends StatelessWidget {
  const BrandedModalContainer({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppColors.brandSurfaceGradient),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: AppCard(child: child),
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color.withOpacity(0.08), color.withOpacity(0.02), Colors.transparent],
            stops: const [0, 0.40, 1],
          ),
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
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 1, end: _pressed ? 0.982 : 1),
        duration: AppMotion.quick,
        curve: AppMotion.emphasized,
        builder: (context, value, child) => Transform.scale(
          scale: value,
          child: Transform.rotate(angle: _pressed ? -0.0015 * math.pi : 0, child: child),
        ),
        child: widget.child,
      ),
    );
  }
}
