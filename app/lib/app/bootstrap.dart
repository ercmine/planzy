import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import '../core/env/env.dart';
import '../core/logging/log.dart';
import 'app.dart';

Future<void> runPerbugApp(EnvFlavor flavor) async {
  WidgetsFlutterBinding.ensureInitialized();

  if (kIsWeb) {
    usePathUrlStrategy();
  }

  FlutterError.onError = (details) {
    Log.error('flutter.framework error', error: details.exception, stackTrace: details.stack);
    FlutterError.presentError(details);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    Log.error('flutter.platform error', error: error, stackTrace: stack);
    return false;
  };

  final envConfig = await Env.load(flavor);
  Log.configure(enableDebugLogs: envConfig.enableDebugLogs);
  Log.info('App startup baseUrl=${envConfig.apiBaseUrl} flavor=${flavor.name} web=$kIsWeb');

  runApp(
    ProviderScope(
      overrides: [
        envConfigProvider.overrideWithValue(envConfig),
      ],
      child: const PerbugApp(),
    ),
  );
}
