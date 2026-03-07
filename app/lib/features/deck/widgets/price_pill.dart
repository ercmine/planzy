import 'package:flutter/material.dart';

import '../../../core/format/formatters.dart';

class PricePill extends StatelessWidget {
  const PricePill({required this.priceLevel, super.key});

  final int? priceLevel;

  @override
  Widget build(BuildContext context) {
    return Chip(
      visualDensity: VisualDensity.compact,
      label: Text(formatPriceLevel(priceLevel)),
    );
  }
}
