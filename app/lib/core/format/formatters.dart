String formatDistanceMeters(double? distanceMeters) {
  if (distanceMeters == null) {
    return '';
  }

  if (distanceMeters < 1000) {
    return '${distanceMeters.round()} m';
  }

  final km = distanceMeters / 1000;
  final fixed = km >= 10 ? km.toStringAsFixed(0) : km.toStringAsFixed(1);
  return '$fixed km';
}

String formatPriceLevel(int? priceLevel) {
  if (priceLevel == null || priceLevel <= 0) {
    return 'Any';
  }
  if (priceLevel > 4) {
    return r'$$$$';
  }
  return r'$' * priceLevel;
}

String formatRating(double? rating, int? reviews) {
  if (rating == null) {
    return 'No ratings yet';
  }

  final ratingText = rating.toStringAsFixed(1);
  if (reviews == null || reviews <= 0) {
    return ratingText;
  }

  return '$ratingText ($reviews)';
}
