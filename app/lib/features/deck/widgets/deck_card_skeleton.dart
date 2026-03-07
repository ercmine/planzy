import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';

class DeckCardSkeleton extends StatelessWidget {
  const DeckCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _block(color, 220, 20),
            const SizedBox(height: AppSpacing.s),
            _block(color, 120, 16),
            const SizedBox(height: AppSpacing.m),
            _block(color, double.infinity, 180),
            const SizedBox(height: AppSpacing.m),
            _block(color, 170, 14),
            const SizedBox(height: AppSpacing.s),
            _block(color, 140, 14),
          ],
        ),
      ),
    );
  }

  Widget _block(Color color, double width, double height) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}
