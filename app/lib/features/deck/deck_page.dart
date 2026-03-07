import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../core/env/env.dart';
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

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() {
      ref.read(deckControllerProvider(widget.sessionId).notifier).initialize();
    });
  }

  @override
  void dispose() {
    _swiperController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deckState = ref.watch(deckControllerProvider(widget.sessionId));
    final deckController = ref.read(deckControllerProvider(widget.sessionId).notifier);
    final env = ref.watch(envConfigProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Deck')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          children: [
            Expanded(child: _buildContent(context, deckState, deckController, env)),
            const SizedBox(height: AppSpacing.s),
            DeckActionsBar(
              isDisabled: deckState.plans.isEmpty || deckState.isLoadingInitial,
              canUndo: deckState.undoStack.isNotEmpty,
              onNo: () => _swiperController.swipe(CardSwiperDirection.left),
              onYes: () => _swiperController.swipe(CardSwiperDirection.right),
              onMaybe: () => _swiperController.swipe(CardSwiperDirection.top),
              onUndo: deckController.undo,
              onSuperYes: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Super Yes coming soon')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    DeckState state,
    DeckController controller,
    EnvConfig env,
  ) {
    if (state.isLoadingInitial && state.plans.isEmpty) {
      return const DeckCardSkeleton();
    }

    if (state.errorMessage != null && state.plans.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(state.errorMessage!),
            const SizedBox(height: AppSpacing.s),
            FilledButton(
              onPressed: controller.refresh,
              child: const Text('Retry'),
            ),
            const SizedBox(height: AppSpacing.s),
            OutlinedButton(
              onPressed: controller.requestLocation,
              child: const Text('Request location'),
            ),
          ],
        ),
      );
    }

    if (state.plans.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('No more ideas'),
            const SizedBox(height: AppSpacing.s),
            FilledButton(onPressed: controller.refresh, child: const Text('Retry')),
            const SizedBox(height: AppSpacing.s),
            OutlinedButton(
              onPressed: () => context.push('/sessions/${widget.sessionId}/settings'),
              child: const Text('Adjust filters'),
            ),
          ],
        ),
      );
    }

    controller.registerTopCardViewed();

    return Column(
      children: [
        Expanded(
          child: CardSwiper(
            controller: _swiperController,
            cardsCount: state.plans.length,
            isLoop: false,
            allowedSwipeDirection:
                const AllowedSwipeDirection.only(left: true, right: true, up: true),
            onSwipe: (previousIndex, _, direction) {
              if (direction == CardSwiperDirection.left) {
                controller.onSwipeNo();
              } else if (direction == CardSwiperDirection.right) {
                controller.onSwipeYes();
              } else if (direction == CardSwiperDirection.top) {
                controller.onSwipeMaybe();
              }
              return true;
            },
            cardBuilder: (context, index, _, __) {
              final plan = state.plans[index];
              return DeckCard(
                plan: plan,
                onTap: () async {
                  controller.onCardOpened(plan);
                  await CardDetailsSheet.show(
                    context,
                    plan: plan,
                    onLinkTap: (linkType) {
                      controller.onOutboundLinkClicked(plan, linkType);
                    },
                  );
                },
              );
            },
          ),
        ),
        if (state.isLoadingMore) const LinearProgressIndicator(),
        if (state.usedFallback)
          const Padding(
            padding: EdgeInsets.only(top: AppSpacing.s),
            child: Text('Fallback suggestions are active.'),
          ),
        if (kDebugMode && env.enableDebugLogs && state.lastBatchMix != null)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.s),
            child: Text(
              'Sources: ${state.lastBatchMix!.planSourceCounts.entries.map((e) => '${e.key} ${e.value}').join(', ')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
      ],
    );
  }
}
