import 'dart:async';
import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'telegram_mini_app.dart';
import 'telegram_mini_app_runtime.dart';

class _WebTelegramMiniAppRuntime implements TelegramMiniAppRuntime {
  _WebTelegramMiniAppRuntime();

  static const _stateKey = '__PERBUG_TELEGRAM';
  static const _eventName = 'perbug:telegram:update';

  final _controller = StreamController<TelegramMiniAppContext>.broadcast();
  web.EventListener? _listener;

  @override
  TelegramMiniAppContext readContext() {
    final state = js_util.getProperty<Object?>(web.window, _stateKey);
    if (state == null) {
      return const TelegramMiniAppContext.browser();
    }
    return _decodeContext(state);
  }

  @override
  Stream<TelegramMiniAppContext> contextChanges() {
    _ensureListening();
    return _controller.stream;
  }

  @override
  void dispose() {
    final listener = _listener;
    if (listener != null) {
      web.window.removeEventListener(_eventName, listener);
    }
    _listener = null;
    _controller.close();
  }

  void _ensureListening() {
    if (_listener != null) {
      return;
    }

    _listener = ((web.Event event) {
      final detail = js_util.getProperty<Object?>(event, 'detail');
      _controller.add(_decodeContext(detail));
    }).toJS;

    web.window.addEventListener(_eventName, _listener);
    _controller.add(readContext());
  }

  TelegramMiniAppContext _decodeContext(Object? payload) {
    if (payload == null) {
      return const TelegramMiniAppContext.browser();
    }
    final dart = js_util.dartify(payload);
    if (dart is! Map) {
      return const TelegramMiniAppContext.browser();
    }

    final map = dart.cast<Object?, Object?>();
    final themeParams = _stringMap(map['themeParams']);
    final initDataUnsafeRaw = map['initDataUnsafe'];

    return TelegramMiniAppContext(
      isTelegramMiniApp: map['isTelegramMiniApp'] == true,
      initData: _asString(map['initData']),
      initDataUnsafe: _objectMap(initDataUnsafeRaw),
      user: _parseUser(map['user']),
      themeParams: themeParams,
      colorScheme: _asString(map['colorScheme']),
      viewportHeight: _asDouble(map['viewportHeight']),
      viewportStableHeight: _asDouble(map['viewportStableHeight']),
      isExpanded: map['isExpanded'] == true,
      platform: _asString(map['platform']),
      version: _asString(map['version']),
      startParam: _asString(map['startParam']),
    );
  }

  TelegramMiniAppUser? _parseUser(Object? raw) {
    if (raw is! Map) return null;
    final map = raw.cast<Object?, Object?>();
    final id = _asInt(map['id']);
    final firstName = _asString(map['first_name']);
    if (id == null || firstName == null || firstName.isEmpty) {
      return null;
    }

    return TelegramMiniAppUser(
      id: id,
      firstName: firstName,
      lastName: _asString(map['last_name']),
      username: _asString(map['username']),
      languageCode: _asString(map['language_code']),
      isPremium: map['is_premium'] is bool ? map['is_premium'] as bool : null,
    );
  }

  Map<String, String> _stringMap(Object? raw) {
    if (raw is! Map) return const <String, String>{};
    final map = <String, String>{};
    for (final entry in raw.entries) {
      final key = _asString(entry.key);
      final value = _asString(entry.value);
      if (key != null && key.isNotEmpty && value != null && value.isNotEmpty) {
        map[key] = value;
      }
    }
    return map;
  }

  Map<String, Object?> _objectMap(Object? raw) {
    if (raw is! Map) return const <String, Object?>{};
    final map = <String, Object?>{};
    for (final entry in raw.entries) {
      final key = _asString(entry.key);
      if (key != null && key.isNotEmpty) {
        map[key] = entry.value;
      }
    }
    return map;
  }

  String? _asString(Object? value) {
    if (value == null) return null;
    final asString = value.toString();
    return asString.isEmpty ? null : asString;
  }

  double? _asDouble(Object? value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }
}

TelegramMiniAppRuntime createTelegramMiniAppRuntime() => _WebTelegramMiniAppRuntime();
