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
      showBackButton: false,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(child: PerbugLogo(size: 96, variant: PerbugLogoVariant.withWordmark)),
          const SizedBox(height: AppSpacing.l),
          Text(
            'Your city, told with electric energy.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'Perbug turns discovery into momentum with vivid creator reviews, smart local signals, and save-worthy places that feel alive.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.l),
          const BrandHeroCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OnboardingBenefit(text: 'Tune your city and vibe in under a minute.'),
                OnboardingBenefit(text: 'Flow between local, map, and creator discovery with one brand language.'),
                OnboardingBenefit(text: 'Build a profile and review presence that feels premium from day one.'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Start Discovering',
            onPressed: () => context.go('/onboarding/location'),
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
          const SizedBox(height: AppSpacing.s),
          Center(
            child: Text(
              'Launch-ready social discovery, powered by Perbug blue + orange.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}
