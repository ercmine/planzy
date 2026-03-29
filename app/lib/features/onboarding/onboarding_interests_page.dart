import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../app/app_routes.dart';
import '../../models/category_labels.dart';
import '../../models/session_filters.dart';
import 'onboarding_controller.dart';
import 'onboarding_widgets.dart';

class OnboardingInterestsPage extends ConsumerWidget {
  const OnboardingInterestsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingControllerProvider);
    final selected = onboarding.selectedCategories.toSet();

    return OnboardingScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Choose your taste profile',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.s),
          Text(
            'This drives what appears first in feed, map previews, and your creator recommendations.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.l),
          Wrap(
            spacing: AppSpacing.s,
            runSpacing: AppSpacing.s,
            children: Category.values
                .map(
                  (category) => FilterChip.elevated(
                    label: Text(categoryLabel(category)),
                    selected: selected.contains(category.name),
                    onSelected: (_) => ref.read(onboardingControllerProvider.notifier).toggleCategory(category.name),
                  ),
                )
                .toList(growable: false),
          ),
          const Spacer(),
          PrimaryButton(
            label: 'Continue',
            onPressed: () => context.go(AppRoutes.onboardingDiscovery),
            icon: const Icon(Icons.arrow_forward_rounded),
          ),
          const SizedBox(height: AppSpacing.s),
          SecondaryButton(
            label: 'Skip for now',
            onPressed: () => context.go(AppRoutes.onboardingDiscovery),
          ),
        ],
      ),
    );
  }
}
