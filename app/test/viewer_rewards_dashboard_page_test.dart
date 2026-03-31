import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/viewer_rewards/viewer_reward_models.dart';
import 'package:perbug/features/viewer_rewards/viewer_reward_providers.dart';
import 'package:perbug/features/viewer_rewards/viewer_rewards_dashboard_page.dart';

void main() {
  Widget buildApp(List<Override> overrides) {
    return ProviderScope(
      overrides: overrides,
      child: const MaterialApp(home: ViewerRewardsDashboardPage()),
    );
  }

  testWidgets('renders overview metrics and history entries', (tester) async {
    await tester.pumpWidget(
      buildApp([
        viewerRewardSummaryProvider.overrideWith((ref) async => const ViewerRewardSummary(
              watchEarned: 8,
              ratingEarned: 2,
              commentEarned: 3,
              pending: 1,
              denied: 0,
              dailyCapRemaining: 4,
              dailyCap: 10,
              notifications: ['Your pending comment reward was approved'],
            )),
        viewerRewardHistoryProvider.overrideWith((ref) async => [
              ViewerRewardHistoryItem(
                id: '1',
                videoTitle: 'Coffee Crawl Downtown',
                action: 'watch',
                perbug: 2,
                status: ViewerRewardStatusType.earned,
                occurredAt: DateTime(2026, 3, 26),
              )
            ]),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('13.0 PERBUG earned'), findsOneWidget);
    expect(find.textContaining('Coffee Crawl Downtown'), findsOneWidget);
    expect(find.textContaining('+2.0'), findsOneWidget);
  });

  testWidgets('shows empty state when no reward history exists', (tester) async {
    await tester.pumpWidget(
      buildApp([
        viewerRewardSummaryProvider.overrideWith((ref) async => const ViewerRewardSummary(
              watchEarned: 0,
              ratingEarned: 0,
              commentEarned: 0,
              pending: 0,
              denied: 0,
              dailyCapRemaining: 10,
            )),
        viewerRewardHistoryProvider.overrideWith((ref) async => const []),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.text('No engagement earnings yet'), findsOneWidget);
  });
}
