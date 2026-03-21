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
    final type = ref.watch(leaderboardTypeProvider);
    final window = ref.watch(leaderboardWindowProvider);
    final entries = ref.watch(leaderboardEntriesProvider);
    final data = ref.watch(leaderboardGameHubProvider);
    final scheme = Theme.of(context).colorScheme;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _HeroStatusCard(status: data.status, season: data.season),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Competition view',
                      subtitle: 'Switch between creator, explorer, city, and category ladders without leaving the game hub.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SegmentedButton<LeaderboardType>(
                      segments: const [
                        ButtonSegment(value: LeaderboardType.creator, label: Text('Creators')),
                        ButtonSegment(value: LeaderboardType.explorer, label: Text('Explorers')),
                        ButtonSegment(value: LeaderboardType.city, label: Text('Cities')),
                        ButtonSegment(value: LeaderboardType.category, label: Text('Categories')),
                      ],
                      selected: {type},
                      onSelectionChanged: (value) => ref.read(leaderboardTypeProvider.notifier).state = value.first,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SegmentedButton<LeaderboardWindow>(
                      segments: const [
                        ButtonSegment(value: LeaderboardWindow.daily, label: Text('Daily')),
                        ButtonSegment(value: LeaderboardWindow.weekly, label: Text('Weekly')),
                        ButtonSegment(value: LeaderboardWindow.monthly, label: Text('Monthly')),
                        ButtonSegment(value: LeaderboardWindow.allTime, label: Text('All-time')),
                      ],
                      selected: {window},
                      onSelectionChanged: (value) => ref.read(leaderboardWindowProvider.notifier).state = value.first,
                    ),
                    const SizedBox(height: AppSpacing.m),
                    _TierRow(creatorTier: data.creatorTier, explorerTier: data.explorerTier),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppSectionHeader(
                      title: 'Live competitions',
                      subtitle: 'A living rotation of city battles, creator sprints, and category races.',
                      trailing: AppPill(label: data.season.timeRemaining, icon: Icons.timelapse_rounded, backgroundColor: scheme.primary.withOpacity(0.12)),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.competitions.map(_CompetitionCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'City, neighborhood, and category battles',
                      subtitle: 'See which local scenes are rising and how your contributions shape the map.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.battles.map(_BattleCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Rank ladders',
                      subtitle: 'Leaderboards stay central, but now live beside quests, prestige, and rewards.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...entries.map((row) => _LeaderboardEntryCard(row: row, accent: scheme.primary)),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Quests and challenge progress',
                      subtitle: 'Weekly goals, seasonal quests, and city-specific missions that move your rank.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.quests.map(_QuestProgressCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Collections and mastery',
                      subtitle: 'Build shelf-worthy place sets and district mastery progress.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.collections.map(_CollectionProgressCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Social momentum',
                      subtitle: 'Friendly rivalry designed to motivate, not punish.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.socialMoments.map(_SocialMomentumCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Recent rewards and trophy shelf',
                      subtitle: 'Celebrate badges, prestige markers, and season payouts.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.recentRewards.map(_RewardCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              _SectionSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Next milestones',
                      subtitle: 'Keep momentum with clear, backend-driven targets.',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...data.milestones.map(_MilestoneCard.new),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
      ],
    );
  }
}

class _HeroStatusCard extends StatelessWidget {
  const _HeroStatusCard({required this.status, required this.season});

  final StatusHeroModel status;
  final SeasonModel season;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      glow: true,
      gradient: LinearGradient(
        colors: [scheme.primary.withOpacity(0.20), scheme.surfaceContainerHighest.withOpacity(0.95)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AppPill(label: 'Arena', icon: Icons.emoji_events_rounded),
              const SizedBox(width: AppSpacing.s),
              AppPill(
                label: season.isActive ? season.name : 'Archive',
                icon: season.isActive ? Icons.whatshot_rounded : Icons.history_rounded,
                backgroundColor: scheme.secondaryContainer.withOpacity(0.8),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.m),
          Text(status.title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.xs),
          Text(status.seasonLabel, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.xs),
          Text(status.rankLabel, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.m),
          Wrap(
            spacing: AppSpacing.s,
            runSpacing: AppSpacing.s,
            children: [
              _MetricChip(label: status.creatorTier, icon: Icons.auto_awesome_rounded),
              _MetricChip(label: status.explorerTier, icon: Icons.explore_rounded),
              _MetricChip(label: status.cityContribution, icon: Icons.location_city_rounded),
              _MetricChip(label: status.streakLabel, icon: Icons.local_fire_department_rounded),
              _MetricChip(label: status.levelLabel, icon: Icons.stars_rounded),
              _MetricChip(label: status.recentUnlock, icon: Icons.workspace_premium_rounded),
            ],
          ),
          const SizedBox(height: AppSpacing.m),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Next prestige target', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: AppSpacing.xs),
                    Text(status.nextMilestone),
                  ],
                ),
              ),
              Text(season.timeRemaining, style: Theme.of(context).textTheme.titleSmall),
            ],
          ),
          const SizedBox(height: AppSpacing.s),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.radiusS),
            child: LinearProgressIndicator(value: status.progress, minHeight: 10),
          ),
          const SizedBox(height: AppSpacing.s),
          Text(season.resetLabel),
        ],
      ),
    );
  }
}

class _SectionSurface extends StatelessWidget {
  const _SectionSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => AppCard(child: child);
}

class _TierRow extends StatelessWidget {
  const _TierRow({required this.creatorTier, required this.explorerTier});

  final TierBandModel creatorTier;
  final TierBandModel explorerTier;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _TierCard(title: 'Creator league', tier: creatorTier)),
        const SizedBox(width: AppSpacing.s),
        Expanded(child: _TierCard(title: 'Explorer league', tier: explorerTier)),
      ],
    );
  }
}

class _TierCard extends StatelessWidget {
  const _TierCard({required this.title, required this.tier});

  final String title;
  final TierBandModel tier;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.m),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.radiusL),
        color: scheme.surfaceContainerHighest.withOpacity(0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.xs),
          Row(
            children: [
              Expanded(child: Text(tier.label, style: Theme.of(context).textTheme.titleMedium)),
              Icon(
                tier.isPromoted ? Icons.trending_up_rounded : Icons.shield_outlined,
                size: 18,
                color: tier.isPromoted ? scheme.primary : scheme.onSurfaceVariant,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(tier.subtitle),
          const SizedBox(height: AppSpacing.s),
          Text(tier.progressLabel, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _CompetitionCard extends StatelessWidget {
  const _CompetitionCard(this.model);

  final CompetitionCardModel model;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tone = switch (model.state) {
      CompetitionState.live => scheme.primary,
      CompetitionState.endingSoon => Colors.orange,
      CompetitionState.upcoming => scheme.secondary,
      CompetitionState.locked => scheme.outline,
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.m),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.radiusL),
          border: Border.all(color: tone.withOpacity(0.32)),
          color: tone.withOpacity(0.08),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(model.title, style: Theme.of(context).textTheme.titleMedium)),
                AppPill(label: model.timeRemaining, icon: Icons.schedule_rounded, backgroundColor: tone.withOpacity(0.18)),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(model.subtitle),
            const SizedBox(height: AppSpacing.s),
            Text(model.positionLabel, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: AppSpacing.xs),
            Text('Leaders: ${model.leaders.join(' · ')}'),
            const SizedBox(height: AppSpacing.xs),
            Text('Reward: ${model.reward}'),
            const SizedBox(height: AppSpacing.s),
            Align(
              alignment: Alignment.centerRight,
              child: Text(model.ctaLabel, style: TextStyle(color: tone, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}

class _BattleCard extends StatelessWidget {
  const _BattleCard(this.model);

  final BattleCardModel model;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s),
        leading: const CircleAvatar(child: Icon(Icons.public_rounded)),
        title: Text(model.title),
        subtitle: Text('${model.subtitle}\n${model.status}\n${model.metric}'),
        isThreeLine: true,
        trailing: SizedBox(width: 110, child: Text(model.yourImpact, textAlign: TextAlign.end)),
      ),
    );
  }
}

class _LeaderboardEntryCard extends StatelessWidget {
  const _LeaderboardEntryCard({required this.row, required this.accent});

  final LeaderboardEntry row;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final deltaLabel = row.delta == 0 ? '—' : row.delta > 0 ? '+${row.delta}' : '${row.delta}';
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        child: ListTile(
          leading: CircleAvatar(backgroundColor: accent.withOpacity(0.12), child: Text('${row.rank}')),
          title: Text(row.displayName),
          subtitle: Text('${row.subtitle ?? ''}\nTrust: ${row.trustLabel}'),
          isThreeLine: row.subtitle != null,
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(row.score.toStringAsFixed(1), style: Theme.of(context).textTheme.titleMedium),
              Text(deltaLabel),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuestProgressCard extends StatelessWidget {
  const _QuestProgressCard(this.model);

  final QuestCardModel model;

  @override
  Widget build(BuildContext context) => _ProgressCard(
        title: model.title,
        description: model.description,
        footerLeft: model.progressLabel,
        footerRight: model.reward,
        progress: model.progress,
      );
}

class _CollectionProgressCard extends StatelessWidget {
  const _CollectionProgressCard(this.model);

  final CollectionCardModel model;

  @override
  Widget build(BuildContext context) => _ProgressCard(
        title: model.title,
        description: model.description,
        footerLeft: model.completionLabel,
        footerRight: 'Collection',
        progress: model.progress,
      );
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({
    required this.title,
    required this.description,
    required this.footerLeft,
    required this.footerRight,
    required this.progress,
  });

  final String title;
  final String description;
  final String footerLeft;
  final String footerRight;
  final double progress;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.m),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.radiusL),
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.38),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.xs),
            Text(description),
            const SizedBox(height: AppSpacing.s),
            ClipRRect(
              borderRadius: BorderRadius.circular(AppSpacing.radiusS),
              child: LinearProgressIndicator(value: progress, minHeight: 8),
            ),
            const SizedBox(height: AppSpacing.s),
            Row(
              children: [
                Expanded(child: Text(footerLeft)),
                Text(footerRight, style: Theme.of(context).textTheme.labelLarge),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialMomentumCard extends StatelessWidget {
  const _SocialMomentumCard(this.model);

  final SocialMomentumModel model;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s),
          leading: const CircleAvatar(child: Icon(Icons.groups_rounded)),
          title: Text(model.headline),
          subtitle: Text(model.detail),
        ),
      );
}

class _RewardCard extends StatelessWidget {
  const _RewardCard(this.model);

  final RewardItemModel model;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s),
          leading: const CircleAvatar(child: Icon(Icons.workspace_premium_rounded)),
          title: Text(model.title),
          subtitle: Text(model.subtitle),
        ),
      );
}

class _MilestoneCard extends StatelessWidget {
  const _MilestoneCard(this.model);

  final MilestoneModel model;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s),
          leading: const CircleAvatar(child: Icon(Icons.flag_rounded)),
          title: Text(model.title),
          subtitle: Text(model.description),
          trailing: Text(model.progressLabel, textAlign: TextAlign.end),
        ),
      );
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.s),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.radiusXL),
        color: scheme.surface.withOpacity(0.7),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: AppSpacing.xs),
          Text(label),
        ],
      ),
    );
  }
}
