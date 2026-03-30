import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_routes.dart';

class PerbugRecoveryPage extends StatelessWidget {
  const PerbugRecoveryPage({
    super.key,
    this.title = 'Perbug recovery mode',
    this.message =
        'We hit a startup issue. Core navigation is still available while the app recovers.',
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF140C1E), Color(0xFF29163A), Color(0xFF4E3166)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 580),
              child: Card(
                color: const Color(0xCC21142E),
                margin: const EdgeInsets.all(20),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: const Color(0xFFFFE7B5),
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        message,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton.icon(
                            onPressed: () => context.go(AppRoutes.entry),
                            icon: const Icon(Icons.home_outlined),
                            label: const Text('Back to entry'),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => context.go(AppRoutes.liveMap),
                            icon: const Icon(Icons.map_outlined),
                            label: const Text('Open map'),
                          ),
                          TextButton.icon(
                            onPressed: () => context.go(AppRoutes.debugMap),
                            icon: const Icon(Icons.bug_report_outlined),
                            label: const Text('Open debug map'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
