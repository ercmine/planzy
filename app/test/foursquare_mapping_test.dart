import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/services/foursquare/foursquare_category_mapping.dart';
import 'package:perbug/services/foursquare/foursquare_models.dart';
import 'package:perbug/services/foursquare/foursquare_plan_mapper.dart';

void main() {
  test('category mapping returns smart query terms', () {
    final query = FoursquareCategoryMapping.queryFor(['food', 'coffee']);

    expect(query, contains('restaurant'));
    expect(query, contains('coffee shop'));
  });

  test('plan mapper uses fallback description and preserves gallery', () {
    final place = FoursquarePlace(
      fsqId: 'abc',
      name: 'Cafe Test',
      categories: const [FoursquareCategory(id: 13032, name: 'Café')],
      location: const FoursquareLocation(
        lat: 37.78,
        lng: -122.41,
        locality: 'San Francisco',
      ),
      photos: const [
        FoursquarePhoto(id: 'p1', prefix: 'https://img/', suffix: '.jpg'),
        FoursquarePhoto(id: 'p2', prefix: 'https://img/', suffix: '.png'),
      ],
    );

    final plan = FoursquarePlanMapper.toPlan(place);

    expect(plan.source, 'foursquare');
    expect(plan.description, contains('Café'));
    expect(plan.photos, isNotNull);
    expect(plan.photos!.length, 2);
  });
}
