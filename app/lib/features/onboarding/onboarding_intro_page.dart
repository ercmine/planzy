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
            'Plan faster with your people.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'Perbug keeps group decisions moving with less back-and-forth.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.l),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OnboardingBenefit(text: 'See nearby ideas in seconds.'),
                OnboardingBenefit(text: 'Invite friends with one tap.'),
                OnboardingBenefit(text: 'Vote quickly and pick together.'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Get Started',
            onPressed: () => context.go('/onboarding/interests'),
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
        ],
      ),
    );
  }
}
