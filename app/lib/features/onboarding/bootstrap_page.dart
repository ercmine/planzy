import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/identity/identity_provider.dart';
import 'onboarding_widgets.dart';

class BootstrapPage extends ConsumerWidget {
  const BootstrapPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboardingState = ref.watch(onboardingCompletedProvider);

    return OnboardingScaffold(
      child: Center(
        child: AppCard(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.m),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const DryadLogo(size: 56, variant: DryadLogoVariant.withWordmark),
                const SizedBox(height: AppSpacing.m),
                onboardingState.when(
                  loading: () => const Column(
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: AppSpacing.s),
                      Text('Getting things ready…'),
                    ],
                  ),
                  error: (_, __) => Column(
                    children: [
                      const Icon(Icons.cloud_off_rounded, size: 32),
                      const SizedBox(height: AppSpacing.s),
                      const Text(
                        'We could not finish startup right now.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.s),
                      SecondaryButton(
                        label: 'Try again',
                        onPressed: () => ref.invalidate(onboardingCompletedProvider),
                      ),
                    ],
                  ),
                  data: (_) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
