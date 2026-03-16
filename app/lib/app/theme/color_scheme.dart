import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color success = Color(0xFF2ED88A);
  static const Color warning = Color(0xFFFFB347);
  static const Color danger = Color(0xFFFF6E67);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF5B46FF),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFE5E1FF),
    onPrimaryContainer: Color(0xFF1E136E),
    secondary: Color(0xFF00A3B8),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFD3F7FA),
    onSecondaryContainer: Color(0xFF003A43),
    tertiary: Color(0xFFFF4C91),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFFFD8E8),
    onTertiaryContainer: Color(0xFF4B112F),
    error: Color(0xFFB00020),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFD9DF),
    onErrorContainer: Color(0xFF3B0010),
    surface: Color(0xFFF6F7FC),
    onSurface: Color(0xFF121525),
    onSurfaceVariant: Color(0xFF555C72),
    outline: Color(0xFF7E859D),
    outlineVariant: Color(0xFFD5DAEA),
    shadow: Color(0x24000000),
    scrim: Color(0x99000000),
    inverseSurface: Color(0xFF1A1E30),
    onInverseSurface: Color(0xFFEEF0F8),
    inversePrimary: Color(0xFFC8C0FF),
    surfaceTint: Color(0xFF5B46FF),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFC9C2FF),
    onPrimary: Color(0xFF2D208F),
    primaryContainer: Color(0xFF4432C7),
    onPrimaryContainer: Color(0xFFE8E5FF),
    secondary: Color(0xFF7EE6EF),
    onSecondary: Color(0xFF00373F),
    secondaryContainer: Color(0xFF004F5A),
    onSecondaryContainer: Color(0xFFD4F8FB),
    tertiary: Color(0xFFFFA6C8),
    onTertiary: Color(0xFF5A1A3A),
    tertiaryContainer: Color(0xFF7A2D52),
    onTertiaryContainer: Color(0xFFFFDAE8),
    error: Color(0xFFFFB4B0),
    onError: Color(0xFF680016),
    errorContainer: Color(0xFF8F0030),
    onErrorContainer: Color(0xFFFFDAE1),
    surface: Color(0xFF090C17),
    onSurface: Color(0xFFE8EAF4),
    onSurfaceVariant: Color(0xFFC1C7DA),
    outline: Color(0xFF8F97AD),
    outlineVariant: Color(0xFF3D4358),
    shadow: Color(0xFF000000),
    scrim: Color(0xCC000000),
    inverseSurface: Color(0xFFE8EAF4),
    onInverseSurface: Color(0xFF262B3D),
    inversePrimary: Color(0xFF5B46FF),
    surfaceTint: Color(0xFFC9C2FF),
  );
}
