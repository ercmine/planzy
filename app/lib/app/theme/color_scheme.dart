import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color success = Color(0xFF12A150);
  static const Color warning = Color(0xFFE39400);
  static const Color danger = Color(0xFFD63A2F);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF5A4BFF),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFE7E4FF),
    onPrimaryContainer: Color(0xFF170F64),
    secondary: Color(0xFF00A6C8),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFD7F4FC),
    onSecondaryContainer: Color(0xFF003844),
    tertiary: Color(0xFF7A5DFF),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFEDE8FF),
    onTertiaryContainer: Color(0xFF2A1A7B),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF7F8FC),
    onSurface: Color(0xFF161820),
    onSurfaceVariant: Color(0xFF4A5060),
    outline: Color(0xFF7D8495),
    outlineVariant: Color(0xFFD0D5E2),
    shadow: Color(0x1F000000),
    scrim: Color(0x99000000),
    inverseSurface: Color(0xFF2C3040),
    onInverseSurface: Color(0xFFF0F1F7),
    inversePrimary: Color(0xFFC5BFFF),
    surfaceTint: Color(0xFF5A4BFF),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFC5BFFF),
    onPrimary: Color(0xFF271D87),
    primaryContainer: Color(0xFF3D2FBE),
    onPrimaryContainer: Color(0xFFE7E4FF),
    secondary: Color(0xFF79D9ED),
    onSecondary: Color(0xFF003640),
    secondaryContainer: Color(0xFF004E5D),
    onSecondaryContainer: Color(0xFFD7F4FC),
    tertiary: Color(0xFFCCBEFF),
    onTertiary: Color(0xFF3A248E),
    tertiaryContainer: Color(0xFF523DA6),
    onTertiaryContainer: Color(0xFFEDE8FF),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF0D1018),
    onSurface: Color(0xFFE6E8F0),
    onSurfaceVariant: Color(0xFFC3C8D7),
    outline: Color(0xFF8D93A4),
    outlineVariant: Color(0xFF424857),
    shadow: Color(0xFF000000),
    scrim: Color(0xCC000000),
    inverseSurface: Color(0xFFE6E8F0),
    onInverseSurface: Color(0xFF2B3040),
    inversePrimary: Color(0xFF5A4BFF),
    surfaceTint: Color(0xFFC5BFFF),
  );
}
