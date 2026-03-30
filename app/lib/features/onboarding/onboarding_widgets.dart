import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';

class OnboardingScaffold extends StatelessWidget {
  const OnboardingScaffold({
    required this.child,
    this.showBackButton = true,
    super.key,
  });

  final Widget child;
  final bool showBackButton;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: PerbugPageBackground(
        style: PerbugBackgroundStyle.strongerScrim,
        child: DecoratedBox(
          decoration: BoxDecoration(color: scheme.surface.withOpacity(0.3)),
          child: Stack(
            children: [
            Positioned(
              top: 0,
              left: 0,
              right: 72,
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: scheme.primary.withOpacity(0.05),
                  borderRadius: const BorderRadius.only(
                    bottomRight: Radius.circular(120),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              left: 72,
              right: 0,
              child: Container(
                height: 120,
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHigh.withOpacity(0.5),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(120),
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    child: BrandHeroCard(
                      child: Column(
                        children: [
                          if (showBackButton)
                            const Align(
                              alignment: Alignment.centerLeft,
                              child: AppBackButton(),
                            ),
                          Expanded(child: child),
                          const SizedBox(height: AppSpacing.s),
                          Text(
                            'Perbug onboarding: learn the live loop, then play immediately.',
                            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }
}

class OnboardingBenefit extends StatelessWidget {
  const OnboardingBenefit({
    required this.text,
    super.key,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppPill(label: 'NEW', icon: Icons.auto_awesome_rounded),
          const SizedBox(width: AppSpacing.s),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class PermissionInfoCard extends StatelessWidget {
  const PermissionInfoCard({
    required this.icon,
    required this.title,
    required this.description,
    super.key,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppPill(
            label: '',
            icon: icon,
            backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.12),
          ),
          const SizedBox(width: AppSpacing.s),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(description),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
