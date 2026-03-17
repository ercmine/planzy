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
    expect(find.text('Open place & review'), findsOneWidget);
  });
}
