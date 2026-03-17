import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../accomplishments/accomplishment_models.dart';
import '../challenges/challenge_models.dart';
import '../../app/theme/widgets.dart';
import '../../core/identity/identity_provider.dart';
import '../../core/widgets/app_back_button.dart';
import '../../models/session.dart';
import '../../providers/app_providers.dart';

final _activitySessionsProvider = FutureProvider<List<Session>>((ref) {
  return ref.read(sessionsRepositoryProvider).listActive();
});

final _activityCategoriesProvider = FutureProvider<List<String>>((ref) async {
  final store = await ref.watch(identityStoreProvider.future);
  return store.getOnboardingCategories();
});


final _accomplishmentSummaryProvider = FutureProvider<AccomplishmentSummary?>((ref) async {
  final repo = await ref.watch(accomplishmentRepositoryProvider.future);
  return repo.fetchSummary();
});

final _challengeSummaryProvider = FutureProvider<ChallengeSummary?>((ref) async {
  final repo = await ref.watch(challengeRepositoryProvider.future);
  return repo.fetchSummary();
});

final _questHubProvider = FutureProvider<QuestHubResponse?>((ref) async {
  final repo = await ref.watch(challengeRepositoryProvider.future);
  return repo.fetchQuestHub(cityId: 'city-minneapolis');
});

class ActivityPage extends ConsumerWidget {
  const ActivityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(_activitySessionsProvider);
    final categories = ref.watch(_activityCategoriesProvider);
    final accomplishmentSummary = ref.watch(_accomplishmentSummaryProvider).valueOrNull;
    final challengeSummary = ref.watch(_challengeSummaryProvider).valueOrNull;
    final questHub = ref.watch(_questHubProvider).valueOrNull;

    return AppScaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Following & activity')),
      body: sessions.when(
        data: (sessionData) {
          final categoryData = categories.valueOrNull ?? const <String>[];
          final items = <Map<String, dynamic>>[
            {
              'title': 'Active sessions',
              'desc': '${sessionData.length} active sessions are currently saved on this device.',
              'icon': Icons.groups_2_outlined,
            },
            {
              'title': 'Discovery interests',
              'desc': categoryData.isEmpty
                  ? 'No interests selected yet. Update onboarding preferences to personalize discovery.'
                  : 'Personalized for: ${categoryData.join(', ')}',
              'icon': Icons.tune_rounded,
            },
            {
              'title': 'Accomplishments showcase',
              'desc': accomplishmentSummary == null
                  ? 'Start reviewing, saving, and posting to unlock your first collectible milestone.'
                  : 'Earned ${accomplishmentSummary.earnedCount} accomplishments. Next: ${accomplishmentSummary.nextMilestones.join(', ')}',
              'icon': Icons.military_tech_outlined,
            },
            {
              'title': 'Local challenges',
              'desc': challengeSummary == null
                  ? 'City and neighborhood missions unlock as you save, review, and post from canonical places.'
                  : '${challengeSummary.weeklyActive} weekly • ${challengeSummary.seasonalActive} seasonal live now • ${challengeSummary.completed} completed',
              'icon': Icons.explore_outlined,
            },
            {
              'title': 'Quest hub',
              'desc': questHub == null
                  ? 'Weekly and seasonal quests are loading...'
                  : '${questHub.weekly.length} weekly, ${questHub.seasonal.length} seasonal, ${questHub.upcoming.length} upcoming limited-time quests',
              'icon': Icons.event_available_outlined,
            },
          ];

          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
            itemBuilder: (context, index) {
              final item = items[index];
              return AppCard(
                child: ListTile(
                  leading: Icon(item['icon'] as IconData),
                  title: Text(item['title'] as String),
                  subtitle: Text(item['desc'] as String),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Activity is unavailable right now.')),
      ),
    );
  }
}
