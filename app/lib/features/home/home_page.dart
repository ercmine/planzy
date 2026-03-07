import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'home_controller.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('OurPlanPlan')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('OurPlanPlan', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.s),
                  Text(state.statusMessage),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.m),
            PrimaryButton(
              label: 'Go to Sessions',
              onPressed: () => context.go('/sessions'),
            ),
            const SizedBox(height: AppSpacing.s),
            SecondaryButton(
              label: 'Open Sample Invite',
              onPressed: () => context.go('/invite/SAMPLECODE'),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(homeControllerProvider.notifier).increment(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
