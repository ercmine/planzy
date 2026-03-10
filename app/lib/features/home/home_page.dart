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
    final sections = <Widget>[
      _DiscoverTab(onOpenDiscovery: () => context.go('/sessions')),
      const _SearchTab(),
      const _SavedTab(),
      const _FollowingTab(),
      _CreateTab(onOpenCreatorHub: () => context.go('/hub/creator')),
      _ProfileTab(onOpenSettings: () => context.go('/settings')),
    ];

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
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 280),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: KeyedSubtree(
          key: ValueKey(_index),
          child: sections[_index],
        ),
      ),
      floatingActionButton: _index == 4
          ? FloatingActionButton.extended(
              onPressed: () => ref.read(homeControllerProvider.notifier).refreshPulse(),
              icon: const Icon(Icons.auto_awesome_rounded),
              label: const Text('Publish something'),
            )
          : null,
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
  const _DiscoverTab({required this.onOpenDiscovery});

  final VoidCallback onOpenDiscovery;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        GradientHeroCard(
          title: 'Discover where to go next',
          subtitle: 'Watch real creator takes, save spots for later, and find your next great place in minutes.',
          pills: const [
            AppPill(label: 'Video reviews', icon: Icons.play_circle_outline_rounded),
            AppPill(label: 'Photo proof', icon: Icons.photo_library_outlined),
            AppPill(label: 'Guides', icon: Icons.menu_book_outlined),
          ],
          onTap: onOpenDiscovery,
        ),
        const SizedBox(height: AppSpacing.m),
        const SearchLaunchCard(),
        const SizedBox(height: AppSpacing.m),
        const AppSectionHeader(title: 'Trending near you', subtitle: 'Fresh spots from creators you can trust.'),
        const SizedBox(height: AppSpacing.s),
        const PlacePreviewCard(
          title: 'Daylight Coffee Club',
          category: 'Cafe · Brunch',
          rating: '4.8',
          distance: '0.9 mi',
          creator: '@dinewithmika',
        ),
        const SizedBox(height: AppSpacing.s),
        const AdInlineCard(),
        const SizedBox(height: AppSpacing.s),
        const PlacePreviewCard(
          title: 'Moonbow Ramen',
          category: 'Japanese · Noodles',
          rating: '4.7',
          distance: '1.2 mi',
          creator: '@eatwithray',
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
      children: [
        SearchLaunchCard(),
        SizedBox(height: AppSpacing.m),
        AppCard(
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.tune_rounded),
            title: Text('Filters and sort feel cleaner'),
            subtitle: Text('Categories, vibes, and distance are easy to scan and adjust.'),
          ),
        ),
      ],
    );
  }
}

class _SavedTab extends StatelessWidget {
  const _SavedTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        AppSectionHeader(
          title: 'Saved places & guides',
          subtitle: 'Build lists, curate collections, and share your taste.',
        ),
        SizedBox(height: AppSpacing.m),
        EmptyStateCard(
          icon: Icons.bookmark_add_outlined,
          title: 'Start your first list',
          description: 'Tap save on places you love, then organize them into guides.',
          cta: 'Browse discovery',
        ),
      ],
    );
  }
}

class _FollowingTab extends StatelessWidget {
  const _FollowingTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        AppSectionHeader(
          title: 'Following feed',
          subtitle: 'See creator updates, new reviews, and local finds in one stream.',
        ),
        SizedBox(height: AppSpacing.m),
        FeedUpdateCard(
          name: 'Jordan Lee',
          handle: '@jordaneats',
          place: 'Terracotta Kitchen',
          note: 'Posted a quick video review with price tips and best dishes.',
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
          subtitle: 'Post reviews, upload videos, and publish guides. Everything is free.',
        ),
        const SizedBox(height: AppSpacing.m),
        SurfaceNavCard(
          icon: Icons.rate_review_outlined,
          title: 'Write a review',
          description: 'Share what stood out, what to order, and who should go.',
          onTap: onOpenCreatorHub,
        ),
        const SizedBox(height: AppSpacing.s),
        SurfaceNavCard(
          icon: Icons.videocam_outlined,
          title: 'Upload a video review',
          description: 'Short clips get top placement on place pages and feed.',
          onTap: onOpenCreatorHub,
        ),
      ],
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.onOpenSettings});

  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const CreatorProfileHeader(name: 'You', handle: '@yourtaste', tagline: 'Collector of cozy cafes and late-night eats'),
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
