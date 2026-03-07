import '../../core/permissions/permission_state.dart';

class SettingsState {
  const SettingsState({
    required this.isLoading,
    required this.locationPermission,
    required this.contactsPermission,
    required this.notificationsEnabled,
    required this.diagnosticsLoggingEnabled,
    required this.appVersion,
    this.errorMessage,
  });

  factory SettingsState.initial() {
    return const SettingsState(
      isLoading: true,
      locationPermission: PermissionState.unknown,
      contactsPermission: PermissionState.unknown,
      notificationsEnabled: false,
      diagnosticsLoggingEnabled: false,
      appVersion: 'Unknown',
    );
  }

  final bool isLoading;
  final PermissionState locationPermission;
  final PermissionState contactsPermission;
  final bool notificationsEnabled;
  final bool diagnosticsLoggingEnabled;
  final String appVersion;
  final String? errorMessage;

  SettingsState copyWith({
    bool? isLoading,
    PermissionState? locationPermission,
    PermissionState? contactsPermission,
    bool? notificationsEnabled,
    bool? diagnosticsLoggingEnabled,
    String? appVersion,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SettingsState(
      isLoading: isLoading ?? this.isLoading,
      locationPermission: locationPermission ?? this.locationPermission,
      contactsPermission: contactsPermission ?? this.contactsPermission,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      diagnosticsLoggingEnabled:
          diagnosticsLoggingEnabled ?? this.diagnosticsLoggingEnabled,
      appVersion: appVersion ?? this.appVersion,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
