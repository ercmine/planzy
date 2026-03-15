import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_widgets.dart';

class OnboardingDiscoveryPage extends ConsumerWidget {
  const OnboardingDiscoveryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingControllerProvider);

    Future<void> finish() async {
      await ref.read(onboardingControllerProvider.notifier).finish();
      if (context.mounted) context.go('/');
    }

    return OnboardingScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Choose your discovery style', style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.s),
          Text('This sets your first-feed emphasis and Local / Regional / Global default tab.', textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.l),
          RadioListTile<DiscoveryMode>(
            value: DiscoveryMode.mostlyLocal,
            groupValue: onboarding.discoveryMode,
            onChanged: (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.mostlyLocal),
            title: const Text('Mostly Local'),
            subtitle: const Text('Nearby places first, with minimal expansion.'),
          ),
          RadioListTile<DiscoveryMode>(
            value: DiscoveryMode.balanced,
            groupValue: onboarding.discoveryMode,
            onChanged: (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.balanced),
            title: const Text('Balanced Local + Regional'),
            subtitle: const Text('Strong local relevance with nearby market fallback.'),
          ),
          RadioListTile<DiscoveryMode>(
            value: DiscoveryMode.globalInspiration,
            groupValue: onboarding.discoveryMode,
            onChanged: (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.globalInspiration),
            title: const Text('Global Inspiration'),
            subtitle: const Text('Best content globally when local supply is thin.'),
          ),
          const Spacer(),
          PrimaryButton(label: 'Finish and open my feed', onPressed: finish),
        ],
      ),
    );
  }
}
