import 'package:flutter/material.dart';

class RatingRow extends StatelessWidget {
  const RatingRow({required this.text, super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.star, size: 16, color: Colors.amber),
        const SizedBox(width: 4),
        Text(text),
      ],
    );
  }
}
