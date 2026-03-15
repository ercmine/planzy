import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/tokens.dart';
import '../../app/theme/widgets.dart';

class AppSectionCard extends StatelessWidget {
  const AppSectionCard({
    required this.title,
    required this.icon,
    required this.child,
    super.key,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.m),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: AppIconSize.medium),
                const SizedBox(width: AppSpacing.s),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: AppSpacing.s),
            child,
          ],
        ),
      ),
    );
  }
}
