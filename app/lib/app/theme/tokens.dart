import 'package:flutter/material.dart';

import 'color_scheme.dart';
import 'spacing.dart';

class AppRadius {
  const AppRadius._();

  static const double small = AppSpacing.radiusS;
  static const double medium = AppSpacing.radiusM;
  static const double large = AppSpacing.radiusL;
  static const double extraLarge = AppSpacing.radiusXL;
  static const double sheet = 28;
  static const double pill = 999;
  static const double tacticalPanel = 20;
  static const double collectibleCard = 18;
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

  static List<BoxShadow> card(Color shadowColor, {Color? rim, bool glow = false}) {
    return <BoxShadow>[
      BoxShadow(
        color: shadowColor.withOpacity(0.35),
        blurRadius: 26,
        offset: const Offset(0, 16),
      ),
      if (glow)
        BoxShadow(
          color: (rim ?? AppColors.arcane).withOpacity(0.22),
          blurRadius: 22,
          spreadRadius: -1,
          offset: const Offset(0, 0),
        ),
      BoxShadow(
        color: shadowColor.withOpacity(0.18),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ];
  }
}

class AppSemanticColors {
  const AppSemanticColors._();

  static const Map<String, Color> rarity = {
    'common': Color(0xFF9FA9C9),
    'uncommon': Color(0xFF55D3A9),
    'rare': Color(0xFF5EA1FF),
    'epic': Color(0xFFB182FF),
    'legendary': Color(0xFFFFC56B),
    'mythic': Color(0xFFFF6D9D),
  };

  static const Map<String, Color> unitRoles = {
    'vanguard': Color(0xFF5EA1FF),
    'striker': Color(0xFFFF7F72),
    'support': Color(0xFF55D3A9),
    'controller': Color(0xFFAA87FF),
    'scout': Color(0xFFF2D06E),
    'engineer': Color(0xFF6DE2FF),
  };

  static const Map<String, Color> mapNode = {
    'encounter': Color(0xFF5E8BFF),
    'resource': Color(0xFF46DDA4),
    'mission': Color(0xFFFFBC61),
    'shop': Color(0xFFB184FF),
    'rare': Color(0xFFFF7E9B),
    'boss': Color(0xFFFF506D),
    'rest': Color(0xFF5BD7FF),
    'event': Color(0xFFF39BF8),
  };

  static const Color currencyPerbug = Color(0xFFFFD36E);
  static const Color currencyShards = Color(0xFF6CD9FF);
  static const Color success = Color(0xFF5AD8A5);
  static const Color warning = Color(0xFFFFB870);
  static const Color error = Color(0xFFFF7B83);
  static const Color info = Color(0xFF81AFFF);
}
