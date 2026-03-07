import 'package:flutter/material.dart';

import '../../../../models/session_filters.dart';

class CategoryPicker extends StatelessWidget {
  const CategoryPicker({
    required this.selected,
    required this.onToggle,
    super.key,
  });

  final Set<Category> selected;
  final ValueChanged<Category> onToggle;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: Category.values
          .map(
            (category) => FilterChip(
              label: Text(_label(category)),
              selected: selected.contains(category),
              onSelected: (_) => onToggle(category),
            ),
          )
          .toList(growable: false),
    );
  }

  String _label(Category category) {
    final raw = category.name;
    return '${raw[0].toUpperCase()}${raw.substring(1)}';
  }
}
