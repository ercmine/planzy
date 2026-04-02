import 'telegram_mini_app_controller_stub.dart'
    if (dart.library.js_interop) 'telegram_mini_app_controller_web.dart' as impl;

abstract class TelegramMiniAppController {
  Future<void> expand();
  Future<void> showMainButton({required String text});
  Future<void> hideMainButton();
  Future<void> showBackButton();
  Future<void> hideBackButton();
}

TelegramMiniAppController createTelegramMiniAppController() => impl.createTelegramMiniAppController();
