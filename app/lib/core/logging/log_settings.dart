import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'log.dart';

class LogSettings {
  const LogSettings._();

  static const String diagnosticsLoggingKey = 'diag_logs_enabled';
}

class LogSettingsController extends StateNotifier<bool> {
  LogSettingsController({required SharedPreferences preferences})
      : _preferences = preferences,
        super(preferences.getBool(LogSettings.diagnosticsLoggingKey) ?? false) {
    Log.setDiagnosticsLoggingEnabled(state);
  }

  final SharedPreferences _preferences;

  Future<void> setDiagnosticsLoggingEnabled(bool enabled) async {
    await _preferences.setBool(LogSettings.diagnosticsLoggingKey, enabled);
    state = enabled;
    Log.setDiagnosticsLoggingEnabled(enabled);
  }
}
