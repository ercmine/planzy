import '../../api/api_client.dart';
import 'notification_models.dart';

class NotificationRepository {
  NotificationRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<AppNotification>> fetchNotifications() async {
    final response = await apiClient.getJson('/v1/notifications', queryParameters: {'limit': '50'});
    final items = response['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(AppNotification.fromJson).toList(growable: false);
  }

  Future<int> unreadCount() async {
    final response = await apiClient.getJson('/v1/notifications/unread-count');
    return (response['unreadCount'] as num?)?.toInt() ?? 0;
  }

  Future<void> markRead(String id) async {
    await apiClient.postJson('/v1/notifications/$id/read', body: const {});
  }

  Future<void> markAllRead() async {
    await apiClient.postJson('/v1/notifications/mark-all-read', body: const {});
  }

  Future<List<NotificationPreferenceItem>> fetchPreferences() async {
    final response = await apiClient.getJson('/v1/notifications/preferences');
    final prefs = response['preferences'];
    if (prefs is! List) return const [];
    return prefs.whereType<Map<String, dynamic>>().map(NotificationPreferenceItem.fromJson).toList(growable: false);
  }

  Future<void> updatePreference({required String category, bool? inAppEnabled, bool? pushEnabled}) async {
    await apiClient.putJson('/v1/notifications/preferences/$category', body: {
      if (inAppEnabled != null) 'inAppEnabled': inAppEnabled,
      if (pushEnabled != null) 'pushEnabled': pushEnabled,
    });
  }
}
