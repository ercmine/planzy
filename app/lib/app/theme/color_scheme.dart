import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color electricBlue = Color(0xFF6A93AD);
  static const Color electricBlueBright = Color(0xFF94B1C3);
  static const Color vividOrange = Color(0xFF8B735F);
  static const Color amberGlow = Color(0xFFB6A08C);
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
    primary: Color(0xFF526D80),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFD9E1E7),
    onPrimaryContainer: Color(0xFF1C2831),
    secondary: Color(0xFF6D747C),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFE1E5E8),
    onSecondaryContainer: Color(0xFF21262B),
    tertiary: Color(0xFF7B838A),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFE5E8EA),
    onTertiaryContainer: Color(0xFF22272D),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF4F2EF),
    onSurface: Color(0xFF171B20),
    onSurfaceVariant: Color(0xFF5F6771),
    outline: Color(0xFF87909A),
    outlineVariant: Color(0xFFD8DCE0),
    shadow: Color(0x14060B16),
    scrim: Color(0x80000000),
    inverseSurface: Color(0xFF20252B),
    onInverseSurface: Color(0xFFF4F5F6),
    inversePrimary: Color(0xFFB0C3D1),
    surfaceTint: Color(0xFF526D80),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF8EA8BA),
    onPrimary: Color(0xFF15212A),
    primaryContainer: Color(0xFF24313A),
    onPrimaryContainer: Color(0xFFDCE5EB),
    secondary: Color(0xFFA2AAB1),
    onSecondary: Color(0xFF1A1F24),
    secondaryContainer: Color(0xFF2A3036),
    onSecondaryContainer: Color(0xFFE3E7EA),
    tertiary: Color(0xFF929AA1),
    onTertiary: Color(0xFF1A2025),
    tertiaryContainer: Color(0xFF2A3137),
    onTertiaryContainer: Color(0xFFE3E7EA),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF111417),
    onSurface: Color(0xFFF1F2F3),
    onSurfaceVariant: Color(0xFFAFB5BB),
    outline: Color(0xFF788089),
    outlineVariant: Color(0xFF2A3037),
    shadow: Color(0xFF000000),
    scrim: Color(0xB3000000),
    inverseSurface: Color(0xFFF1F2F3),
    onInverseSurface: Color(0xFF1D2228),
    inversePrimary: Color(0xFF526D80),
    surfaceTint: Color(0xFF8EA8BA),
  );
}
