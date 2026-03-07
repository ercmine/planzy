// iOS Info.plist note: add NSLocationWhenInUseUsageDescription and
// NSContactsUsageDescription for runtime permission prompts.
import 'package:permission_handler/permission_handler.dart' as permission_handler;

import 'permission_state.dart';

class PermissionService {
  Future<PermissionState> checkLocation() async {
    final status = await permission_handler.Permission.locationWhenInUse.status;
    return _mapStatus(status);
  }

  Future<PermissionState> requestLocation() async {
    final status = await permission_handler.Permission.locationWhenInUse.request();
    return _mapStatus(status);
  }

  Future<PermissionState> checkContacts() async {
    final status = await permission_handler.Permission.contacts.status;
    return _mapStatus(status);
  }

  Future<PermissionState> requestContacts() async {
    final status = await permission_handler.Permission.contacts.request();
    return _mapStatus(status);
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
}
