import 'package:flutter/material.dart';

class AppTypography {
  const AppTypography._();

  static TextTheme textTheme(ColorScheme colorScheme) {
    return TextTheme(
      displaySmall: TextStyle(
        fontSize: 40,
        height: 1.04,
        fontWeight: FontWeight.w900,
        letterSpacing: -1.0,
        color: colorScheme.onSurface,
      ),
      headlineMedium: TextStyle(
        fontSize: 30,
        height: 1.08,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.7,
        color: colorScheme.onSurface,
      ),
      headlineSmall: TextStyle(
        fontSize: 25,
        height: 1.14,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.35,
        color: colorScheme.onSurface,
      ),
      titleLarge: TextStyle(
        fontSize: 21,
        height: 1.2,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.1,
        color: colorScheme.onSurface,
      ),
      titleMedium: TextStyle(
        fontSize: 17,
        height: 1.25,
        fontWeight: FontWeight.w700,
        color: colorScheme.onSurface,
      ),
      bodyLarge: TextStyle(
        fontSize: 15,
        height: 1.45,
        fontWeight: FontWeight.w500,
        color: colorScheme.onSurface,
      ),
      bodyMedium: TextStyle(
        fontSize: 13,
        height: 1.4,
        fontWeight: FontWeight.w500,
        color: colorScheme.onSurfaceVariant,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        height: 1.35,
        fontWeight: FontWeight.w500,
        color: colorScheme.onSurfaceVariant,
      ),
      labelLarge: TextStyle(
        fontSize: 13,
        height: 1.15,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.2,
        color: colorScheme.onSurface,
      ),
      labelMedium: TextStyle(
        fontSize: 11,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.35,
        color: colorScheme.onSurfaceVariant,
      ),
      labelSmall: TextStyle(
        fontSize: 10,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.45,
        color: colorScheme.onSurfaceVariant,
      ),
    );
  }
}
