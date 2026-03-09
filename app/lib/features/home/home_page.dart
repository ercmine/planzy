import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
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
            title: 'Launch-ready command center',
            subtitle: state.statusMessage,
            pills: const [
              AppPill(label: 'Discover', icon: Icons.travel_explore_outlined),
              AppPill(label: 'Creator', icon: Icons.campaign_outlined),
              AppPill(label: 'Business', icon: Icons.storefront_outlined),
            ],
            onTap: () => context.go('/sessions'),
          ),
          const SizedBox(height: AppSpacing.m),
          _contractSnapshot(entitlement, subscription, rollout),
          const SizedBox(height: AppSpacing.m),
          const AppSectionHeader(
            title: 'Product surfaces',
            subtitle: 'Each major backend capability has a discoverable frontend entry point.',
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.style_outlined,
            title: 'Discovery sessions',
            description: 'Search, deck swipes, next-card flow, and results UX.',
            onTap: () => context.go('/sessions'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.workspace_premium_outlined,
            title: 'Premium & subscription',
            description: 'Plan states, billing lifecycle, quotas, and upgrades.',
            onTap: () => context.go('/account/subscription'),
            badge: 'Entitlements',
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.auto_awesome,
            title: 'AI planner & itineraries',
            description: 'Structured planning flow with premium-aware gating.',
            onTap: () => context.go('/planner'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.notifications_active_outlined,
            title: 'Activity inbox',
            description: 'Follows, replies, moderation updates, collaboration invites.',
            onTap: () => context.go('/activity'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.person_outline,
            title: 'Creator Hub',
            description: 'Creator profile, verification, analytics, and monetization surfaces.',
            onTap: () => context.go('/hub/creator'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.business_outlined,
            title: 'Business Hub',
            description: 'Claim, verification, responses, analytics, and collaboration.',
            onTap: () => context.go('/hub/business'),
          ),
          const SizedBox(height: AppSpacing.s),
          SurfaceNavCard(
            icon: Icons.shield_outlined,
            title: 'Trust, moderation, and ops',
            description: 'Moderation states, rollout visibility, quality-aware messaging.',
            onTap: () => context.go('/hub/admin'),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ref.read(homeControllerProvider.notifier).refreshPulse(),
        icon: const Icon(Icons.refresh),
        label: const Text('Refresh pulse'),
      ),
    );
  }

  Widget _contractSnapshot(
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
          leading: Icon(Icons.error_outline),
          title: Text('Contract snapshot unavailable'),
          subtitle: Text('Some backend capability probes failed. Open settings or retry later.'),
        ),
      );
    }

    final ent = entitlement.value;
    final sub = subscription.value;
    final roll = rollout.value;
    return Column(
      children: [
        AppCard(
          child: ListTile(
            leading: const Icon(Icons.credit_card_outlined),
            title: Text('Plan ${ent.planCode} · ${ent.planTier}'),
            subtitle: Text('Subscription ${sub.status} · Ads ${ent.adsEnabled ? 'enabled' : 'reduced'}'),
            trailing: const Icon(Icons.check_circle, color: Colors.green),
          ),
        ),
        const SizedBox(height: AppSpacing.s),
        QuotaProgressTile(
          label: ent.quotas.isEmpty ? 'No active quota' : ent.quotas.first.key,
          used: ent.quotas.isEmpty ? 0 : ent.quotas.first.used,
          limit: ent.quotas.isEmpty ? 1 : ent.quotas.first.limit,
        ),
        const SizedBox(height: AppSpacing.s),
        AppCard(
          child: ListTile(
            leading: const Icon(Icons.flag_outlined),
            title: const Text('Rollout visibility'),
            subtitle: Text('${roll.features.length} feature decisions currently available.'),
          ),
        ),
      ],
    );
  }
}
