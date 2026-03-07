import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';

class DeckCardSkeleton extends StatelessWidget {
  const DeckCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 220, color: Colors.black12),
            const SizedBox(height: AppSpacing.m),
            Container(height: 20, width: 220, color: Colors.black12),
            const SizedBox(height: AppSpacing.s),
            Container(height: 14, width: 120, color: Colors.black12),
            const SizedBox(height: AppSpacing.s),
            Container(height: 14, width: 160, color: Colors.black12),
            const Spacer(),
            Row(
              children: List<Widget>.generate(
                3,
                (_) => Expanded(
                  child: Container(
                    height: 36,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    color: Colors.black12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
