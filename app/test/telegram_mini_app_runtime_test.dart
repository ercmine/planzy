import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/telegram/telegram_mini_app_controller.dart';
import 'package:perbug/core/telegram/telegram_mini_app_runtime_stub.dart';

void main() {
  test('stub runtime reads browser context and emits it safely', () async {
    final runtime = createTelegramMiniAppRuntime();
    final context = runtime.readContext();

    expect(context.isTelegramMiniApp, isFalse);
    expect(context.initData, isNull);

    final first = await runtime.contextChanges().first;
    expect(first.isTelegramMiniApp, isFalse);

    runtime.dispose();
  });

  test('telegram mini app controller is safe no-op outside telegram', () async {
    final controller = createTelegramMiniAppController();

    await controller.expand();
    await controller.showMainButton(text: 'Open Perbugbot');
    await controller.hideMainButton();
    await controller.showBackButton();
    await controller.hideBackButton();

    expect(controller, isNotNull);
  });
}
