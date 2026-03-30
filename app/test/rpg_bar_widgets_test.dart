import 'package:dryad/app/assets.dart';
import 'package:dryad/app/theme/rpg_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('rpg bar asset path is registered centrally', () {
    expect(AppAssets.rpgBarFrame, '../322AE031-DFBD-475E-97FB-C2FFD6CE5964.png');
  });

  testWidgets('RpgBarButton renders label and respects disabled state', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RpgBarButton(label: 'Deploy to Live Map', onPressed: null),
        ),
      ),
    );

    expect(find.text('Deploy to Live Map'), findsOneWidget);
    final semantics = tester.getSemantics(find.byType(RpgBarButton));
    expect(semantics.hasFlag(SemanticsFlag.isButton), isTrue);
  });

  testWidgets('RpgBarSurface can be used as a framed section title bar', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 320,
            child: RpgBarSurface(
              child: Text('War Table Objectives'),
            ),
          ),
        ),
      ),
    );

    expect(find.text('War Table Objectives'), findsOneWidget);
    expect(find.byType(Image), findsOneWidget);
  });
}
