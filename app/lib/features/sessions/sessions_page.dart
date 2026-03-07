import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/widgets/retry_view.dart';
import '../../providers/app_providers.dart';

class SessionsPage extends ConsumerWidget {
  const SessionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sessions')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          children: [
            if (state.isLoading) const LinearProgressIndicator(),

            const SizedBox(height: AppSpacing.s),
            Expanded(
              child: state.errorMessage != null && state.sessions.isEmpty
                  ? RetryView(
                      title: 'Sessions unavailable',
                      message: state.errorMessage!,
                      onRetry: () => ref.read(sessionsControllerProvider.notifier).loadSessions(),
                    )
                  : state.sessions.isEmpty
                      ? const Center(
                          child: Text('No sessions yet. Create your first session.'),
                        )
                      : RefreshIndicator(
                      onRefresh: () => ref
                          .read(sessionsControllerProvider.notifier)
                          .loadSessions(),
                      child: ListView.separated(
                        itemCount: state.sessions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s),
                        itemBuilder: (context, index) {
                          final session = state.sessions[index];
                          return AppCard(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(session.title),
                              subtitle: Text(
                                'Updated ${DateFormat.yMMMd().add_jm().format(DateTime.parse(session.updatedAtISO).toLocal())}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => context.go('/sessions/${session.sessionId}'),
                            ),
                          );
                        },
                      ),
                    ),
            ),
            const SizedBox(height: AppSpacing.s),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => context.go('/sessions/create'),
                icon: const Icon(Icons.add),
                label: const Text('New Session'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
