import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/features/viewer_rewards/viewer_reward_models.dart';

void main() {
  test('video status maps denied and cap states correctly', () {
    final denied = ViewerRewardVideoStatus.fromJson({'videoId': 'v1', 'status': 'denied', 'progressPercent': 100, 'reason': 'duplicate reward window'});
    final capped = ViewerRewardVideoStatus.fromJson({'videoId': 'v2', 'status': 'cap_reached', 'progressPercent': 100});

    expect(denied.status, ViewerRewardStatusType.denied);
    expect(denied.reason, contains('duplicate'));
    expect(capped.statusLabel, 'Daily cap reached');
  });

  test('history parses pending comment rewards', () {
    final item = ViewerRewardHistoryItem.fromJson({
      'id': 'h1',
      'videoTitle': 'Downtown Pizza Tour',
      'action': 'comment',
      'dryad': 0,
      'status': 'pending',
      'occurredAt': '2026-03-26T10:00:00Z',
    });

    expect(item.status, ViewerRewardStatusType.pending);
    expect(item.action, 'comment');
  });
}
