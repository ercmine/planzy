import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';

class SponsoredBadge extends StatelessWidget {
  const SponsoredBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: () => showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Sponsored placement'),
          content: const Text('Sponsored means this venue paid for placement.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Got it'),
            ),
          ],
        ),
      ),
      child: const AppPill(label: 'Sponsored', icon: Icons.info_outline),
    );
  }
}
