import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(connectivityControllerProvider);

    return IgnorePointer(
      ignoring: true,
      child: SafeArea(
        bottom: false,
        child: AnimatedSlide(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          offset: state.isOnline ? const Offset(0, -1.2) : Offset.zero,
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: state.isOnline ? 0 : 1,
            child: Container(
              width: double.infinity,
              color: Theme.of(context).colorScheme.errorContainer,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
              child: Text(
                'You\'re offline. Some features may not work.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
