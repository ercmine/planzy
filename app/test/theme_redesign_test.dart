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

  test('navigation chrome remains compact for mobile readability', () {
    final theme = AppTheme.dark();
    expect(theme.navigationBarTheme.height, 78);
  });

  test('brand palette targets tactical fantasy contrast', () {
    expect(AppColors.darkColorScheme.surface, const Color(0xFF080D1C));
    expect(AppColors.darkColorScheme.primary, const Color(0xFF92A6FF));
    expect(AppColors.darkColorScheme.secondary, const Color(0xFF8BC8FF));
  });

  test('rarity semantic colors are explicit and reusable', () {
    expect(AppSemanticColors.rarity['legendary'], const Color(0xFFFFC56B));
    expect(AppSemanticColors.mapNode['boss'], const Color(0xFFFF506D));
  });
}
