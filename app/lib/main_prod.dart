// flutter run -t lib/main_prod.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/env/env.dart';
import 'core/logging/log.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final envConfig = await Env.load(EnvFlavor.prod);
  Log.configure(enableDebugLogs: envConfig.enableDebugLogs);
  Log.info('App startup baseUrl=${envConfig.apiBaseUrl}');

  runApp(
    ProviderScope(
      overrides: [
        envConfigProvider.overrideWithValue(envConfig),
      ],
      child: const PerbugApp(),
    ),
  );
}
