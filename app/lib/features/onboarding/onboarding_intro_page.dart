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
          const Center(child: PerbugLogo(size: 92, variant: PerbugLogoVariant.withWordmark)),
          const SizedBox(height: AppSpacing.l),
          Text(
            'Discover great places, tuned to you.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'Set your city, interests, and discovery style to unlock a personalized Local, Regional, and Global feed.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.l),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OnboardingBenefit(text: 'Choose your home city or current location.'),
                OnboardingBenefit(text: 'Pick interests that shape ranking.'),
                OnboardingBenefit(text: 'Start in Local, Regional, or Global based on your style.'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Get Started',
            onPressed: () => context.go('/onboarding/location'),
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
        ],
      ),
    );
  }
}
