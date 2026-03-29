import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

Future<void> runGuardedUiAction(
  BuildContext context, {
  required String actionLabel,
  required Future<void> Function() action,
}) async {
  try {
    await action();
  } catch (error, stackTrace) {
    debugPrint('[$actionLabel] failed: $error');
    debugPrint('$stackTrace');
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$actionLabel failed. Please retry.')),
      );
    }
  }
}
