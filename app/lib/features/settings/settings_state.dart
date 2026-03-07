import '../../core/permissions/permission_state.dart';

class SettingsState {
  const SettingsState({
    required this.isLoading,
    required this.locationPermission,
    required this.contactsPermission,
    required this.notificationsEnabled,
    required this.appVersion,
    this.errorMessage,
  });

  factory SettingsState.initial() {
    return const SettingsState(
      isLoading: true,
      locationPermission: PermissionState.unknown,
      contactsPermission: PermissionState.unknown,
      notificationsEnabled: false,
      appVersion: 'Unknown',
    );
  }

  final bool isLoading;
  final PermissionState locationPermission;
  final PermissionState contactsPermission;
  final bool notificationsEnabled;
  final String appVersion;
  final String? errorMessage;

  SettingsState copyWith({
    bool? isLoading,
    PermissionState? locationPermission,
    PermissionState? contactsPermission,
    bool? notificationsEnabled,
    String? appVersion,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SettingsState(
      isLoading: isLoading ?? this.isLoading,
      locationPermission: locationPermission ?? this.locationPermission,
      contactsPermission: contactsPermission ?? this.contactsPermission,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      appVersion: appVersion ?? this.appVersion,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
