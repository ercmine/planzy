import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';
import 'home_controller.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppScaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const PerbugLogo(size: 28, variant: PerbugLogoVariant.withWordmark),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s),
            child: AppIconButton(
              icon: Icons.settings,
              tooltip: 'Settings',
              onPressed: () => context.go('/settings'),
            ),
          ),
        ],
      ),
      body: ListView(
        children: [
          GradientHeroCard(
            title: 'Discover local spots and creator reviews',
            subtitle: 'Perbug is free for everyone. Browse, save, and post reviews with photos and videos.',
            pills: const [
              AppPill(label: 'Discover', icon: Icons.travel_explore_outlined),
              AppPill(label: 'Create', icon: Icons.video_library_outlined),
              AppPill(label: 'Follow', icon: Icons.groups_2_outlined),
            ],
            onTap: () => context.go('/sessions'),
          ),
          const SizedBox(height: AppSpacing.m),
          const AppCard(
            child: ListTile(
              leading: Icon(Icons.campaign_outlined),
              title: Text('Free and ad-supported'),
              subtitle: Text('Discovery includes sponsored cards every 10 spots with graceful fallback when inventory is unavailable.'),
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          const AppSectionHeader(
            title: 'Explore',
            subtitle: 'Everything important is one tap away.',
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.style_outlined,
            title: 'Discover',
            description: 'Swipe nearby places, save favorites, and compare top picks.',
            onTap: () => context.go('/sessions'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.auto_awesome,
            title: 'Planner',
            description: 'Generate outing ideas with personalized recommendations.',
            onTap: () => context.go('/planner'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.notifications_active_outlined,
            title: 'Feed & Activity',
            description: 'Track follows, replies, moderation updates, and invites.',
            onTap: () => context.go('/activity'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.person_outline,
            title: 'Creator tools',
            description: 'Post reviews, upload videos, and build your creator profile.',
            onTap: () => context.go('/hub/creator'),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ref.read(homeControllerProvider.notifier).refreshPulse(),
        icon: const Icon(Icons.refresh_rounded),
        label: const Text('Refresh'),
      ),
    );
  }
}
