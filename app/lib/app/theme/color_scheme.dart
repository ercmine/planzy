import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color electricBlue = Color(0xFF28C9FF);
  static const Color electricBlueBright = Color(0xFF69E4FF);
  static const Color vividOrange = Color(0xFFFF8A1F);
  static const Color amberGlow = Color(0xFFFFC24B);
  static const Color richBlack = Color(0xFF050816);
  static const Color midnight = Color(0xFF0B1226);
  static const Color slate = Color(0xFF121C36);
  static const Color paper = Color(0xFFF7FAFF);

  static const Color success = Color(0xFF2ED88A);
  static const Color warning = Color(0xFFFFB347);
  static const Color danger = Color(0xFFFF6E67);

  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [electricBlue, vividOrange],
  );

  static const LinearGradient brandSurfaceGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0F1B3F), Color(0xFF0A1026), Color(0xFF1E140D)],
    stops: [0, 0.58, 1],
  );

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF007EED),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFD9F5FF),
    onPrimaryContainer: Color(0xFF002A45),
    secondary: Color(0xFFFF8A1F),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFFFE2C2),
    onSecondaryContainer: Color(0xFF472100),
    tertiary: Color(0xFF00A8D8),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFD0F6FF),
    onTertiaryContainer: Color(0xFF002C38),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410002),
    surface: Color(0xFFF4F8FF),
    onSurface: Color(0xFF0D1630),
    onSurfaceVariant: Color(0xFF55627E),
    outline: Color(0xFF7B8AA7),
    outlineVariant: Color(0xFFD2DCEE),
    shadow: Color(0x22061320),
    scrim: Color(0x99000000),
    inverseSurface: Color(0xFF111A31),
    onInverseSurface: Color(0xFFF1F6FF),
    inversePrimary: Color(0xFF7ADFFF),
    surfaceTint: Color(0xFF007EED),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF44D4FF),
    onPrimary: Color(0xFF00283C),
    primaryContainer: Color(0xFF003B60),
    onPrimaryContainer: Color(0xFFD7F5FF),
    secondary: Color(0xFFFFA447),
    onSecondary: Color(0xFF4A2500),
    secondaryContainer: Color(0xFF6B3900),
    onSecondaryContainer: Color(0xFFFFE0C5),
    tertiary: Color(0xFF7DDCFF),
    onTertiary: Color(0xFF003547),
    tertiaryContainer: Color(0xFF004D66),
    onTertiaryContainer: Color(0xFFD4F4FF),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF070C18),
    onSurface: Color(0xFFF4F7FF),
    onSurfaceVariant: Color(0xFFB6C3DF),
    outline: Color(0xFF8693B0),
    outlineVariant: Color(0xFF293149),
    shadow: Color(0xFF000000),
    scrim: Color(0xCC000000),
    inverseSurface: Color(0xFFF3F7FF),
    onInverseSurface: Color(0xFF1A223A),
    inversePrimary: Color(0xFF007EED),
    surfaceTint: Color(0xFF44D4FF),
  );
}
