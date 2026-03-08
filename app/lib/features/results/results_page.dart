import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ads/native_ad_card.dart';
import '../../app/theme/spacing.dart';
import '../../core/ads/native_ad_controller.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'results_controller.dart';
import 'results_models.dart';
import 'results_state.dart';
import 'widgets/results_plan_tile.dart';

class ResultsPage extends ConsumerStatefulWidget {
  const ResultsPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<ResultsPage> createState() => _ResultsPageState();
}

class _ResultsPageState extends ConsumerState<ResultsPage> {
  final _scrollController = ScrollController();
  final Map<String, NativeAdController> _adControllers = <String, NativeAdController>{};

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    for (final c in _adControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      ref.read(resultsControllerProvider(widget.sessionId).notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(resultsControllerProvider(widget.sessionId));
    final controller = ref.read(resultsControllerProvider(widget.sessionId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Results')),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: state.isLoading
            ? _LoadingList()
            : state.feedItems.isEmpty
                ? _EmptyResults(state: state, onRetry: controller.refresh, onEnableLocation: controller.requestLocationAndReload)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(AppSpacing.m),
                    itemCount: state.feedItems.length + 1,
                    itemBuilder: (context, index) {
                      if (index == state.feedItems.length) {
                        if (state.isLoadingMore) {
                          return const Padding(
                            padding: EdgeInsets.all(AppSpacing.m),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        if (!state.hasMore) {
                          return const Padding(
                            padding: EdgeInsets.all(AppSpacing.m),
                            child: Center(child: Text('No more results')),
                          );
                        }
                        return const SizedBox(height: AppSpacing.xl);
                      }

                      final feedItem = state.feedItems[index];
                      if (feedItem is AdResultFeedItem) {
                        final adController = _adControllers.putIfAbsent(
                          feedItem.slotId,
                          () => NativeAdController(
                            adsService: ref.read(adsServiceProvider),
                            slotId: feedItem.slotId,
                          ),
                        );
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.s),
                          child: NativeAdCard(controller: adController),
                        );
                      }

                      final place = feedItem as PlaceResultFeedItem;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.s),
                        child: ResultsPlanTile(
                          item: place,
                          onTap: () => _showCardDetailsSheet(context, place.card.plan),
                          onLockIn: () => controller.lockIn(place.card.plan),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  void _showCardDetailsSheet(BuildContext context, Plan plan) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => CardDetailsSheet(plan: plan),
    );
  }
}

class _LoadingList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.m),
      itemCount: 4,
      itemBuilder: (_, __) => const Card(
        child: SizedBox(height: 240),
      ),
    );
  }
}

class _EmptyResults extends StatelessWidget {
  const _EmptyResults({
    required this.state,
    required this.onRetry,
    required this.onEnableLocation,
  });

  final ResultsState state;
  final Future<void> Function() onRetry;
  final Future<void> Function() onEnableLocation;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.m),
      children: [
        const Text('No results found yet.'),
        const SizedBox(height: AppSpacing.s),
        const Text('Try widening your radius, changing categories, or refreshing for nearby/trending options.'),
        const SizedBox(height: AppSpacing.s),
        FilledButton(onPressed: onRetry, child: const Text('Retry')),
        if (state.locationRequired) ...[
          const SizedBox(height: AppSpacing.s),
          FilledButton(onPressed: onEnableLocation, child: const Text('Enable location')),
        ],
        if (state.errorMessage != null) ...[
          const SizedBox(height: AppSpacing.s),
          Text(state.errorMessage!),
        ],
      ],
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
