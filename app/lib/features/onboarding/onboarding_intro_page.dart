import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'onboarding_widgets.dart';

class OnboardingIntroPage extends StatelessWidget {
  const OnboardingIntroPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(child: PerbugLogo(size: 96, variant: PerbugLogoVariant.withWordmark)),
          const SizedBox(height: AppSpacing.l),
          Text(
            'Your city, told by creators who actually go.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'Perbug blends local discovery + social momentum so every place feels worth visiting, saving, and sharing.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.l),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OnboardingBenefit(text: 'Tune your city and vibe in under a minute.'),
                OnboardingBenefit(text: 'Get local, regional, and global creator coverage.'),
                OnboardingBenefit(text: 'Build a profile that makes your reviews look premium.'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Start Discovering',
            onPressed: () => context.go('/onboarding/location'),
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
        ],
      ),
    );
  }
}
