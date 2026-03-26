import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/home/map_discovery_models.dart';
import 'package:perbug/features/home/place_preview_card.dart';

void main() {
  testWidgets('renders premium map preview content and near-state chips', (tester) async {
    const place = MapPin(
      canonicalPlaceId: 'cp-1',
      name: 'Bluebird Coffee',
      category: 'coffee-shop',
      latitude: 30.2,
      longitude: -97.7,
      rating: 4.6,
      city: 'Austin',
      neighborhood: 'Downtown',
      thumbnailUrl: 'https://example.com/p.jpg',
      hasCreatorMedia: true,
      hasReviews: true,
      descriptionSnippet: 'Great espresso and creator clips.',
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: PlacePreviewCard(
            place: place,
            proximityState: PlaceProximityState.here,
            distanceMeters: 22,
          ),
        ),
      ),
    );

    expect(find.text('Bluebird Coffee'), findsOneWidget);
    expect(find.text('You’re here'), findsOneWidget);
    expect(find.text('Creator videos'), findsOneWidget);
    expect(find.text('Leave review'), findsOneWidget);
    expect(find.text('Add video'), findsOneWidget);
    expect(find.text('Details'), findsOneWidget);
  });

  testWidgets('keeps overlay chips inside a horizontal scroller when multiple pills are present', (tester) async {
    const place = MapPin(
      canonicalPlaceId: 'cp-2',
      name: 'North End Noodles',
      category: 'noodle-shop',
      latitude: 42.3,
      longitude: -71.0,
      rating: 4.8,
      city: 'Boston',
      neighborhood: 'North End',
      thumbnailUrl: 'https://example.com/noodles.jpg',
      hasCreatorMedia: true,
      hasReviews: true,
      descriptionSnippet: 'Hand-pulled noodles near the harbor.',
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 220,
            child: PlacePreviewCard(
              place: place,
              proximityState: PlaceProximityState.nearby,
              distanceMeters: 80,
              saved: true,
            ),
          ),
        ),
      ),
    );

    expect(find.text('Nearby now'), findsOneWidget);
    expect(find.text('Saved'), findsOneWidget);
    expect(find.text('Creator videos'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(SingleChildScrollView),
        matching: find.text('Nearby now'),
      ),
      findsOneWidget,
    );
  });
}
