import 'package:flutter_test/flutter_test.dart';
import 'package:ourplanplan/models/deck_batch.dart';
import 'package:ourplanplan/models/deep_links.dart';
import 'package:ourplanplan/models/plan.dart';
import 'package:ourplanplan/models/telemetry.dart';

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
