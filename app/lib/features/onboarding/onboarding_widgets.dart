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
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF131A35), Color(0xFF0B1022), Color(0xFF111A31)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: scheme.surface.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: scheme.outlineVariant.withOpacity(0.45)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    child: Column(
                      children: [
                        if (showBackButton)
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: AppBackButton(),
                          ),
                        Expanded(child: child),
                      ],
                    ),
                  ),
                ),
              ),
            ),
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
          const AppPill(label: '★'),
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
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          ),
          const SizedBox(width: AppSpacing.s),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
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
