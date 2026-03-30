// iOS Info.plist note: add NSLocationWhenInUseUsageDescription and
// NSContactsUsageDescription for runtime permission prompts.
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart' as permission_handler;

import 'permission_state.dart';

class PermissionService {
  Future<PermissionState> checkLocation() async {
    return _withFallback(
      action: () async => _mapStatus(await permission_handler.Permission.locationWhenInUse.status),
      fallbackOnWeb: PermissionState.denied,
      fallbackOnError: PermissionState.denied,
      operation: 'checkLocation',
    );
  }

  Future<PermissionState> requestLocation() async {
    return _withFallback(
      action: () async => _mapStatus(await permission_handler.Permission.locationWhenInUse.request()),
      fallbackOnWeb: PermissionState.denied,
      fallbackOnError: PermissionState.denied,
      operation: 'requestLocation',
    );
  }

  Future<PermissionState> checkContacts() async {
    return _withFallback(
      action: () async => _mapStatus(await permission_handler.Permission.contacts.status),
      fallbackOnWeb: PermissionState.denied,
      fallbackOnError: PermissionState.denied,
      operation: 'checkContacts',
    );
  }

  Future<PermissionState> requestContacts() async {
    return _withFallback(
      action: () async => _mapStatus(await permission_handler.Permission.contacts.request()),
      fallbackOnWeb: PermissionState.denied,
      fallbackOnError: PermissionState.denied,
      operation: 'requestContacts',
    );
  }

  Future<PermissionState> _withFallback({
    required Future<PermissionState> Function() action,
    required PermissionState fallbackOnWeb,
    required PermissionState fallbackOnError,
    required String operation,
  }) async {
    if (kIsWeb) {
      return fallbackOnWeb;
    }

    try {
      return await action();
    } on UnimplementedError catch (error) {
      _debugLog('$operation fallback due to unimplemented API: $error');
      return fallbackOnError;
    } on MissingPluginException catch (error) {
      _debugLog('$operation fallback due to missing plugin: $error');
      return fallbackOnError;
    } on PlatformException catch (error) {
      _debugLog('$operation fallback due to platform exception: $error');
      return fallbackOnError;
    }
  }

  PermissionState _mapStatus(permission_handler.PermissionStatus status) {
    switch (status) {
      case permission_handler.PermissionStatus.granted:
        return PermissionState.granted;
      case permission_handler.PermissionStatus.denied:
        return PermissionState.denied;
      case permission_handler.PermissionStatus.permanentlyDenied:
        return PermissionState.permanentlyDenied;
      case permission_handler.PermissionStatus.restricted:
        return PermissionState.restricted;
      case permission_handler.PermissionStatus.limited:
        return PermissionState.limited;
      case permission_handler.PermissionStatus.provisional:
        return PermissionState.limited;
    }
  }

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[PermissionService] $message');
    }
  }
}
