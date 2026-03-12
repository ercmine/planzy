class AppNotification {
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.isRead,
    this.routeName,
    this.routeParams = const {},
    this.routeQuery = const {},
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final String? routeName;
  final Map<String, String> routeParams;
  final Map<String, String> routeQuery;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final route = json['route'];
    final routeMap = route is Map<String, dynamic> ? route : const <String, dynamic>{};
    return AppNotification(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      isRead: (json['readAt'] ?? '').toString().isNotEmpty,
      routeName: routeMap['name']?.toString(),
      routeParams: _toStringMap(routeMap['params']),
      routeQuery: _toStringMap(routeMap['query']),
    );
  }

  static Map<String, String> _toStringMap(Object? value) {
    if (value is! Map<String, dynamic>) {
      return const {};
    }
    return value.map((key, dynamic val) => MapEntry(key, val.toString()));
  }
}

class NotificationPreferenceItem {
  NotificationPreferenceItem({
    required this.category,
    required this.inAppEnabled,
    required this.pushEnabled,
  });

  final String category;
  final bool inAppEnabled;
  final bool pushEnabled;

  factory NotificationPreferenceItem.fromJson(Map<String, dynamic> json) {
    return NotificationPreferenceItem(
      category: (json['category'] ?? '').toString(),
      inAppEnabled: json['inAppEnabled'] == true,
      pushEnabled: json['pushEnabled'] == true,
    );
  }
}
