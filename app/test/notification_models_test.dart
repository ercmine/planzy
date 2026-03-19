import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/notifications/notification_models.dart';

void main() {
  test('parses notification with route payload', () {
    final model = AppNotification.fromJson({
      'id': 'n1',
      'type': 'video_published',
      'title': 'Video live',
      'body': 'Your review is published.',
      'createdAt': '2026-03-09T10:00:00.000Z',
      'readAt': null,
      'route': {
        'name': 'profile-video',
        'params': {'videoId': 'v1'},
      }
    });

    expect(model.id, 'n1');
    expect(model.isRead, false);
    expect(model.routeName, 'profile-video');
    expect(model.routeParams['videoId'], 'v1');
  });
}
