import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../core/links/link_launcher.dart';
import '../../core/links/link_types.dart';
import '../../models/plan.dart';
import '../../models/special.dart';

class SpecialsSection extends StatelessWidget {
  const SpecialsSection({
    required this.plan,
    required this.launcher,
    required this.onBookingTap,
    super.key,
  });

  final Plan plan;
  final LinkLauncher launcher;
  final Future<void> Function() onBookingTap;

  @override
  Widget build(BuildContext context) {
    final specials = plan.specials;
    if (specials.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: AppSpacing.l),
        Text('Specials', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.s),
        ...specials.take(2).map((special) => _SpecialCard(
              special: special,
              plan: plan,
              launcher: launcher,
              onBookingTap: onBookingTap,
            )),
      ],
    );
  }
}

class _SpecialCard extends StatelessWidget {
  const _SpecialCard({
    required this.special,
    required this.plan,
    required this.launcher,
    required this.onBookingTap,
  });

  final Special special;
  final Plan plan;
  final LinkLauncher launcher;
  final Future<void> Function() onBookingTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.s),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(special.headline, style: Theme.of(context).textTheme.titleSmall),
            if (special.details?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(special.details!),
            ],
            if (special.couponCode?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.xs),
              Text('Code: ${special.couponCode}'),
            ],
            if (special.bookingLink?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.s),
              OutlinedButton(
                onPressed: () async {
                  await onBookingTap();
                  if (!context.mounted) {
                    return;
                  }
                  await launcher.openLink(
                    context,
                    uri: Uri.parse(special.bookingLink!),
                    type: LinkType.booking,
                    planTitle: plan.title,
                  );
                },
                child: const Text('Book'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
