import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/core/format/formatters.dart';

void main() {
  test('distance formatter handles meters and kilometers', () {
    expect(formatDistanceMeters(null), '');
    expect(formatDistanceMeters(750), '750 m');
    expect(formatDistanceMeters(1200), '1.2 km');
    expect(formatDistanceMeters(10100), '10 km');
  });

  test('review count and source labels are normalized', () {
    expect(formatReviewCount(null), isNull);
    expect(formatReviewCount(1), '1 review');
    expect(formatReviewCount(8), '8 reviews');
    expect(formatSourceLabel(''), 'Dryad');
    expect(formatSourceLabel('foursquare'), 'Foursquare');
  });
}
