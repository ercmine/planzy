import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perbug/features/sessions/create_session/create_session_page.dart';

void main() {
  testWidgets('Create session title field stays single line', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateSessionPage(),
        ),
      ),
    );

    final titleField = tester.widget<TextField>(find.byType(TextField).first);

    expect(titleField.maxLines, 1);
    expect(titleField.textInputAction, TextInputAction.done);
  });
}
