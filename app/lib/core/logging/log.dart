import 'dart:developer' as developer;

class Log {
  const Log._();

  static bool _envDebugLogsEnabled = false;
  static bool _diagnosticsLoggingEnabled = false;

  static void configure({required bool enableDebugLogs}) {
    _envDebugLogsEnabled = enableDebugLogs;
  }

  static void setDiagnosticsLoggingEnabled(bool enabled) {
    _diagnosticsLoggingEnabled = enabled;
  }

  static bool get _shouldLogDebug =>
      _envDebugLogsEnabled || _diagnosticsLoggingEnabled;

  static void d(String message) {
    if (_shouldLogDebug) {
      developer.log(message, name: 'DEBUG');
    }
  }

  static void info(String message) {
    if (_shouldLogDebug) {
      developer.log(message, name: 'INFO');
    }
  }

  static void warn(String message) {
    developer.log(message, name: 'WARN');
  }

  static void error(String message, {Object? error, StackTrace? stackTrace}) {
    developer.log(
      message,
      name: 'ERROR',
      error: error,
      stackTrace: stackTrace,
    );
  }
}
