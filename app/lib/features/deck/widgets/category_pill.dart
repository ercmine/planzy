import 'package:flutter/material.dart';

class CategoryPill extends StatelessWidget {
  const CategoryPill({required this.category, super.key});

  final String category;

  @override
  Widget build(BuildContext context) {
    return Chip(
      visualDensity: VisualDensity.compact,
      label: Text(category),
    );
  }
}
