import 'package:dryad/app/assets.dart';
import 'package:dryad/app/theme/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ambient backdrop asset path is centralized', () {
    expect(
      AppAssets.perbugAmbientBackdrop,
      '../8E1E0147-C0E1-4240-8903-57AEFA42137B.png',
    );
  });

  testWidgets('AppScaffold uses ambient Perbug background by default', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AppScaffold(
          body: const SizedBox.shrink(),
        ),
      ),
    );

    expect(find.byType(PerbugPageBackground), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is AssetImage &&
            (widget.image as AssetImage).assetName == AppAssets.perbugAmbientBackdrop,
      ),
      findsOneWidget,
    );
  });
}
