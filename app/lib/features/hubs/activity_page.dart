import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/app_back_button.dart';

class ActivityPage extends StatelessWidget {
  const ActivityPage({super.key});

  @override
  Widget build(BuildContext context) {
    const items = <Map<String, dynamic>>[
      {
        'title': 'New follower',
        'desc': 'Alex followed your creator profile',
        'icon': Icons.person_add_alt_1
      },
      {
        'title': 'Business reply',
        'desc': 'Bluebird Cafe replied to your review',
        'icon': Icons.storefront_outlined
      },
      {
        'title': 'Moderation update',
        'desc': 'Your video review is approved',
        'icon': Icons.verified_outlined
      },
      {
        'title': 'Collab invite',
        'desc': 'A business invited you to a collaboration',
        'icon': Icons.handshake_outlined
      },
    ];

    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Activity & notifications')),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.m),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
        itemBuilder: (context, index) {
          final item = items[index];
          return AppCard(
            child: ListTile(
              leading: Icon(item['icon'] as IconData),
              title: Text(item['title'] as String),
              subtitle: Text(item['desc'] as String),
              trailing: const AppPill(label: 'New'),
            ),
          );
        },
      ),
    );
  }
}
