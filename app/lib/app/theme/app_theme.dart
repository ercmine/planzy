import 'package:flutter/material.dart';

import 'color_scheme.dart';
import 'typography.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    final colorScheme = AppColors.lightColorScheme;
    return _baseTheme(colorScheme);
  }

  static ThemeData dark() {
    final colorScheme = AppColors.darkColorScheme;
    return _baseTheme(colorScheme);
  }

  static ThemeData _baseTheme(ColorScheme colorScheme) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: AppTypography.textTheme(colorScheme),
      scaffoldBackgroundColor: colorScheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        color: colorScheme.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: colorScheme.outlineVariant,
          ),
        ),
      ),
    );
  }
}
