import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'invite_controller.dart';
import '../../core/widgets/app_back_button.dart';

class InvitePage extends ConsumerWidget {
  const InvitePage({required this.code, super.key});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(inviteControllerProvider(code));

    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Session Invite')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Invite code: ${state.code}'),
              const SizedBox(height: AppSpacing.s),
              const Text('Join this session to start planning together.'),
              const SizedBox(height: AppSpacing.s),
              Text('Status: ${state.status ?? 'Ready'}'),
              if (state.errorMessage != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(state.errorMessage!),
              ],
              const SizedBox(height: AppSpacing.m),
              FilledButton(
                onPressed: state.isValid && !state.isJoining
                    ? () async {
                        final sessionId = await ref
                            .read(inviteControllerProvider(code).notifier)
                            .joinSession();
                        if (sessionId != null && context.mounted) {
                          context.go('/sessions/$sessionId');
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
      ),
    );
  }
}
