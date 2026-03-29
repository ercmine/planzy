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
          gradient: const LinearGradient(
            colors: [Color(0xFF6741FF), Color(0xFFFF6B8B)],
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
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                subtitle,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: Colors.white.withOpacity(0.92),
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
              CircleAvatar(radius: 20, child: Icon(icon)),
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

class SearchLaunchCard extends StatelessWidget {
  const SearchLaunchCard({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          const Icon(Icons.search_rounded),
          const SizedBox(width: AppSpacing.s),
          Expanded(
            child: Text(
              'Search places, creators, and guides',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          const AppPill(label: 'Near me'),
        ],
      ),
    );
  }
}

class PlacePreviewCard extends StatelessWidget {
  const PlacePreviewCard({required this.title, required this.category, required this.rating, required this.distance, required this.creator, super.key});

  final String title;
  final String category;
  final String rating;
  final String distance;
  final String creator;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 140,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSpacing.radiusM),
              gradient: const LinearGradient(colors: [Color(0xFFFFD7A8), Color(0xFFFF8A8A)]),
            ),
          ),
          const SizedBox(height: AppSpacing.s),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          Text(category, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: AppSpacing.s),
          Row(
            children: [
              AppPill(label: '$rating ★'),
              const SizedBox(width: AppSpacing.xs),
              AppPill(label: distance),
              const Spacer(),
              Text(creator, style: Theme.of(context).textTheme.labelMedium),
            ],
          ),
        ],
      ),
    );
  }
}

class AdInlineCard extends StatelessWidget {
  const AdInlineCard({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.s),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.radiusM),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        ),
        child: const Row(
          children: [
            AppPill(label: 'Sponsored'),
            SizedBox(width: AppSpacing.s),
            Expanded(child: Text('Ad slot: local picks from partners, placed every 10 cards.')),
          ],
        ),
      ),
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({required this.icon, required this.title, required this.description, required this.cta, this.onPressed, super.key});

  final IconData icon;
  final String title;
  final String description;
  final String cta;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          Icon(icon, size: 34),
          const SizedBox(height: AppSpacing.s),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(description, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: AppSpacing.s),
          FilledButton.tonal(onPressed: onPressed, child: Text(cta)),
        ],
      ),
    );
  }
}

class FeedUpdateCard extends StatelessWidget {
  const FeedUpdateCard({required this.name, required this.handle, required this.place, required this.note, super.key});

  final String name;
  final String handle;
  final String place;
  final String note;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(child: Icon(Icons.person_outline_rounded)),
              const SizedBox(width: AppSpacing.s),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name), Text(handle, style: Theme.of(context).textTheme.labelMedium)]),
            ],
          ),
          const SizedBox(height: AppSpacing.s),
          Text('at $place', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.xs),
          Text(note, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class CreatorProfileHeader extends StatelessWidget {
  const CreatorProfileHeader({required this.name, required this.handle, required this.tagline, super.key});

  final String name;
  final String handle;
  final String tagline;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(radius: 30, child: Icon(Icons.person_outline_rounded, size: 30)),
          const SizedBox(height: AppSpacing.s),
          Text(name, style: Theme.of(context).textTheme.titleLarge),
          Text(handle, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.xs),
          Text(tagline, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
