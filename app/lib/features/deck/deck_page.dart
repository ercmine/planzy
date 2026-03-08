import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ads/native_ad_card.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/ads/native_ad_controller.dart';
import '../../core/env/env.dart';
import '../../core/location/location_permission_service.dart';
import '../../core/widgets/app_snackbar.dart';
import '../../core/widgets/retry_view.dart';
import '../../core/validation/url.dart';
import '../../providers/app_providers.dart';
import 'deck_controller.dart';
import 'deck_state.dart';
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
    final location = ref.watch(locationControllerProvider).effectiveLocation;
    final apiClient = ref.watch(apiClientProvider).valueOrNull;

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
          onRetry: () => _onEnableLocationPressed(controller),
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
          title: 'No results nearby',
          message: 'Try widening your radius or adjusting your session filters.',
          onRetry: controller.refresh,
        ),
      );
    }

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Deck'),
        actions: [
          IconButton(
            onPressed: controller.refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
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
                  if (index < 0 || index >= state.items.length) {
                    return const SizedBox.shrink();
                  }
                  final item = state.items[index];
                  if (item is DeckAdItem) {
                    final c = _adControllers.putIfAbsent(
                      item.slot.slotId,
                      () => NativeAdController(
                        adsService: ref.read(adsServiceProvider),
                        slotId: item.slot.slotId,
                      ),
                    );
                    return NativeAdCard(
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
                      .where(isHttpUrl)
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
            if (state.usingOfflineCachedData) ...[
              const SizedBox(height: AppSpacing.s),
              Text(
                'Offline / Using cached data',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],

            if (state.nextBatchErrorMessage != null) ...[
              const SizedBox(height: AppSpacing.s),
              Material(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: controller.loadNextBatch,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.s),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            state.nextBatchErrorMessage!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onErrorContainer,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.s),
                        Text(
                          'Retry',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onErrorContainer,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            if (kDebugMode && envConfig.enableDebugLogs) ...[
              const SizedBox(height: AppSpacing.s),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.s),
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Text(
                  'debug lat/lng=${location?.lat.toStringAsFixed(4) ?? '-'},${location?.lng.toStringAsFixed(4) ?? '-'} '
                  'plansStatus=${apiClient?.lastPlansStatus?.toString() ?? '-'} '
                  'liveStatus=${apiClient?.lastLiveResultsStatus?.toString() ?? '-'} '
                  '${state.lastBatchMix != null ? 'source: ${state.lastBatchMix!.planSourceCounts.keys.join(',')}' : ''}',
                ),
              ),
            ],
            if (state.isLoadingMore || state.isLoadingNextBatch) ...[
              const SizedBox(height: AppSpacing.s),
              const LinearProgressIndicator(),
            ],
          ],
        ),
      ),
    );
  }


  Future<void> _onEnableLocationPressed(DeckController controller) async {
    await controller.requestLocationAndReload();

    if (!mounted) {
      return;
    }

    final locationState = ref.read(locationControllerProvider);
    final permissionResult = locationState.lastPermissionResult;

    if (permissionResult == null || permissionResult.isGranted) {
      return;
    }

    if (permissionResult.canOpenAppSettings) {
      await _showLocationActionDialog(
        title: 'Location permission is blocked',
        message:
            'To find plans near you, allow location access in iOS Settings for this app.',
        actionLabel: 'Open Settings',
        onAction: () async {
          final opened = await ref
              .read(locationPermissionServiceProvider)
              .openAppSettings();
          if (!opened && mounted) {
            AppSnackbar.show(context, 'Could not open Settings.', isError: true);
          }
        },
      );
      return;
    }

    if (permissionResult.canOpenLocationSettings) {
      await _showLocationActionDialog(
        title: 'Location Services are off',
        message:
            'Turn on Location Services to let the app fetch nearby plan options.',
        actionLabel: 'Open Location Settings',
        onAction: () async {
          final opened = await ref
              .read(locationPermissionServiceProvider)
              .openLocationSettings();
          if (!opened && mounted) {
            AppSnackbar.show(context, 'Could not open Location Settings.', isError: true);
          }
        },
      );
      return;
    }

    AppSnackbar.show(
      context,
      'Location permission denied. Tap Enable location and choose Allow While Using App.',
      isError: true,
    );
  }

  Future<void> _showLocationActionDialog({
    required String title,
    required String message,
    required String actionLabel,
    required Future<void> Function() onAction,
  }) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              await onAction();
            },
            child: Text(actionLabel),
          ),
        ],
      ),
    );
  }

  Widget _scaffoldWithBody(Widget body) {
    final controller = ref.read(deckControllerProvider(widget.sessionId).notifier);

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Deck'),
        actions: [
          IconButton(
            onPressed: controller.refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: body,
    );
  }
}
