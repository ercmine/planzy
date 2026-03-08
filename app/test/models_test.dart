import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/api/models.dart';
import 'package:perbug/core/json_parsers.dart';
import 'package:perbug/models/deck_batch.dart';
import 'package:perbug/models/deep_links.dart';
import 'package:perbug/models/plan.dart';
import 'package:perbug/models/telemetry.dart';

void main() {
  group('Plan and DeepLinks JSON', () {
    test('parses v2 deep links and metadata specials', () {
      final json = {
        'id': 'p1',
        'source': 'google',
        'sourceId': 'src-1',
        'title': 'Coffee Spot',
        'category': 'coffee',
        'location': {'lat': 1.2, 'lng': 3.4, 'address': '123 Main'},
        'deepLinks': {
          'mapsLink': 'https://maps.example.com',
          'websiteLink': 'https://venue.example.com',
          'callLink': 'tel:+123456789',
          'bookingLink': 'https://book.example.com',
          'ticketLink': 'https://tickets.example.com',
        },
        'metadata': {
          'specials': [
            {
              'title': 'Happy Hour',
              'description': 'Half price drinks',
              'start': '16:00',
              'end': '18:00',
            }
          ]
        }
      };

      final plan = Plan.fromJson(json);
      expect(plan.deepLinks, isA<DeepLinks>());
      expect(plan.deepLinks?.mapsLink, contains('maps.example.com'));
      expect(plan.specials, isNotEmpty);
      expect(plan.specials.first.title, 'Happy Hour');
      expect(plan.toJson()['id'], 'p1');
    });

    test('parses plan location numeric strings', () {
      final plan = Plan.fromJson({
        'id': 'p2',
        'source': 'google',
        'sourceId': 'src-2',
        'title': 'Tea Spot',
        'category': 'tea',
        'location': {'lat': '44.8600', 'lng': '-93.5500'},
        'distanceMeters': '44.86',
        'rating': '4.5',
        'reviewCount': '2102',
      });

      expect(plan.location.lat, closeTo(44.86, 0.0001));
      expect(plan.location.lng, closeTo(-93.55, 0.0001));
      expect(plan.distanceMeters, closeTo(44.86, 0.0001));
      expect(plan.rating, closeTo(4.5, 0.0001));
      expect(plan.reviewCount, 2102);
    });
  });

  group('DeckBatchResponse JSON', () {
    test('parses nextCursor null and non-null with mix counts', () {
      final withCursor = DeckBatchResponse.fromJson({
        'sessionId': 's1',
        'plans': [_planJson('a')],
        'nextCursor': 'cursor-2',
        'mix': {
          'providersUsed': ['google', 'yelp'],
          'planSourceCounts': {'google': 1, 'curated': 1},
          'categoryCounts': {'coffee': 2},
          'sponsoredCount': 0,
        },
      });

      final withoutCursor = DeckBatchResponse.fromJson({
        'sessionId': 's1',
        'plans': const [],
        'nextCursor': null,
        'mix': {
          'providersUsed': ['curated'],
          'planSourceCounts': {'curated': 2},
          'categoryCounts': {'food': 2},
          'sponsoredCount': 1,
        },
      });

      expect(withCursor.nextCursor, 'cursor-2');
      expect(withCursor.mix.planSourceCounts['google'], 1);
      expect(withoutCursor.nextCursor, isNull);
      expect(withoutCursor.mix.sponsoredCount, 1);
    });
  });




  group('JSON parser helpers', () {
    test('coerces num and string values', () {
      expect(parseDouble(null), isNull);
      expect(parseDouble(4), 4.0);
      expect(parseDouble('4.5'), 4.5);
      expect(parseDouble('bad'), isNull);

      expect(parseInt(null), isNull);
      expect(parseInt(2102), 2102);
      expect(parseInt('2102'), 2102);
      expect(parseInt('4.5'), isNull);
      expect(parseInt('PRICE_LEVEL_INEXPENSIVE'), isNull);
    });
  });

  group('Backend API models', () {
    test('parses plans array item shape with numeric strings', () {
      final plan = PlanApiModel.fromJson({
        'id': 'sample-plan-2',
        'title': 'Stringy Coffee',
        'category': 'coffee',
        'lat': '44.86',
        'lng': '-93.55',
        'rating': '4.5',
        'userRatingCount': '2102',
        'priceLevel': 'PRICE_LEVEL_INEXPENSIVE',
      });

      expect(plan.lat, closeTo(44.86, 0.0001));
      expect(plan.lng, closeTo(-93.55, 0.0001));
      expect(plan.rating, closeTo(4.5, 0.0001));
      expect(plan.userRatingCount, 2102);
      expect(plan.priceLevel, isNull);
    });

    test('parses plans array item shape', () {
      final plan = PlanApiModel.fromJson({
        'id': 'sample-plan-1',
        'title': 'Coffee walk',
        'category': 'coffee',
        'source': 'stub',
        'placeId': 'abc123',
        'address': '123 Main',
        'lat': 44.1,
        'lng': -93.2,
        'rating': 4.7,
        'userRatingCount': 99,
        'priceLevel': 2,
        'googleMapsUri': 'https://maps.google.com',
        'websiteUri': 'https://venue.example',
        'photo': 'https://cdn.example/p.jpg',
        'unexpected': 'ignored',
      });
      expect(plan.id, 'sample-plan-1');
      expect(plan.title, 'Coffee walk');
      expect(plan.category, 'coffee');
      expect(plan.source, 'stub');
      expect(plan.placeId, 'abc123');
      expect(plan.lat, 44.1);
      expect(plan.googleMapsUri, contains('maps.google.com'));
    });

    test('parses live-results response shape', () {
      final response = LiveResultsResponse.fromJson({
        'results': [
          {
            'sessionId': 'demo-session',
            'topPlanId': 'sample-plan-1',
            'topPlanTitle': 'Coffee walk',
            'score': 0.91,
          }
        ],
        'summary': {
          'activeSessions': 1,
          'generatedAt': '2026-03-07T22:25:21.858Z',
        }
      });

      expect(response.results.first.topPlanTitle, 'Coffee walk');
      expect(response.summary.activeSessions, 1);
    });
  });

  group('TelemetryEventInput JSON', () {
    test('serializes and deserializes swipe events', () {
      const event = TelemetryEventInput.swipe(
        planId: 'plan-1',
        action: 'yes',
        cursor: 'c1',
        source: 'google',
      );
      final encoded = event.toJson();
      final decoded = TelemetryEventInput.fromJson(encoded);

      expect(encoded['event'], 'swipe');
      expect(decoded, isA<SwipeEventInput>());
      expect((decoded as SwipeEventInput).planId, 'plan-1');
    });
  });
}

Map<String, dynamic> _planJson(String id) {
  return {
    'id': id,
    'source': 'google',
    'sourceId': 'src-$id',
    'title': 'Plan $id',
    'category': 'food',
    'location': {'lat': 37.0, 'lng': -122.0},
  };
}
