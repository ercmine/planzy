import 'telegram_mini_app_controller.dart';

class _StubTelegramMiniAppController implements TelegramMiniAppController {
  const _StubTelegramMiniAppController();

  @override
  Future<void> expand() async {}

  @override
  Future<void> hideBackButton() async {}

  @override
  Future<void> hideMainButton() async {}

  @override
  Future<void> showBackButton() async {}

  @override
  Future<void> showMainButton({required String text}) async {}
}

TelegramMiniAppController createTelegramMiniAppController() => const _StubTelegramMiniAppController();
