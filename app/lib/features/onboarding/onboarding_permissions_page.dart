import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../providers/app_providers.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

class OnboardingPermissionsPage extends ConsumerWidget {
  const OnboardingPermissionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> finishOnboarding() async {
      await ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
      await ref.read(onboardingControllerProvider.notifier).finish();
      if (context.mounted) {
        context.go('/');
      }
    }

    final locationState = ref.watch(locationControllerProvider);

    return OnboardingScaffold(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Center(child: DryadLogo(size: 56)),
          const SizedBox(height: AppSpacing.m),
          Text(
            'Quick setup',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'We only ask for permissions when they help your session.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.l),
          const PermissionInfoCard(
            icon: Icons.location_on_outlined,
            title: 'Location',
            description: 'Find places that are close enough for everyone.',
          ),
          if (locationState.errorMessage != null) ...[
            const SizedBox(height: AppSpacing.s),
            Text(
              locationState.errorMessage!,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: AppSpacing.s),
          const PermissionInfoCard(
            icon: Icons.contacts_outlined,
            title: 'Contacts',
            description: 'Invite friends quickly without manual typing.',
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
