import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color electricBlue = Color(0xFF3F8F6A);
  static const Color electricBlueBright = Color(0xFF7DC8A2);
  static const Color vividOrange = Color(0xFF5A8A66);
  static const Color amberGlow = Color(0xFF8EBD9E);
  static const Color richBlack = Color(0xFF0D1014);
  static const Color softBlack = Color(0xFF13171C);
  static const Color midnight = Color(0xFF191E24);
  static const Color charcoal = Color(0xFF222831);
  static const Color slate = Color(0xFF353D49);
  static const Color fog = Color(0xFFE5E8EC);
  static const Color paper = Color(0xFFF4F2EF);

  static const Color success = Color(0xFF56C693);
  static const Color warning = Color(0xFFD6A15E);
  static const Color danger = Color(0xFFE27D75);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF2F7F57),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFC8EAD9),
    onPrimaryContainer: Color(0xFF0B2A1A),
    secondary: Color(0xFF4B7A5F),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFD8EBDD),
    onSecondaryContainer: Color(0xFF13261B),
    tertiary: Color(0xFF5E876D),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFDDEEE2),
    onTertiaryContainer: Color(0xFF152A1D),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF0F7F2),
    onSurface: Color(0xFF171B20),
    onSurfaceVariant: Color(0xFF4E6053),
    outline: Color(0xFF779082),
    outlineVariant: Color(0xFFCFE0D3),
    shadow: Color(0x14060B16),
    scrim: Color(0x80000000),
    inverseSurface: Color(0xFF20252B),
    onInverseSurface: Color(0xFFF4F5F6),
    inversePrimary: Color(0xFF9ACDB1),
    surfaceTint: Color(0xFF2F7F57),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF86C9A7),
    onPrimary: Color(0xFF08311E),
    primaryContainer: Color(0xFF18462F),
    onPrimaryContainer: Color(0xFFCDEEDB),
    secondary: Color(0xFF98BCA7),
    onSecondary: Color(0xFF15261C),
    secondaryContainer: Color(0xFF24392C),
    onSecondaryContainer: Color(0xFFCAE6D3),
    tertiary: Color(0xFF8FB99A),
    onTertiary: Color(0xFF12251A),
    tertiaryContainer: Color(0xFF23372A),
    onTertiaryContainer: Color(0xFFCBE7D2),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF111417),
    onSurface: Color(0xFFF1F2F3),
    onSurfaceVariant: Color(0xFFA8B8AD),
    outline: Color(0xFF748C7E),
    outlineVariant: Color(0xFF2A3A31),
    shadow: Color(0xFF000000),
    scrim: Color(0xB3000000),
    inverseSurface: Color(0xFFF1F2F3),
    onInverseSurface: Color(0xFF1D2228),
    inversePrimary: Color(0xFF2F7F57),
    surfaceTint: Color(0xFF86C9A7),
  );
}
