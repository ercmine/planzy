import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/deck/place_detail_models.dart';
import 'package:perbug/models/plan.dart';

void main() {
  Plan basePlan() => Plan(
        id: 'p1',
        source: 'google',
        sourceId: 'g-1',
        title: 'Cafe Uno',
        category: 'coffee',
        location: const PlanLocation(lat: 1, lng: 2, address: '1 Main St'),
        photos: const [PlanPhoto(url: 'https://img/seed.jpg', token: 'seed')],
      );

  test('normalizeDetailPhotos merges and deduplicates provider and base photos', () {
    final photos = normalizeDetailPhotos(
      basePlan: basePlan(),
      details: {
        'photos': [
          {'name': 'a'},
          {'url': 'https://img/seed.jpg'},
        ]
      },
      buildPhotoUrl: (token) => token == null ? null : 'https://img/$token.jpg',
    );

    expect(photos.length, 2);
    expect(photos.first.url, 'https://img/a.jpg');
  });

  test('normalizeHoursRows marks current day and handles empty fallback', () {
    final rows = normalizeHoursRows({'openingHoursText': ['Mon: 9-5', 'Tue: 9-5']});
    expect(rows.length, 2);
    expect(rows.where((row) => row.isToday).length <= 1, true);
  });

  test('selectRelatedPlaces excludes current place and duplicates', () {
    final related = selectRelatedPlaces(
      currentPlaceId: 'p1',
      currentSourceId: 'g-1',
      apiRelated: [
        {'id': 'p1', 'sourceId': 'g-1', 'name': 'same'},
        {'id': 'p2', 'sourceId': 'g-2', 'name': 'Two', 'category': 'coffee', 'source': 'google'},
        {'id': 'p2', 'sourceId': 'g-2', 'name': 'Two dup', 'category': 'coffee', 'source': 'google'},
      ],
      seed: const [],
      buildPhotoUrl: (token) => token,
    );

    expect(related.length, 1);
    expect(related.first.id, 'p2');
  });

  test('normalizePlaceDetail composes attribution and description fallback', () {
    final detail = normalizePlaceDetail(
      basePlan: basePlan(),
      details: {
        'summary': 'Short text',
        'providers': ['google', 'foursquare'],
      },
      buildPhotoUrl: (token) => token,
    );

    expect(detail.effectiveDescription, 'Short text');
    expect(detail.attribution.any((item) => item.provider == 'foursquare'), isTrue);
  });
}
