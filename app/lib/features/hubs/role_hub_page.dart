import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../models/entitlement_summary.dart';
import '../../providers/app_providers.dart';
import '../../core/widgets/app_back_button.dart';

class RoleHubPage extends ConsumerWidget {
  const RoleHubPage({required this.family, this.entitlementFamily, super.key});

  final String family;
  final String? entitlementFamily;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resolvedFamily = entitlementFamily ?? family;
    final entitlements = ref.watch(entitlementSummaryFamilyProvider(resolvedFamily));

    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: Text('$family Hub')),
      body: entitlements.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('We could not load this hub right now. Please try again shortly.')),
        data: (summary) => ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            AppSectionHeader(
              title: '${summary.planTier} ${family.toLowerCase()} experience',
              subtitle: 'Plan code: ${summary.planCode} · Status: ${summary.planStatus}',
            ),
            const SizedBox(height: AppSpacing.m),
            _featurePanel(summary),
            const SizedBox(height: AppSpacing.m),
            _quotaPanel(summary),
            const SizedBox(height: AppSpacing.m),
            _opsPanel(context),
          ],
        ),
      ),
    );
  }

  Widget _featurePanel(EntitlementSummary summary) {
    if (summary.features.isEmpty) {
      return const AppCard(
        child: ListTile(
          leading: Icon(Icons.lock_clock_outlined),
          title: Text('No feature flags available'),
          subtitle: Text('This role currently has no feature matrix from the backend.'),
        ),
      );
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Feature access matrix'),
          const SizedBox(height: AppSpacing.s),
          ...summary.features.take(8).map(
                (feature) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(feature.enabled ? Icons.check_circle : Icons.lock_outline),
                  title: Text(feature.key.replaceAll('_', ' ')),
                  subtitle: Text(feature.enabled
                      ? 'Enabled'
                      : feature.lockReason ?? 'Locked by entitlement policy'),
                  trailing: feature.upgradeable ? const AppPill(label: 'Upgradeable') : null,
                ),
              ),
        ],
      ),
    );
  }

  Widget _quotaPanel(EntitlementSummary summary) {
    if (summary.quotas.isEmpty) {
      return const AppCard(
        child: ListTile(
          leading: Icon(Icons.space_dashboard_outlined),
          title: Text('No quotas reported'),
          subtitle: Text('Quota engine output is not available for this role right now.'),
        ),
      );
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quota usage'),
          const SizedBox(height: AppSpacing.s),
          ...summary.quotas.take(6).map(
                (quota) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.pie_chart_outline),
                  title: Text(quota.key),
                  subtitle: Text('Used ${quota.used} · Remaining ${quota.remaining} · Limit ${quota.limit}'),
                ),
              ),
        ],
      ),
    );
  }

  Widget _opsPanel(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Operations'),
          const SizedBox(height: AppSpacing.s),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.shield_outlined),
            title: const Text('Moderation states'),
            subtitle: const Text('Pending, hidden, rejected, and trusted state callouts are represented in role surfaces.'),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Moderation workflows are wired through backend moderation status fields.')),
            ),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.campaign_outlined),
            title: const Text('Ads & premium behavior'),
            subtitle: const Text('Ad rendering remains backend-entitlement aware for premium/no-ads states.'),
          ),
        ],
      ),
    );
  }
}
