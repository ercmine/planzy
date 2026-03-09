import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';
import '../../models/entitlement_summary.dart';
import '../../providers/app_providers.dart';
import 'home_controller.dart';
import 'widgets/launch_widgets.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);
    final entitlement = ref.watch(entitlementSummaryProvider);
    final subscription = ref.watch(subscriptionOverviewProvider);
    final rollout = ref.watch(rolloutSummaryProvider);

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
            title: 'Find your next great plan',
            subtitle: 'Discover places, build itineraries, and keep your group in sync.',
            pills: const [
              AppPill(label: 'Discover', icon: Icons.travel_explore_outlined),
              AppPill(label: 'Saved', icon: Icons.bookmark_border_rounded),
              AppPill(label: 'Planner', icon: Icons.auto_awesome),
            ],
            onTap: () => context.go('/sessions'),
          ),
          const SizedBox(height: AppSpacing.m),
          _membershipSnapshot(entitlement, subscription, rollout),
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
            description: 'Generate itinerary ideas with personalized recommendations.',
            onTap: () => context.go('/planner'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.notifications_active_outlined,
            title: 'Activity',
            description: 'Track follows, replies, moderation updates, and invites.',
            onTap: () => context.go('/activity'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.workspace_premium_outlined,
            title: 'Premium',
            description: 'View plan benefits, billing, and upgrade options.',
            onTap: () => context.go('/account/subscription'),
            badge: 'Membership',
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.person_outline,
            title: 'Creator Hub',
            description: 'Manage creator tools, verification, and growth surfaces.',
            onTap: () => context.go('/hub/creator'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.business_outlined,
            title: 'Business Hub',
            description: 'Handle claims, reputation, analytics, and collaborations.',
            onTap: () => context.go('/hub/business'),
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

  Widget _membershipSnapshot(
    AsyncValue<EntitlementSummary> entitlement,
    AsyncValue<dynamic> subscription,
    AsyncValue<dynamic> rollout,
  ) {
    if (entitlement.isLoading || subscription.isLoading || rollout.isLoading) {
      return const AppCard(
        child: SizedBox(
          height: 80,
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (entitlement.hasError || subscription.hasError || rollout.hasError) {
      return const AppCard(
        child: ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('Membership details are temporarily unavailable'),
          subtitle: Text('You can continue browsing while we reconnect in the background.'),
        ),
      );
    }

    final ent = entitlement.valueOrNull;
    if (ent == null) {
      return const SizedBox.shrink();
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Current plan', style: TextStyle(color: Colors.white.withOpacity(0.8))),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '${ent.planTier} · ${ent.planStatus}',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
          ),
          const SizedBox(height: AppSpacing.s),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: ent.features.take(3).map((f) {
              return AppPill(
                label: f.key,
                icon: f.enabled ? Icons.check_circle_outline : Icons.lock_outline,
              );
            }).toList(growable: false),
          ),
        ],
      ),
    );
  }
}
