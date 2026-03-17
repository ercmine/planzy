import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/leaderboards/leaderboard_tab.dart';

void main() {
  testWidgets('leaderboard tab switches family and window filters', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: Scaffold(body: LeaderboardTab()))));
    await tester.pumpAndSettle();

    expect(find.text('Ari @ari'), findsOneWidget);

    await tester.tap(find.text('Cities'));
    await tester.pumpAndSettle();
    expect(find.textContaining('New York'), findsOneWidget);

    await tester.tap(find.text('Daily'));
    await tester.pumpAndSettle();
    expect(find.textContaining('DAILY'), findsWidgets);
  });
}
