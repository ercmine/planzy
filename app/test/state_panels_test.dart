import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/core/widgets/state_panels.dart';

void main() {
  testWidgets('AppStatePanel renders title/message/actions', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AppStatePanel(
            title: 'No results',
            message: 'Try another search',
            actions: [Text('Retry')],
          ),
        ),
      ),
    );

    expect(find.text('No results'), findsOneWidget);
    expect(find.text('Try another search'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
