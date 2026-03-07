import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../models/swipe.dart';
import '../../providers/app_providers.dart';

class DeckPage extends ConsumerWidget {
  const DeckPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(deckControllerProvider(sessionId));
    final controller = ref.read(deckControllerProvider(sessionId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Deck')),
      body: Builder(
        builder: (context) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.currentPlan == null) {
            return const Center(child: Text('No more plans right now.'));
          }

          final plan = state.currentPlan!;
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.m),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.m),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(plan.title, style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: AppSpacing.s),
                        Text(plan.category),
                        const SizedBox(height: AppSpacing.s),
                        Text(plan.description ?? 'No description available.'),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => controller.swipeCurrent(SwipeAction.no),
                        child: const Text('No'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => controller.swipeCurrent(SwipeAction.maybe),
                        child: const Text('Maybe'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => controller.swipeCurrent(SwipeAction.yes),
                        child: const Text('Yes'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: controller.showResultsCTA
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/sessions/$sessionId/results'),
              icon: const Icon(Icons.insights_outlined),
              label: const Text('View Results'),
            )
          : null,
    );
  }
}
