import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'notification_models.dart';
import 'notification_providers.dart';

class NotificationCenterTab extends ConsumerWidget {
  const NotificationCenterTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadNotificationCountProvider).valueOrNull ?? 0;

    return Scaffold(
      body: notifications.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No notifications yet. Follow creators and save places to get updates.'));
          }
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Notifications ($unread unread)', style: Theme.of(context).textTheme.titleLarge),
                  Row(children:[TextButton(
                    onPressed: () async {
                      final repo = await ref.read(notificationRepositoryProvider.future);
                      await repo.markAllRead();
                      ref.invalidate(notificationsProvider);
                      ref.invalidate(unreadNotificationCountProvider);
                    },
                    child: const Text('Mark all read'),
                  ), IconButton(onPressed: () => showModalBottomSheet<void>(context: context, builder: (_) => const _PreferenceSheet()), icon: const Icon(Icons.tune))]),
                ],
              ),
              const SizedBox(height: 8),
              ...items.map((item) => _NotificationTile(item: item)),
            ],
          );
        },
        error: (error, _) => Center(child: Text('Unable to load notifications: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.item});

  final AppNotification item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        onTap: () async {
          final repo = await ref.read(notificationRepositoryProvider.future);
          if (!item.isRead) {
            await repo.markRead(item.id);
            ref.invalidate(notificationsProvider);
            ref.invalidate(unreadNotificationCountProvider);
          }
          if (!context.mounted) return;
          final routeText = item.routeName == null ? 'Open app section' : 'Route: ${item.routeName}';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(routeText)));
        },
        title: Text(item.title),
        subtitle: Text(item.body),
        trailing: item.isRead ? null : const Icon(Icons.fiber_manual_record, size: 10),
      ),
    );
  }
}


class _PreferenceSheet extends ConsumerWidget {
  const _PreferenceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(notificationPreferencesProvider);
    return prefs.when(
      data: (items) => ListView(
        children: items
            .map((item) => SwitchListTile(
                  title: Text(item.category.replaceAll("_", " ")),
                  subtitle: const Text("In-app + push settings"),
                  value: item.pushEnabled,
                  onChanged: (value) async {
                    final repo = await ref.read(notificationRepositoryProvider.future);
                    await repo.updatePreference(category: item.category, pushEnabled: value);
                    ref.invalidate(notificationPreferencesProvider);
                  },
                ))
            .toList(growable: false),
      ),
      error: (error, _) => Padding(padding: const EdgeInsets.all(16), child: Text("Failed to load preferences: $error")),
      loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
    );
  }
}
