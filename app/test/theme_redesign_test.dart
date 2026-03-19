import 'package:flutter_test/flutter_test.dart';

import 'package:planzy/app/theme/app_theme.dart';
import 'package:planzy/app/theme/color_scheme.dart';
import 'package:planzy/app/theme/tokens.dart';

void main() {
  test('updated motion tokens keep premium pacing', () {
    expect(AppMotion.quick, const Duration(milliseconds: 160));
    expect(AppMotion.standard, const Duration(milliseconds: 280));
    expect(AppMotion.slow, const Duration(milliseconds: 420));
    expect(AppMotion.extraSlow, const Duration(milliseconds: 680));
  });

  test('redesigned theme uses taller premium navigation bar', () {
    final theme = AppTheme.dark();
    expect(theme.navigationBarTheme.height, 76);
  });

  test('brand palette uses restrained accent colors', () {
    expect(AppColors.darkColorScheme.primary, const Color(0xFF8EA8BA));
    expect(AppColors.darkColorScheme.secondary, const Color(0xFFA2AAB1));
  });
}
