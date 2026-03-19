import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color electricBlue = Color(0xFF5BAFD6);
  static const Color electricBlueBright = Color(0xFF8FD0ED);
  static const Color vividOrange = Color(0xFFC9894A);
  static const Color amberGlow = Color(0xFFE0B57A);
  static const Color richBlack = Color(0xFF050816);
  static const Color softBlack = Color(0xFF0A0D14);
  static const Color midnight = Color(0xFF10141C);
  static const Color charcoal = Color(0xFF171C25);
  static const Color slate = Color(0xFF212734);
  static const Color fog = Color(0xFFE7EAF0);
  static const Color paper = Color(0xFFF5F2EC);

  static const Color success = Color(0xFF56C693);
  static const Color warning = Color(0xFFD6A15E);
  static const Color danger = Color(0xFFE27D75);

  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [electricBlue, vividOrange],
  );

  static const LinearGradient brandAccentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF4D8DB0), Color(0xFFB27C47)],
  );

  static const LinearGradient brandSurfaceGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF11151D), Color(0xFF0B0E14), Color(0xFF080A10)],
    stops: [0, 0.5, 1],
  );

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF3D7DA1),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFDCE9F0),
    onPrimaryContainer: Color(0xFF142733),
    secondary: Color(0xFF9D6A34),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFF0E1D1),
    onSecondaryContainer: Color(0xFF332011),
    tertiary: Color(0xFF577D8E),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFD8E7EE),
    onTertiaryContainer: Color(0xFF162831),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF3F0EA),
    onSurface: Color(0xFF13171E),
    onSurfaceVariant: Color(0xFF5E6472),
    outline: Color(0xFF8E95A3),
    outlineVariant: Color(0xFFD7DAE0),
    shadow: Color(0x14060B16),
    scrim: Color(0x80000000),
    inverseSurface: Color(0xFF181C24),
    onInverseSurface: Color(0xFFF5F6F8),
    inversePrimary: Color(0xFF9CC7DB),
    surfaceTint: Color(0xFF3D7DA1),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF6BA8C6),
    onPrimary: Color(0xFF0B1E29),
    primaryContainer: Color(0xFF1A2B35),
    onPrimaryContainer: Color(0xFFD6E5EC),
    secondary: Color(0xFFC08A54),
    onSecondary: Color(0xFF2A180B),
    secondaryContainer: Color(0xFF32231A),
    onSecondaryContainer: Color(0xFFF0DFD0),
    tertiary: Color(0xFF88B6CA),
    onTertiary: Color(0xFF102330),
    tertiaryContainer: Color(0xFF223845),
    onTertiaryContainer: Color(0xFFD7E8EF),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF090B10),
    onSurface: Color(0xFFF2F1EE),
    onSurfaceVariant: Color(0xFFADB2BC),
    outline: Color(0xFF727986),
    outlineVariant: Color(0xFF242933),
    shadow: Color(0xFF000000),
    scrim: Color(0xB3000000),
    inverseSurface: Color(0xFFF2F1EE),
    onInverseSurface: Color(0xFF1B2028),
    inversePrimary: Color(0xFF3D7DA1),
    surfaceTint: Color(0xFF6BA8C6),
  );
}
