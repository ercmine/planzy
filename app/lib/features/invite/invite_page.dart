import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'invite_controller.dart';

class InvitePage extends ConsumerWidget {
  const InvitePage({required this.code, super.key});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(inviteControllerProvider(code));

    return Scaffold(
      appBar: AppBar(title: const Text('Invite')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Invite code: ${state.code}'),
              const SizedBox(height: AppSpacing.s),
              Text('Status: ${state.status}'),
              const SizedBox(height: AppSpacing.m),
              PrimaryButton(
                label: 'Continue to Sessions',
                onPressed: () {
                  ref.read(inviteControllerProvider(code).notifier).acceptInvite();
                  context.go('/sessions');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
