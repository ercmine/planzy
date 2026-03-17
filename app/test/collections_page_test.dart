import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/collections/collection_models.dart';
import 'package:planzy/features/collections/collections_page.dart';

void main() {
  testWidgets('renders collection progress cards', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CollectionsPage(
            collections: [
              CollectionCardModel(
                id: 'downtown-museums',
                title: 'Downtown Museums',
                type: 'attraction',
                totalItems: 4,
                completedItems: 1,
                status: 'in_progress',
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Downtown Museums'), findsOneWidget);
    expect(find.textContaining('1/4 collected'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
  });
}
