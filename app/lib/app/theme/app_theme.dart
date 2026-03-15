import 'package:flutter/material.dart';

import 'color_scheme.dart';
import 'spacing.dart';
import 'tokens.dart';
import 'typography.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    final colorScheme = AppColors.lightColorScheme;
    return _baseTheme(colorScheme);
  }

  static ThemeData dark() {
    final colorScheme = AppColors.darkColorScheme;
    return _baseTheme(colorScheme);
  }

  static ThemeData _baseTheme(ColorScheme colorScheme) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: AppTypography.textTheme(colorScheme),
      scaffoldBackgroundColor: colorScheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: colorScheme.onSurface,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        elevation: AppElevation.flat,
        scrolledUnderElevation: 0,
      ),

      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        side: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.6)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colorScheme.surface.withOpacity(0.92),
        indicatorColor: colorScheme.primaryContainer,
        elevation: AppElevation.flat,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w600),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          elevation: AppElevation.flat,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.m, vertical: AppSpacing.sm),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.medium),
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colorScheme.inverseSurface,
        contentTextStyle: TextStyle(color: colorScheme.onInverseSurface),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.medium),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: colorScheme.surface,
        modalBackgroundColor: colorScheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.extraLarge)),
        ),
        showDragHandle: true,
      ),
      cardTheme: CardThemeData(
        color: colorScheme.surfaceContainerLow,
        surfaceTintColor: colorScheme.surfaceTint,
        elevation: AppElevation.flat,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.large),
          side: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.6)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerLow,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.m,
          vertical: AppSpacing.sm,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.medium),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.medium),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.medium),
          borderSide: BorderSide(color: colorScheme.primary, width: 1.5),
        ),
      ),
    );
  }
}
