import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  // Core brand anchors (fantasy-tech tactical RPG).
  static const Color abyss = Color(0xFF080D1C);
  static const Color midnight = Color(0xFF111A2E);
  static const Color steel = Color(0xFF1A2742);
  static const Color moon = Color(0xFFE7EEFF);

  static const Color arcane = Color(0xFF6C84FF);
  static const Color ember = Color(0xFFFF8A5B);
  static const Color auric = Color(0xFFFFD36E);
  static const Color verdant = Color(0xFF56D7A4);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF425FC7),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFDCE4FF),
    onPrimaryContainer: Color(0xFF101D49),
    secondary: Color(0xFF2B557E),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFD7EAFF),
    onSecondaryContainer: Color(0xFF06223E),
    tertiary: Color(0xFF176F61),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFC4F3E8),
    onTertiaryContainer: Color(0xFF00201B),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF3F6FF),
    onSurface: Color(0xFF111A2E),
    onSurfaceVariant: Color(0xFF4E5D80),
    outline: Color(0xFF7684A7),
    outlineVariant: Color(0xFFC4CEE8),
    shadow: Color(0x1A050A17),
    scrim: Color(0x80000000),
    inverseSurface: Color(0xFF1A2742),
    onInverseSurface: Color(0xFFE7EEFF),
    inversePrimary: Color(0xFFB7C6FF),
    surfaceTint: Color(0xFF425FC7),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF92A6FF),
    onPrimary: Color(0xFF0C1B4C),
    primaryContainer: Color(0xFF1A2D6D),
    onPrimaryContainer: Color(0xFFDEE5FF),
    secondary: Color(0xFF8BC8FF),
    onSecondary: Color(0xFF00203A),
    secondaryContainer: Color(0xFF153554),
    onSecondaryContainer: Color(0xFFD1E9FF),
    tertiary: Color(0xFF7BDFC9),
    onTertiary: Color(0xFF00382E),
    tertiaryContainer: Color(0xFF005144),
    onTertiaryContainer: Color(0xFFA5F5E2),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF080D1C),
    onSurface: Color(0xFFE7EEFF),
    onSurfaceVariant: Color(0xFFAAB6D5),
    outline: Color(0xFF6F7CA0),
    outlineVariant: Color(0xFF263454),
    shadow: Color(0xFF000000),
    scrim: Color(0xBF000000),
    inverseSurface: Color(0xFFE7EEFF),
    onInverseSurface: Color(0xFF111A2E),
    inversePrimary: Color(0xFF3A56B6),
    surfaceTint: Color(0xFF92A6FF),
  );
}
