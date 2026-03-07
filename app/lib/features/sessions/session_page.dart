import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'session_controller.dart';

class SessionPage extends ConsumerWidget {
  const SessionPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionControllerProvider(sessionId));

    return Scaffold(
      appBar: AppBar(title: Text('Session ${state.sessionId}')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Session ID: ${state.sessionId}'),
              const SizedBox(height: AppSpacing.s),
              Text('Swipe count: ${state.swipesCount}'),
              const SizedBox(height: AppSpacing.m),
              PrimaryButton(
                label: 'Increment swipe count',
                onPressed: () {
                  ref
                      .read(sessionControllerProvider(sessionId).notifier)
                      .incrementSwipeCount();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
