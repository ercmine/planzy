import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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
          Icon(
            Icons.groups_rounded,
            size: 72,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: AppSpacing.m),
          Text(
            'OurPlanPlan',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'Plan faster with people you care about.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.l),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OnboardingBenefit(text: 'Discover nearby ideas in seconds.'),
                OnboardingBenefit(text: 'Invite friends without copy-paste friction.'),
                OnboardingBenefit(text: 'Keep plans moving with less back-and-forth.'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Get Started',
            onPressed: () => context.go('/onboarding/permissions'),
          ),
        ],
      ),
    );
  }
}
