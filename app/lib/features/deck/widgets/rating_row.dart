import 'package:flutter/material.dart';

import '../../../core/format/formatters.dart';

class RatingRow extends StatelessWidget {
  const RatingRow({
    required this.rating,
    required this.reviewCount,
    super.key,
  });

  final double? rating;
  final int? reviewCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.star, size: 16, color: Colors.amber),
        const SizedBox(width: 4),
        Text(formatRating(rating, reviewCount)),
      ],
    );
  }
}
