import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'telegram_mini_app_controller.dart';

class _WebTelegramMiniAppController implements TelegramMiniAppController {
  static const _apiKey = '__PERBUG_TELEGRAM_API';

  Object? get _api {
    final candidate = js_util.getProperty<Object?>(web.window, _apiKey);
    return candidate;
  }

  Future<void> _call(String method, [Object? arg]) async {
    final api = _api;
    if (api == null || !js_util.hasProperty(api, method)) {
      return;
    }

    if (arg == null) {
      js_util.callMethod(api, method, const []);
      return;
    }
    js_util.callMethod(api, method, [arg]);
  }

  @override
  Future<void> expand() => _call('expand');

  @override
  Future<void> hideBackButton() => _call('hideBackButton');

  @override
  Future<void> hideMainButton() => _call('hideMainButton');

  @override
  Future<void> showBackButton() => _call('showBackButton');

  @override
  Future<void> showMainButton({required String text}) => _call('showMainButton', text);
}

TelegramMiniAppController createTelegramMiniAppController() => _WebTelegramMiniAppController();
