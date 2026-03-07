import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/logging/log_settings.dart';
import '../../core/permissions/permission_service.dart';
import 'settings_state.dart';

class SettingsController extends StateNotifier<SettingsState> {
  SettingsController({
    required PermissionService permissionService,
    required SharedPreferences preferences,
    required LogSettingsController logSettingsController,
  })  : _permissionService = permissionService,
        _preferences = preferences,
        _logSettingsController = logSettingsController,
        super(SettingsState.initial()) {
    Future<void>.microtask(load);
  }

  static const String notificationsKey = 'settings_notify_on_matches';

  final PermissionService _permissionService;
  final SharedPreferences _preferences;
  final LogSettingsController _logSettingsController;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final locationPermission = await _permissionService.checkLocation();
      final contactsPermission = await _permissionService.checkContacts();
      final notificationsEnabled = _preferences.getBool(notificationsKey) ?? false;

      state = state.copyWith(
        isLoading: false,
        appVersion: '${packageInfo.version} (${packageInfo.buildNumber})',
        locationPermission: locationPermission,
        contactsPermission: contactsPermission,
        notificationsEnabled: notificationsEnabled,
        diagnosticsLoggingEnabled: _logSettingsController.state,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> refreshPermissions() async {
    final locationPermission = await _permissionService.checkLocation();
    final contactsPermission = await _permissionService.checkContacts();
    state = state.copyWith(
      locationPermission: locationPermission,
      contactsPermission: contactsPermission,
    );
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    await _preferences.setBool(notificationsKey, enabled);
    state = state.copyWith(notificationsEnabled: enabled);
  }

  Future<void> setDiagnosticsLoggingEnabled(bool enabled) async {
    await _logSettingsController.setDiagnosticsLoggingEnabled(enabled);
    state = state.copyWith(diagnosticsLoggingEnabled: enabled);
  }
}
