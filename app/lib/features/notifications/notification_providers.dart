import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'notification_models.dart';
import 'notification_repository.dart';

final notificationRepositoryProvider = FutureProvider<NotificationRepository>((ref) async {
  final client = await ref.watch(apiClientProvider.future);
  return NotificationRepository(apiClient: client);
});

final notificationsProvider = FutureProvider<List<AppNotification>>((ref) async {
  final repo = await ref.watch(notificationRepositoryProvider.future);
  return repo.fetchNotifications();
});

final unreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final repo = await ref.watch(notificationRepositoryProvider.future);
  return repo.unreadCount();
});

final notificationPreferencesProvider = FutureProvider<List<NotificationPreferenceItem>>((ref) async {
  final repo = await ref.watch(notificationRepositoryProvider.future);
  return repo.fetchPreferences();
});
