import 'dart:async';

import 'telegram_mini_app.dart';
import 'telegram_mini_app_runtime.dart';

class _StubTelegramMiniAppRuntime implements TelegramMiniAppRuntime {
  const _StubTelegramMiniAppRuntime();

  @override
  TelegramMiniAppContext readContext() => const TelegramMiniAppContext.browser();

  @override
  Stream<TelegramMiniAppContext> contextChanges() async* {
    yield readContext();
  }

  @override
  void dispose() {}
}

TelegramMiniAppRuntime createTelegramMiniAppRuntime() => const _StubTelegramMiniAppRuntime();
