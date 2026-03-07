import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFDC2626);

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF335CFF),
    onPrimary: Colors.white,
    secondary: Color(0xFF5C6BC0),
    onSecondary: Colors.white,
    error: Color(0xFFB3261E),
    onError: Colors.white,
    surface: Color(0xFFF8F9FF),
    onSurface: Color(0xFF111827),
    tertiary: Color(0xFF00A896),
    onTertiary: Colors.white,
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFF9DB1FF),
    onPrimary: Color(0xFF0A1A5E),
    secondary: Color(0xFFBAC3FF),
    onSecondary: Color(0xFF1A1F47),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    surface: Color(0xFF101321),
    onSurface: Color(0xFFE5E7EB),
    tertiary: Color(0xFF5EEAD4),
    onTertiary: Color(0xFF003731),
  );
}
