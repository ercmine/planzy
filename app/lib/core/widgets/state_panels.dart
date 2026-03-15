import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/tokens.dart';
import '../../app/theme/widgets.dart';

class AppStatePanel extends StatelessWidget {
  const AppStatePanel({
    required this.title,
    required this.message,
    this.icon,
    this.actions = const <Widget>[],
    super.key,
  });

  final String title;
  final String message;
  final IconData? icon;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, size: AppIconSize.large, color: scheme.primary),
            const SizedBox(height: AppSpacing.s),
          ],
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(message, style: Theme.of(context).textTheme.bodyMedium),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.m),
            Wrap(spacing: AppSpacing.s, runSpacing: AppSpacing.s, children: actions),
          ],
        ],
      ),
    );
  }
}

class AppErrorPanel extends StatelessWidget {
  const AppErrorPanel({
    required this.message,
    this.onRetry,
    this.retryLabel = 'Retry',
    super.key,
  });

  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    return AppStatePanel(
      icon: Icons.error_outline,
      title: 'Something went wrong',
      message: message,
      actions: [
        if (onRetry != null) SecondaryButton(label: retryLabel, onPressed: onRetry),
      ],
    );
  }
}

class AppLoadingCardList extends StatelessWidget {
  const AppLoadingCardList({this.itemCount = 4, super.key});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.m),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
      itemBuilder: (_, __) => const Card(child: SizedBox(height: 220)),
    );
  }
}
