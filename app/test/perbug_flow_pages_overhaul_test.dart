import 'package:dryad/features/home/perbug_flow_pages.dart';
import 'package:dryad/providers/test_overrides.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('flow pages render new shell headers', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: buildTestOverrides(),
        child: const MaterialApp(home: PerbugInventoryPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Field Inventory'), findsOneWidget);
    expect(find.textContaining('Resources and collectibles'), findsOneWidget);
  });
}
