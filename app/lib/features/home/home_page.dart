import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';
import 'home_controller.dart';
import 'widgets/launch_widgets.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(homeSnapshotProvider);

    return AppScaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const PerbugLogo(size: 28, variant: PerbugLogoVariant.withWordmark),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s),
            child: AppIconButton(
              icon: Icons.notifications_none_rounded,
              tooltip: 'Activity',
              onPressed: () => context.go('/activity'),
            ),
          ),
        ],
      ),
      body: snapshot.when(
        data: (data) {
          final sections = <Widget>[
            _DiscoverTab(snapshot: data, onOpenDiscovery: () => context.go('/sessions')),
            const _SearchTab(),
            _SavedTab(snapshot: data),
            _FollowingTab(snapshot: data),
            _CreateTab(onOpenCreatorHub: () => context.go('/hub/creator')),
            _ProfileTab(snapshot: data, onOpenSettings: () => context.go('/settings')),
          ];

          return AnimatedSwitcher(
            duration: const Duration(milliseconds: 280),
            child: KeyedSubtree(key: ValueKey(_index), child: sections[_index]),
          );
        },
        error: (_, __) => ListView(
          children: const [
            EmptyStateCard(
              icon: Icons.cloud_off_rounded,
              title: 'Home is unavailable right now',
              description: 'We could not load your latest data. Check connection and retry.',
              cta: 'Retry',
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.search_rounded), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.bookmark_border_rounded), selectedIcon: Icon(Icons.bookmark_rounded), label: 'Saved'),
          NavigationDestination(icon: Icon(Icons.dynamic_feed_outlined), selectedIcon: Icon(Icons.dynamic_feed_rounded), label: 'Following'),
          NavigationDestination(icon: Icon(Icons.add_circle_outline_rounded), selectedIcon: Icon(Icons.add_circle_rounded), label: 'Create'),
          NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}

class _DiscoverTab extends StatelessWidget {
  const _DiscoverTab({required this.snapshot, required this.onOpenDiscovery});

  final HomeSnapshot snapshot;
  final VoidCallback onOpenDiscovery;

  @override
  Widget build(BuildContext context) {
    final results = snapshot.liveResults?.results ?? const [];
    return ListView(
      children: [
        GradientHeroCard(
          title: 'Discover where to go next',
          subtitle: 'Live recommendations update from your location and active sessions.',
          pills: [
            AppPill(label: '${snapshot.activeSessionCount} active sessions', icon: Icons.groups_rounded),
            AppPill(label: '${results.length} live results', icon: Icons.insights_rounded),
          ],
          onTap: onOpenDiscovery,
        ),
        const SizedBox(height: AppSpacing.m),
        const SearchLaunchCard(),
        const SizedBox(height: AppSpacing.m),
        const AppSectionHeader(title: 'Live nearby picks', subtitle: 'These cards come from the live results API.'),
        const SizedBox(height: AppSpacing.s),
        if (results.isEmpty)
          const EmptyStateCard(
            icon: Icons.location_searching_rounded,
            title: 'No live nearby picks yet',
            description: 'Allow location and start swiping in a session to get ranked nearby options.',
            cta: 'Open sessions',
          )
        else
          ...results.take(3).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.s),
                  child: PlacePreviewCard(
                    title: item.topPlanTitle,
                    category: 'Session ${item.sessionId}',
                    rating: item.score.toStringAsFixed(2),
                    distance: 'Live',
                    creator: 'Live results API',
                  ),
                ),
              ),
      ],
    );
  }
}

class _SearchTab extends StatelessWidget {
  const _SearchTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        SearchLaunchCard(),
      ],
    );
  }
}

class _SavedTab extends StatelessWidget {
  const _SavedTab({required this.snapshot});

  final HomeSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const AppSectionHeader(
          title: 'Saved places & guides',
          subtitle: 'Your saved content appears here as you swipe and lock plans.',
        ),
        const SizedBox(height: AppSpacing.m),
        EmptyStateCard(
          icon: Icons.bookmark_add_outlined,
          title: 'No saved places yet',
          description: snapshot.activeSessionCount == 0
              ? 'Create your first session to start saving places.'
              : 'Open a session and swipe right on places you want to revisit.',
          cta: 'Open sessions',
        ),
      ],
    );
  }
}

class _FollowingTab extends StatelessWidget {
  const _FollowingTab({required this.snapshot});

  final HomeSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final results = snapshot.liveResults?.results ?? const [];
    return ListView(
      children: [
        const AppSectionHeader(
          title: 'Following feed',
          subtitle: 'Feed items render from current live results instead of sample creator posts.',
        ),
        const SizedBox(height: AppSpacing.m),
        if (results.isEmpty)
          const EmptyStateCard(
            icon: Icons.dynamic_feed_outlined,
            title: 'Your feed is empty',
            description: 'Follow creators or generate session activity to populate this feed.',
            cta: 'Browse sessions',
          )
        else
          ...results.take(4).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.s),
                  child: FeedUpdateCard(
                    name: 'Session ${item.sessionId}',
                    handle: '@live',
                    place: item.topPlanTitle,
                    note: 'Current top pick with score ${item.score.toStringAsFixed(2)}.',
                  ),
                ),
              ),
      ],
    );
  }
}

class _CreateTab extends StatelessWidget {
  const _CreateTab({required this.onOpenCreatorHub});

  final VoidCallback onOpenCreatorHub;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const AppSectionHeader(
          title: 'Create and share your take',
          subtitle: 'Post reviews, upload videos, and publish guides.',
        ),
        const SizedBox(height: AppSpacing.m),
        SurfaceNavCard(
          icon: Icons.rate_review_outlined,
          title: 'Write a review',
          description: 'Share what stood out, what to order, and who should go.',
          onTap: onOpenCreatorHub,
        ),
      ],
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab({required this.snapshot, required this.onOpenSettings});

  final HomeSnapshot snapshot;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categorySummary = snapshot.onboardingCategories.isEmpty
        ? 'No onboarding interests selected yet'
        : snapshot.onboardingCategories.join(', ');

    return ListView(
      children: [
        CreatorProfileHeader(
          name: 'Perbug user',
          handle: '@${snapshot.userId.length > 8 ? snapshot.userId.substring(0, 8) : snapshot.userId}',
          tagline: categorySummary,
        ),
        const SizedBox(height: AppSpacing.m),
        SurfaceNavCard(
          icon: Icons.settings_outlined,
          title: 'Settings & privacy',
          description: 'Notification, profile, moderation, and app preferences.',
          onTap: onOpenSettings,
        ),
      ],
    );
  }
}
