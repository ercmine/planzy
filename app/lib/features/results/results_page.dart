import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ads/native_ad_card.dart';
import '../../app/theme/spacing.dart';
import '../../config/admob_config.dart';
import '../../core/ads/native_ad_controller.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'results_controller.dart';
import 'results_state.dart';
import 'widgets/results_plan_tile.dart';

class ResultsPage extends ConsumerStatefulWidget {
  const ResultsPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<ResultsPage> createState() => _ResultsPageState();
}

class _ResultsPageState extends ConsumerState<ResultsPage> {
  final Map<String, NativeAdController> _adControllers = <String, NativeAdController>{};

  @override
  void dispose() {
    for (final c in _adControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(resultsControllerProvider(widget.sessionId));
    final controller = ref.read(resultsControllerProvider(widget.sessionId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Results')),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state.topPicks.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(AppSpacing.m),
                children: [
                  if (state.errorMessage != null)
                    Card(
                      color: Theme.of(context).colorScheme.errorContainer,
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.m),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Could not load plans'),
                            const SizedBox(height: AppSpacing.xs),
                            Text(state.errorMessage!),
                            const SizedBox(height: AppSpacing.s),
                            FilledButton(
                              onPressed: controller.refresh,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    const Center(child: Text('No plans returned from API. Pull to refresh.')),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.all(AppSpacing.m),
              children: [
                if (state.lockedPlanId != null) ...[
                  MaterialBanner(
                    content: Text(
                      'Locked in: ${state.topPicks.firstWhere((p) => p.plan.id == state.lockedPlanId, orElse: () => state.topPicks.first).plan.title}',
                    ),
                    actions: const [SizedBox.shrink()],
                  ),
                  const SizedBox(height: AppSpacing.s),
                ],
                ..._buildFeedTiles(state, controller),
                if (state.activeSessions != null || state.generatedAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.s),
                    child: Text(
                      'Live summary: activeSessions=${state.activeSessions ?? '-'} generatedAt=${state.generatedAt ?? '-'}',
                    ),
                  ),
                if (state.errorMessage != null)
                  Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.s),
                      child: Text(state.errorMessage!),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _buildFeedTiles(ResultsState state, ResultsController controller) {
    final widgets = <Widget>[];
    for (var i = 0; i < state.topPicks.length; i++) {
      final item = state.topPicks[i];

      final shouldInsertAd = i >= AdMobConfig.firstAdAfterItem &&
          (i - AdMobConfig.firstAdAfterItem) % AdMobConfig.adInterval == 0;
      if (shouldInsertAd) {
        final slotId = 'results-slot-$i';
        final adController = _adControllers.putIfAbsent(
          slotId,
          () => NativeAdController(
            adsService: ref.read(adsServiceProvider),
            slotId: slotId,
          ),
        );
        widgets.add(
          NativeAdCard(
            key: ValueKey(slotId),
            controller: adController,
          ),
        );
      }

      widgets.add(
        ResultsPlanTile(
          item: item,
          isLocked: state.lockedPlanId == item.plan.id,
          onTap: () => _showCardDetailsSheet(context, item.plan),
          onLockIn: () => controller.lockIn(item.plan),
        ),
      );
    }

    return widgets;
  }

  void _showCardDetailsSheet(BuildContext context, Plan plan) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => CardDetailsSheet(plan: plan),
    );
  }
}

class CardDetailsSheet extends StatelessWidget {
  const CardDetailsSheet({required this.plan, super.key});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(plan.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            Text('Category: ${plan.category}'),
            if (plan.description != null) ...[
              const SizedBox(height: AppSpacing.s),
              Text(plan.description!),
            ],
            const SizedBox(height: AppSpacing.s),
            Text('Rating: ${plan.rating?.toStringAsFixed(1) ?? '-'}'),
            const SizedBox(height: AppSpacing.m),
          ],
        ),
      ),
    );
  }
}
