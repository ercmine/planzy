import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

class OnboardingPermissionsPage extends ConsumerWidget {
  const OnboardingPermissionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> finishOnboarding() async {
      await ref.read(onboardingControllerProvider.notifier).finish();
      if (context.mounted) {
        context.go('/');
      }
    }

    return OnboardingScaffold(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Before you start',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'We will ask for a couple permissions later, only when needed.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.l),
          const PermissionInfoCard(
            icon: Icons.location_on_outlined,
            title: 'Location',
            description:
                'Helps us suggest nearby places that match your group plans.',
          ),
          const SizedBox(height: AppSpacing.s),
          const PermissionInfoCard(
            icon: Icons.contacts_outlined,
            title: 'Contacts',
            description:
                'Lets you invite friends quickly without manually typing details.',
          ),
          const SizedBox(height: AppSpacing.l),
          PrimaryButton(
            label: 'Continue',
            onPressed: finishOnboarding,
          ),
          const SizedBox(height: AppSpacing.s),
          SecondaryButton(
            label: 'Not now',
            onPressed: finishOnboarding,
          ),
        ],
      ),
    );
  }
}
