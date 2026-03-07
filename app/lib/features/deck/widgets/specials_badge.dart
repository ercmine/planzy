import 'package:flutter/material.dart';

class SpecialsBadge extends StatelessWidget {
  const SpecialsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text('Special'),
    );
  }
}
