import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/ads/native_ad_controller.dart';
import '../../core/env/env.dart';
import '../../core/widgets/app_snackbar.dart';
import '../../core/widgets/retry_view.dart';
import '../../providers/app_providers.dart';
import 'deck_state.dart';
import 'widgets/ad_deck_card.dart';
import 'widgets/card_details_sheet.dart';
import 'widgets/deck_actions_bar.dart';
import 'widgets/deck_card.dart';
import 'widgets/deck_card_skeleton.dart';

class DeckPage extends ConsumerStatefulWidget {
  const DeckPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<DeckPage> createState() => _DeckPageState();
}

class _DeckPageState extends ConsumerState<DeckPage> {
  final CardSwiperController _swiperController = CardSwiperController();
  final Map<String, NativeAdController> _adControllers = <String, NativeAdController>{};

  @override
  void dispose() {
    _swiperController.dispose();
    for (final c in _adControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deckRepositoryAsync = ref.watch(deckRepositoryProvider);
    final telemetryRepositoryAsync = ref.watch(telemetryRepositoryProvider);

    if (deckRepositoryAsync.isLoading || telemetryRepositoryAsync.isLoading) {
      return _scaffoldWithBody(const Center(child: CircularProgressIndicator()));
    }

    if (deckRepositoryAsync.hasError || telemetryRepositoryAsync.hasError) {
      return _scaffoldWithBody(
        const Center(child: Text('Could not initialize deck dependencies.')),
      );
    }

    final state = ref.watch(deckControllerProvider(widget.sessionId));
    final controller = ref.read(deckControllerProvider(widget.sessionId).notifier);
    final envConfig = ref.watch(envConfigProvider);

    ref.listen(
        deckControllerProvider(widget.sessionId)
            .select((s) => s.showCachedResultsNotice), (_, notice) {
      if (notice && mounted) {
        AppSnackbar.show(context, 'Showing cached results.');
        controller.clearCachedResultsNotice();
      }
    });

    if (state.locationRequired) {
      return _scaffoldWithBody(
        RetryView(
          title: 'Location required',
          message: state.errorMessage ?? 'Location required',
          retryLabel: 'Enable location',
          onRetry: controller.requestLocationAndReload,
        ),
      );
    }

    if (state.isLoadingInitial) {
      return _scaffoldWithBody(
        Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: Column(
            children: const [
              Expanded(child: DeckCardSkeleton()),
              SizedBox(height: AppSpacing.m),
              DeckActionsBar(disabled: true),
            ],
          ),
        ),
      );
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return _scaffoldWithBody(
        RetryView(
          title: 'Could not load plans',
          message: state.errorMessage!,
          onRetry: controller.refresh,
        ),
      );
    }

    if (state.items.isEmpty) {
      return _scaffoldWithBody(
        RetryView(
          title: 'No more ideas right now',
          message: 'Try retrying or adjusting your session filters.',
          onRetry: controller.refresh,
        ),
      );
    }

    return AppScaffold(
      appBar: AppBar(title: const Text('Deck')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          children: [
            Expanded(
              child: CardSwiper(
                controller: _swiperController,
                cardsCount: state.items.length,
                numberOfCardsDisplayed:
                    state.items.length >= 3 ? 3 : state.items.length,
                allowedSwipeDirection: const AllowedSwipeDirection.only(
                  left: true,
                  right: true,
                  up: true,
                ),
                onSwipe: (previousIndex, currentIndex, direction) {
                  controller.handleSwipeDirection(direction);
                  controller.loadMoreIfNeeded();
                  return true;
                },
                cardBuilder: (context, index, _, __) {
                  final item = state.items[index];
                  if (item is DeckAdItem) {
                    final c = _adControllers.putIfAbsent(
                      item.slot.slotId,
                      () => NativeAdController(
                        adsService: ref.read(adsServiceProvider),
                        slotId: item.slot.slotId,
                      ),
                    );
                    return AdDeckCard(
                      key: ValueKey(item.slot.slotId),
                      controller: c,
                    );
                  }
                  final plan = (item as DeckPlanItem).plan;
                  final prefetchUrls = state.items
                      .skip(index + 1)
                      .whereType<DeckPlanItem>()
                      .take(2)
                      .map((p) => p.plan.photos?.isNotEmpty == true
                          ? p.plan.photos!.first.url
                          : null)
                      .whereType<String>()
                      .toList(growable: false);

                  return DeckCard(
                    plan: plan,
                    isTopCard: index == 0,
                    prefetchImageUrls: prefetchUrls,
                    onTap: () async {
                      await controller.onCardOpened(plan);
                      if (!context.mounted) {
                        return;
                      }
                      await showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        useSafeArea: true,
                        builder: (_) => CardDetailsSheet(
                          plan: plan,
                          onLinkTap: controller.onOutboundLinkTapped,
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.m),
            DeckActionsBar(
              disabled: state.items.isEmpty,
              canUndo: state.undoStack.isNotEmpty,
              onNo: () => _swiperController.swipe(CardSwiperDirection.left),
              onMaybe: () => _swiperController.swipe(CardSwiperDirection.top),
              onYes: () => _swiperController.swipe(CardSwiperDirection.right),
              onUndo: controller.undo,
            ),
            if (state.usedFallback) ...[
              const SizedBox(height: AppSpacing.s),
              const Text('Showing fallback options for this area.'),
            ],
            if (kDebugMode && envConfig.enableDebugLogs && state.lastBatchMix != null) ...[
              const SizedBox(height: AppSpacing.s),
              Text('Sources: ${state.lastBatchMix!.planSourceCounts}'),
            ],
            if (state.isLoadingMore) ...[
              const SizedBox(height: AppSpacing.s),
              const LinearProgressIndicator(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _scaffoldWithBody(Widget body) {
    return AppScaffold(
      appBar: AppBar(title: const Text('Deck')),
      body: body,
    );
  }
}
