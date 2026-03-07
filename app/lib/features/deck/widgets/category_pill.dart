import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';

class CategoryPill extends StatelessWidget {
  const CategoryPill({required this.category, super.key});

  final String category;

  @override
  Widget build(BuildContext context) {
    return AppPill(label: category, icon: Icons.label_outline_rounded);
  }
}
