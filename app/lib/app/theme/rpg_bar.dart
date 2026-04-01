import 'package:flutter/material.dart';

import '../assets.dart';
import 'spacing.dart';

class RpgBarSurface extends StatelessWidget {
  const RpgBarSurface({
    required this.child,
    this.height = 60,
    this.padding,
    this.tint,
    this.textColor,
    this.borderRadius = 18,
    super.key,
  });

  final Widget child;
  final double height;
  final EdgeInsetsGeometry? padding;
  final Color? tint;
  final Color? textColor;
  final double borderRadius;

  static const Rect _centerSlice = Rect.fromLTWH(220, 290, 1096, 140);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final resolvedTextColor = textColor ?? Colors.white;
    final fallbackGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        scheme.primaryContainer.withOpacity(0.90),
        scheme.primary.withOpacity(0.62),
      ],
    );

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: height, maxHeight: height),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(gradient: fallbackGradient),
              ),
            ),
            Positioned.fill(
              child: Image(
                image: const AssetImage(AppAssets.rpgBarFrame),
                fit: BoxFit.contain,
                centerSlice: _centerSlice,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
            if (tint != null) Positioned.fill(child: ColoredBox(color: tint!)),
            Padding(
              padding: padding ?? const EdgeInsets.symmetric(horizontal: AppSpacing.m, vertical: AppSpacing.s),
              child: IconTheme(
                data: IconThemeData(color: resolvedTextColor),
                child: DefaultTextStyle.merge(
                  style: TextStyle(
                    color: resolvedTextColor,
                    fontWeight: FontWeight.w700,
                    shadows: const [
                      Shadow(color: Color(0x99000000), blurRadius: 4, offset: Offset(0, 1)),
                    ],
                  ),
                  child: child,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum RpgButtonVariant { primary, secondary }

class RpgBarButton extends StatelessWidget {
  const RpgBarButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.variant = RpgButtonVariant.primary,
    this.height = 56,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;
  final bool isLoading;
  final RpgButtonVariant variant;
  final double height;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final disabled = onPressed == null || isLoading;
    final tint = switch (variant) {
      RpgButtonVariant.primary => disabled ? const Color(0xAA3A3A3A) : const Color(0x22000000),
      RpgButtonVariant.secondary => disabled ? const Color(0xAA4A4A4A) : const Color(0x6644495C),
    };

    return Semantics(
      button: true,
      enabled: !disabled,
      label: label,
      child: Opacity(
        opacity: disabled ? 0.72 : 1,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: disabled ? null : onPressed,
            borderRadius: BorderRadius.circular(18),
            child: RpgBarSurface(
              height: height,
              tint: tint,
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isLoading)
                      SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: scheme.onPrimary),
                      )
                    else if (icon != null) ...[
                      icon!,
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
