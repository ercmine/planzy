import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';

class OnboardingScaffold extends StatelessWidget {
  const OnboardingScaffold({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.l),
              child: child,
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
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.check_circle_outline),
          ),
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
          Icon(icon),
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
