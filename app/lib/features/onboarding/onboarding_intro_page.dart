import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../providers/app_providers.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

class OnboardingIntroPage extends ConsumerWidget {
  const OnboardingIntroPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingControllerProvider);
    final location = ref.watch(locationControllerProvider);

    return OnboardingScaffold(
      showBackButton: false,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('The real world is now your tactical map.', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.s),
            const Text(
              'Perbug is a world-map strategy RPG built on real geography. Move node-to-node, deploy your squad, earn Perbug + resources, and expand your frontier.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.m),
            const PermissionInfoCard(
              icon: Icons.public,
              title: 'Real places become playable nodes',
              description: 'Your nearby streets, parks, and districts become strategic jump targets on the map.',
            ),
            const SizedBox(height: AppSpacing.s),
            const PermissionInfoCard(
              icon: Icons.groups_rounded,
              title: 'Your starter squad drives encounters',
              description: 'You begin with an active 3-unit squad. Roles matter immediately when encounters trigger.',
            ),
            const SizedBox(height: AppSpacing.s),
            const PermissionInfoCard(
              icon: Icons.bolt_rounded,
              title: 'Movement costs, nodes reward',
              description: 'Each move spends energy and Perbug. Clearing nodes returns XP, materials, and momentum.',
            ),
            const SizedBox(height: AppSpacing.m),
            PrimaryButton(
              label: 'Deploy to live map',
              isLoading: onboarding.isBusy,
              onPressed: onboarding.isBusy
                  ? null
                  : () async {
                      await ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
                      await ref.read(onboardingControllerProvider.notifier).startOnboardingExpedition();
                      if (context.mounted) {
                        context.go('/');
                      }
                    },
            ),
            const SizedBox(height: AppSpacing.s),
            TextButton(
              onPressed: () async {
                await ref.read(onboardingControllerProvider.notifier).skipOnboarding();
                if (context.mounted) context.go('/');
              },
              child: const Text('Skip tutorial and enter command map'),
            ),
            if (location.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s),
                child: Text(
                  'Location fallback active. We will start you in the default mission region. (${location.errorMessage})',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
