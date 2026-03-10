import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'onboarding_widgets.dart';

class OnboardingSignInPage extends StatelessWidget {
  const OnboardingSignInPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OnboardingScaffold(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(
            Icons.lock_outline,
            size: 64,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: AppSpacing.m),
          Text(
            'Continue with local profile',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'You can start with a local profile now. You can connect a full account when authentication is enabled on your environment.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Continue with local profile',
            onPressed: () => context.go('/'),
          ),
        ],
      ),
    );
  }
}
