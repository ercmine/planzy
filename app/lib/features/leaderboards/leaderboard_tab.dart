import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'leaderboard_models.dart';
import 'leaderboard_providers.dart';

class LeaderboardTab extends ConsumerWidget {
  const LeaderboardTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hub = ref.watch(competitionHubProvider);
    return hub.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: Text('Competition is having trouble loading: $error'),
        ),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () => ref.refresh(competitionHubProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            _HeroCard(data: data),
            const SizedBox(height: AppSpacing.m),
            if (data.featuredChallenge != null) _FeaturedChallengeCard(mission: data.featuredChallenge!),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Daily missions',
              subtitle: 'Complete missions and earn DRYAD with backend-tracked progress.',
              child: _MissionList(missions: data.missions.take(2).toList(growable: false)),
            ),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Weekly missions',
              subtitle: 'Likes in the first 48 hours boost your quality score and unlock higher rewards.',
              child: _MissionList(missions: data.missions.skip(2).toList(growable: false)),
            ),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Streak',
              subtitle: 'Post consistently to grow your streak reward curve.',
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${data.streakDays} day streak'),
                subtitle: const Text('Post 3 days in a row to earn a consistency bonus.'),
                trailing: const Icon(Icons.local_fire_department_rounded),
              ),
            ),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Leaderboards',
              subtitle: 'Rank on pooled prize ladders across your city, quality, discovery, and global score.',
              child: Column(children: data.leaderboards.map((board) => _LeaderboardCard(board: board)).toList(growable: false)),
            ),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Claimable competition rewards',
              subtitle: 'Claim your competition rewards once missions and leaderboard payouts are ready.',
              child: data.rewards.isEmpty
                  ? const ListTile(contentPadding: EdgeInsets.zero, title: Text('No claimable competition rewards yet'), subtitle: Text('Finish missions or place on a leaderboard to earn claimable DRYAD.'))
                  : Column(children: data.rewards.map((reward) => ListTile(contentPadding: EdgeInsets.zero, title: Text('Earn DRYAD · ${reward.sourceType}'), subtitle: Text('Status: ${reward.status}'), trailing: Text(reward.rewardAtomic))).toList(growable: false)),
            ),
            const SizedBox(height: AppSpacing.m),
            _SectionCard(
              title: 'Competition reward history',
              subtitle: 'See claimed, blocked, and historical competition reward decisions.',
              child: data.rewardHistory.isEmpty
                  ? const ListTile(contentPadding: EdgeInsets.zero, title: Text('No competition reward history yet'), subtitle: Text('Your completed claims and blocked rewards will appear here.'))
                  : Column(children: data.rewardHistory.map((reward) => ListTile(contentPadding: EdgeInsets.zero, title: Text(reward.sourceType), subtitle: Text(reward.status), trailing: Text(reward.rewardAtomic))).toList(growable: false)),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.data});
  final CompetitionHubModel data;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      glow: true,
      gradient: LinearGradient(colors: [scheme.primary.withOpacity(0.16), scheme.surfaceContainerHighest], begin: Alignment.topLeft, end: Alignment.bottomRight),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const AppPill(label: 'Earn DRYAD', icon: Icons.emoji_events_rounded),
        const SizedBox(height: AppSpacing.s),
        Text(data.season?.name ?? 'Competition', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: AppSpacing.xs),
        Text('Competition score: ${data.score.toStringAsFixed(1)}'),
        Text(data.cityRank == null ? 'City rank not available yet' : 'You ranked #${data.cityRank} in Bloomington this week'),
        const SizedBox(height: AppSpacing.s),
        Wrap(spacing: AppSpacing.s, runSpacing: AppSpacing.s, children: [
          AppPill(label: '${data.streakDays} day streak', icon: Icons.local_fire_department_rounded),
          AppPill(label: '${data.claimableRewardAtomic} claimable', icon: Icons.toll_rounded),
          if (data.season != null) AppPill(label: data.season!.endsAtLabel, icon: Icons.timelapse_rounded),
        ]),
      ]),
    );
  }
}

class _FeaturedChallengeCard extends StatelessWidget {
  const _FeaturedChallengeCard({required this.mission});
  final CompetitionMissionCardModel mission;
  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Featured challenge',
      subtitle: 'Get 10 likes in the first 48 hours to earn a bonus and climb the quality ladder.',
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(mission.title),
        subtitle: Text('${mission.description}\nYour video’s quality window closes in 17h'),
        trailing: Text(mission.rewardAtomic),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.subtitle, required this.child});
  final String title;
  final String subtitle;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        AppSectionHeader(title: title, subtitle: subtitle),
        const SizedBox(height: AppSpacing.s),
        child,
      ]),
    );
  }
}

class _MissionList extends StatelessWidget {
  const _MissionList({required this.missions});
  final List<CompetitionMissionCardModel> missions;
  @override
  Widget build(BuildContext context) {
    if (missions.isEmpty) {
      return const ListTile(contentPadding: EdgeInsets.zero, title: Text('No active missions right now'), subtitle: Text('Check back later for new city and category competitions.'));
    }
    return Column(
      children: missions
          .map((mission) => Column(children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(mission.title),
                  subtitle: Text(mission.description),
                  trailing: Text(mission.claimed ? 'Claimed' : mission.completed ? 'Ready' : '${mission.progressValue}/${mission.goalValue}'),
                ),
                LinearProgressIndicator(value: mission.progress),
                const SizedBox(height: AppSpacing.s),
              ]))
          .toList(growable: false),
    );
  }
}

class _LeaderboardCard extends StatelessWidget {
  const _LeaderboardCard({required this.board});
  final CompetitionLeaderboardModel board;
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(board.name, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          if (board.myEntry != null) Text('Your rank: #${board.myEntry!.rank} · ${board.myEntry!.score.toStringAsFixed(1)} pts'),
          ...board.topEntries.take(3).map((entry) => ListTile(contentPadding: EdgeInsets.zero, dense: true, title: Text(entry.userId == 'u1' ? 'You' : entry.userId), leading: Text('#${entry.rank}'), trailing: Text(entry.score.toStringAsFixed(1)))).toList(growable: false),
        ]),
      ),
    );
  }
}
