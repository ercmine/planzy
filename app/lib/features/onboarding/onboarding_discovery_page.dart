import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../app/app_routes.dart';
import 'onboarding_controller.dart';
import 'onboarding_models.dart';
import 'onboarding_widgets.dart';

class OnboardingDiscoveryPage extends ConsumerWidget {
  const OnboardingDiscoveryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingControllerProvider);

    Future<void> finish() async {
      final result = await ref.read(onboardingControllerProvider.notifier).finishAndBootstrapFeed();
      if (!context.mounted) {
        return;
      }
      if (result.isSuccess) {
        context.go(AppRoutes.liveMap);
      } else if (result.message != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.message!)),
        );
      }
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
            onChanged: onboarding.isFinishing
                ? null
                : (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.mostlyLocal),
            title: const Text('Mostly Local'),
            subtitle: const Text('Nearby places first, with minimal expansion.'),
          ),
          RadioListTile<DiscoveryMode>(
            value: DiscoveryMode.balanced,
            groupValue: onboarding.discoveryMode,
            onChanged: onboarding.isFinishing
                ? null
                : (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.balanced),
            title: const Text('Balanced Local + Regional'),
            subtitle: const Text('Strong local relevance with nearby market fallback.'),
          ),
          RadioListTile<DiscoveryMode>(
            value: DiscoveryMode.globalInspiration,
            groupValue: onboarding.discoveryMode,
            onChanged: onboarding.isFinishing
                ? null
                : (value) => ref.read(onboardingControllerProvider.notifier).setDiscoveryMode(value ?? DiscoveryMode.globalInspiration),
            title: const Text('Global Inspiration'),
            subtitle: const Text('Best content globally when local supply is thin.'),
          ),
          if (onboarding.errorMessage != null) ...[
            const SizedBox(height: AppSpacing.s),
            Text(
              onboarding.errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
              textAlign: TextAlign.center,
            ),
          ],
          const Spacer(),
          PrimaryButton(label: 'Finish and open my feed', onPressed: onboarding.isFinishing ? null : finish, isLoading: onboarding.isFinishing),
        ],
      ),
    );
  }
}
