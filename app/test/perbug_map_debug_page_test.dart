import 'package:perbug/features/home/perbug_map_debug_page.dart';
import 'package:perbug/features/home/perbug_world_map_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('debug page mounts world map view with forced demo world', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PerbugMapDebugPage()));
    await tester.pumpAndSettle();

    expect(find.byType(PerbugWorldMapView), findsOneWidget);
    expect(find.text('Demo frontier fallback'), findsOneWidget);
    expect(find.textContaining('mode: demo'), findsOneWidget);
  });
}
