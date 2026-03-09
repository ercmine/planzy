import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../app/theme/widgets.dart';

class GradientHeroCard extends StatelessWidget {
  const GradientHeroCard({
    required this.title,
    required this.subtitle,
    required this.pills,
    this.onTap,
    super.key,
  });

  final String title;
  final String subtitle;
  final List<Widget> pills;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(AppSpacing.radiusXL),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.radiusXL),
          gradient: LinearGradient(
            colors: [
              theme.colorScheme.primary,
              theme.colorScheme.tertiary,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.l),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.onPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                subtitle,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onPrimary.withOpacity(0.92),
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              Wrap(spacing: AppSpacing.xs, runSpacing: AppSpacing.xs, children: pills),
            ],
          ),
        ),
      ),
    );
  }
}

class SurfaceNavCard extends StatelessWidget {
  const SurfaceNavCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
    this.badge,
    super.key,
  });

  final IconData icon;
  final String title;
  final String description;
  final String? badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppSpacing.radiusL),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xs),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                child: Icon(icon),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(description, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: AppSpacing.xs),
                AppPill(label: badge!, icon: Icons.auto_awesome),
              ],
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class QuotaProgressTile extends StatelessWidget {
  const QuotaProgressTile({
    required this.label,
    required this.used,
    required this.limit,
    super.key,
  });

  final String label;
  final int used;
  final int limit;

  @override
  Widget build(BuildContext context) {
    final ratio = limit <= 0 ? 0.0 : (used / limit).clamp(0, 1).toDouble();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: AppSpacing.xs),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: ratio),
            duration: const Duration(milliseconds: 450),
            builder: (context, value, _) {
              return LinearProgressIndicator(value: value, minHeight: 8);
            },
          ),
          const SizedBox(height: AppSpacing.xs),
          Text('$used / $limit used', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
