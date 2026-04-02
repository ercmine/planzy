import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'telegram_mini_app.dart';
import 'telegram_mini_app_runtime_stub.dart'
    if (dart.library.js_interop) 'telegram_mini_app_runtime_web.dart' as runtime_impl;

abstract class TelegramMiniAppRuntime {
  TelegramMiniAppContext readContext();
  Stream<TelegramMiniAppContext> contextChanges();
  void dispose();
}

final telegramMiniAppRuntimeProvider = Provider<TelegramMiniAppRuntime>((ref) {
  final runtime = runtime_impl.createTelegramMiniAppRuntime();
  ref.onDispose(runtime.dispose);
  return runtime;
});

final telegramMiniAppContextProvider = StreamProvider<TelegramMiniAppContext>((ref) {
  final runtime = ref.watch(telegramMiniAppRuntimeProvider);
  return runtime.contextChanges();
});
