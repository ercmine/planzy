String formatDistance(double? meters) {
  if (meters == null) {
    return 'Unknown distance';
  }

  if (meters < 1000) {
    return '${meters.round()} m';
  }

  final km = meters / 1000;
  return '${km.toStringAsFixed(km >= 10 ? 0 : 1)} km';
}

String formatPriceLevel(int? level) {
  if (level == null || level <= 0) {
    return 'Any';
  }

  return r'$' * level;
}

String formatRating(double? rating, int? reviewCount) {
  if (rating == null) {
    return 'No rating';
  }

  final reviews = reviewCount ?? 0;
  return '${rating.toStringAsFixed(1)} ($reviews)';
}
