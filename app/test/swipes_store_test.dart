import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:perbug/core/store/swipes_store.dart';

void main() {
  test('loadSwipes keeps valid entries when one entry is malformed', () async {
    SharedPreferences.setMockInitialValues({
      'swipes_v1_session-1': jsonEncode([
        {
          'sessionId': 'session-1',
          'planId': 'broken-plan',
          'action': 'yes',
          'atISO': '2024-01-01T00:00:00Z',
          'planSnapshot': {'id': 'broken-plan'},
        },
        {
          'sessionId': 'session-1',
          'planId': 'ok-plan',
          'action': 'no',
          'atISO': '2024-01-01T00:00:01Z',
        },
      ]),
    });

    final store = SwipesStore();
    final swipes = await store.loadSwipes('session-1');

    expect(swipes, hasLength(1));
    expect(swipes.single.planId, 'ok-plan');
  });
}
