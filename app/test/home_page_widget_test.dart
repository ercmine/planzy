import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perbug/app/theme/theme.dart';
import 'package:perbug/features/home/home_page.dart';

void main() {
  testWidgets('Home page exposes simplified creator-first navigation', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(
          theme: buildAppTheme(Brightness.light),
          routerConfig: GoRouter(routes: [GoRoute(path: '/', builder: (_, __) => const HomePage())]),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Discover'), findsWidgets);
    expect(find.text('Search'), findsOneWidget);
    expect(find.text('Saved'), findsOneWidget);
    expect(find.text('Following'), findsOneWidget);
    expect(find.text('Create'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.textContaining('Premium'), findsNothing);
    expect(find.textContaining('Business'), findsNothing);

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();
    expect(find.text('Create and share your take'), findsOneWidget);

    await tester.tap(find.text('Following'));
    await tester.pumpAndSettle();
    expect(find.text('Following feed'), findsOneWidget);
  });
}
