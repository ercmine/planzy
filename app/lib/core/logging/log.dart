import 'dart:developer' as developer;

class Log {
  const Log._();

  static bool _enableDebugLogs = false;

  static void configure({required bool enableDebugLogs}) {
    _enableDebugLogs = enableDebugLogs;
  }

  static void d(String message) {
    if (_enableDebugLogs) {
      developer.log(message, name: 'DEBUG');
    }
  }

  static void info(String message) {
    if (_enableDebugLogs) {
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
