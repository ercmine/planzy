import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'home_controller.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);

    return AppScaffold(
      appBar: AppBar(
        title: const PerbugLogo(size: 28, variant: PerbugLogoVariant.withWordmark),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s),
            child: AppIconButton(
              icon: Icons.settings,
              tooltip: 'Settings',
              onPressed: () => context.go('/settings'),
            ),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const PerbugLogo(size: 32, variant: PerbugLogoVariant.withWordmark),
                const SizedBox(height: AppSpacing.s),
                Text(state.statusMessage),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.m),
          PrimaryButton(label: 'Go to Sessions', onPressed: () => context.go('/sessions')),
          const SizedBox(height: AppSpacing.s),
          SecondaryButton(label: 'Open Sample Invite', onPressed: () => context.go('/invite/SAMPLECODE')),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(homeControllerProvider.notifier).increment(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
