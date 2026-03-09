import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/spacing.dart';
import '../../../providers/app_providers.dart';
import '../../../core/widgets/app_back_button.dart';

class JoinSessionPage extends ConsumerWidget {
  const JoinSessionPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(joinSessionControllerProvider(sessionId));

    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Join Session')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Session code: ${state.code}'),
            const SizedBox(height: AppSpacing.s),
            Text(state.isValid ? 'Code looks good.' : 'Invalid code format.'),
            if (state.errorMessage != null) ...[
              const SizedBox(height: AppSpacing.s),
              Text(state.errorMessage!),
            ],
            const SizedBox(height: AppSpacing.m),
            FilledButton(
              onPressed: state.isValid && !state.isJoining
                  ? () async {
                      final joinedId = await ref
                          .read(joinSessionControllerProvider(sessionId).notifier)
                          .join();
                      await ref.read(sessionsControllerProvider.notifier).loadSessions();
                      if (joinedId != null && context.mounted) {
                        context.go('/sessions/$joinedId');
                      }
                    }
                  : null,
              child: state.isJoining
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Join Session'),
            ),
          ],
        ),
      ),
    );
  }
}
