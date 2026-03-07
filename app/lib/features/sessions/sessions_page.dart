import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'session_controller.dart';

class SessionsPage extends ConsumerWidget {
  const SessionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sessions')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (state.isLoading) const LinearProgressIndicator(),
            const SizedBox(height: AppSpacing.s),
            Expanded(
              child: ListView.separated(
                itemCount: state.sessions.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
                itemBuilder: (context, index) {
                  final sessionId = state.sessions[index];
                  return AppCard(
                    child: Row(
                      children: [
                        Expanded(child: Text('Session $sessionId')),
                        SecondaryButton(
                          label: 'Open',
                          onPressed: () => context.go('/sessions/$sessionId'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
