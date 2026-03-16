import 'package:flutter_test/flutter_test.dart';

import 'package:planzy/app/theme/app_theme.dart';
import 'package:planzy/app/theme/tokens.dart';

void main() {
  test('updated motion tokens keep premium pacing', () {
    expect(AppMotion.quick, const Duration(milliseconds: 160));
    expect(AppMotion.standard, const Duration(milliseconds: 280));
    expect(AppMotion.slow, const Duration(milliseconds: 420));
  });

  test('redesigned theme uses taller navigation bar', () {
    final theme = AppTheme.dark();
    expect(theme.navigationBarTheme.height, 72);
  });
}
