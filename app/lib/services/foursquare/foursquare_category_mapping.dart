class FoursquareCategoryQuery {
  const FoursquareCategoryQuery({
    required this.searchTerms,
    required this.fallbackLabel,
  });

  final List<String> searchTerms;
  final String fallbackLabel;

  String get query => searchTerms.join(' ');
}

class FoursquareCategoryMapping {
  const FoursquareCategoryMapping._();

  static const Map<String, FoursquareCategoryQuery> byAppCategory = {
    'food': FoursquareCategoryQuery(
      searchTerms: ['restaurant', 'cafe', 'bakery', 'dessert', 'fast casual'],
      fallbackLabel: 'Food & Dining',
    ),
    'drinks': FoursquareCategoryQuery(
      searchTerms: ['bar', 'cocktail lounge', 'brewery', 'pub'],
      fallbackLabel: 'Nightlife',
    ),
    'coffee': FoursquareCategoryQuery(
      searchTerms: ['coffee shop', 'cafe'],
      fallbackLabel: 'Coffee',
    ),
    'outdoors': FoursquareCategoryQuery(
      searchTerms: ['park', 'trail', 'garden', 'outdoor recreation'],
      fallbackLabel: 'Outdoors',
    ),
    'movies': FoursquareCategoryQuery(
      searchTerms: ['movie theater', 'cinema'],
      fallbackLabel: 'Movies',
    ),
    'music': FoursquareCategoryQuery(
      searchTerms: ['music venue', 'live music', 'concert hall', 'club'],
      fallbackLabel: 'Nightlife',
    ),
    'shopping': FoursquareCategoryQuery(
      searchTerms: ['mall', 'boutique', 'market', 'shopping center'],
      fallbackLabel: 'Shopping',
    ),
    'wellness': FoursquareCategoryQuery(
      searchTerms: ['gym', 'yoga studio', 'fitness center', 'spa'],
      fallbackLabel: 'Fitness',
    ),
    'sports': FoursquareCategoryQuery(
      searchTerms: ['sports complex', 'stadium', 'recreation center'],
      fallbackLabel: 'Sports',
    ),
    'other': FoursquareCategoryQuery(
      searchTerms: ['museum', 'gallery', 'theater', 'family attraction', 'playground'],
      fallbackLabel: 'Arts & Family',
    ),
  };

  static String queryFor(List<String> categories) {
    final terms = <String>{};
    for (final category in categories) {
      final mapped = byAppCategory[category.toLowerCase().trim()];
      if (mapped != null) {
        terms.addAll(mapped.searchTerms);
      }
    }
    if (terms.isEmpty) {
      return 'popular places';
    }
    return terms.take(6).join(' ');
  }
}
