import 'package:flutter/material.dart';

class SpecialsBadge extends StatelessWidget {
  const SpecialsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text('Special'),
    );
  }
}
