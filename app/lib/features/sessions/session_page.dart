import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../providers/app_providers.dart';

class SessionPage extends ConsumerWidget {
  const SessionPage({required this.sessionId, super.key});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(sessionByIdProvider(sessionId));
    final swipeCountAsync = ref.watch(swipeCountProvider(sessionId));

    return Scaffold(
      appBar: AppBar(title: const Text('Session')),
      body: sessionAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(error.toString())),
        data: (session) {
          if (session == null) {
            return const Center(child: Text('Session not found'));
          }
          final inviteLink = 'https://ourplanplan.com/invite/${session.sessionId}';
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.m),
            children: [
              Text(session.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: AppSpacing.s),
              Text('Session ID: ${session.sessionId}'),
              const SizedBox(height: AppSpacing.m),
              Card(
                child: ListTile(
                  title: const Text('Filters'),
                  subtitle: Text(
                    'Radius ${session.filters.radiusMeters ~/ 1000}km • '
                    'Categories ${session.filters.categories.map((e) => e.name).join(', ').ifEmpty('Any')} • '
                    'Open now ${session.filters.openNow ? 'Yes' : 'No'} • '
                    'Price ${_priceLabel(session.filters.priceLevelMax)}',
                  ),
                ),
              ),
              Card(
                child: ListTile(
                  title: const Text('Members'),
                  subtitle: Text('${session.members.length} selected'),
                ),
              ),
              const SizedBox(height: AppSpacing.m),
              FilledButton(
                onPressed: () {
                  context.push('/sessions/${session.sessionId}/deck');
                },
                child: const Text('Open Money Deck'),
              ),
              const SizedBox(height: AppSpacing.s),
              OutlinedButton.icon(
                onPressed: (swipeCountAsync.valueOrNull ?? 0) == 0
                    ? null
                    : () => context.push('/sessions/${session.sessionId}/results'),
                icon: const Icon(Icons.insights_outlined),
                label: Text(
                  'Results${swipeCountAsync.valueOrNull == null ? '' : ' (${swipeCountAsync.valueOrNull})'}',
                ),
              ),
              const SizedBox(height: AppSpacing.s),
              OutlinedButton.icon(
                onPressed: () {
                  context.push('/sessions/${session.sessionId}/ideas');
                },
                icon: const Icon(Icons.lightbulb_outline),
                label: const Text('Ideas'),
              ),
              const SizedBox(height: AppSpacing.s),
              OutlinedButton.icon(
                onPressed: () {
                  ref.read(shareServiceProvider).shareText(
                        'Join my OurPlanPlan session: $inviteLink',
                        subject: 'Join my OurPlanPlan session',
                      );
                },
                icon: const Icon(Icons.share),
                label: const Text('Invite'),
              ),
              const SizedBox(height: AppSpacing.s),
              OutlinedButton(
                onPressed: () => context.go('/sessions/${session.sessionId}/settings'),
                child: const Text('Settings'),
              ),
            ],
          );
        },
      ),
    );
  }

  String _priceLabel(int? value) {
    if (value == null) {
      return 'Any';
    }
    return r'$' * value;
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
