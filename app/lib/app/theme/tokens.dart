import 'package:flutter/material.dart';

import 'color_scheme.dart';
import 'spacing.dart';

class AppRadius {
  const AppRadius._();

  static const double small = AppSpacing.radiusS;
  static const double medium = AppSpacing.radiusM;
  static const double large = AppSpacing.radiusL;
  static const double extraLarge = AppSpacing.radiusXL;
  static const double sheet = 32;
  static const double pill = 999;
}

class AppIconSize {
  const AppIconSize._();

  static const double small = 14;
  static const double medium = 18;
  static const double large = 22;
  static const double xl = 28;
}

class AppMotion {
  const AppMotion._();

  static const Duration quick = Duration(milliseconds: 160);
  static const Duration standard = Duration(milliseconds: 280);
  static const Duration slow = Duration(milliseconds: 420);
  static const Duration extraSlow = Duration(milliseconds: 680);

  static const Curve emphasized = Curves.easeOutCubic;
  static const Curve decelerate = Curves.easeOutQuart;
  static const Curve spring = Curves.easeOutBack;
}

class AppElevation {
  const AppElevation._();

  static const double flat = 0;
  static const double low = 2;

  static List<BoxShadow> card(Color shadowColor, {bool glow = false}) {
    return <BoxShadow>[
      BoxShadow(
        color: shadowColor.withOpacity(0.16),
        blurRadius: 28,
        offset: const Offset(0, 16),
      ),
      if (glow)
        BoxShadow(
          color: AppColors.electricBlue.withOpacity(0.05),
          blurRadius: 24,
          spreadRadius: -2,
          offset: const Offset(0, 8),
        ),
      BoxShadow(
        color: shadowColor.withOpacity(0.08),
        blurRadius: 10,
        offset: const Offset(0, 3),
      ),
    ];
  }
}
