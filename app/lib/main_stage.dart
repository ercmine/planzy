// flutter run -t lib/main_stage.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/env/env.dart';
import 'core/logging/log.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final envConfig = await Env.load(EnvFlavor.stage);
  Log.configure(enableDebugLogs: envConfig.enableDebugLogs);

  runApp(
    ProviderScope(
      overrides: [
        envConfigProvider.overrideWithValue(envConfig),
      ],
      child: const OurPlanPlanApp(),
    ),
  );
}
