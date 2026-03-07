import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/theme/spacing.dart';
import '../../core/diagnostics/diagnostics.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/permissions/permission_state.dart';
import '../../core/widgets/app_snackbar.dart';
import '../../providers/app_providers.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(settingsControllerProvider);
    final controller = ref.read(settingsControllerProvider.notifier);
    final locationState = ref.watch(locationControllerProvider);
    final locationController = ref.read(locationControllerProvider.notifier);
    final userIdAsync = ref.watch(userIdProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          _Section(
            title: 'Account',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('User ID: ${_mask(userIdAsync.valueOrNull)}'),
                    ),
                    IconButton(
                      onPressed: userIdAsync.valueOrNull == null
                          ? null
                          : () async {
                              await Clipboard.setData(
                                ClipboardData(text: userIdAsync.valueOrNull!),
                              );
                              if (!context.mounted) {
                                return;
                              }
                              AppSnackbar.show(context, 'User ID copied.');
                            },
                      icon: const Icon(Icons.copy),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text('App version: ${state.appVersion}'),
              ],
            ),
          ),
          _Section(
            title: 'Permissions',
            child: Column(
              children: [
                _PermissionRow(
                  label: 'Location',
                  state: state.locationPermission,
                  onOpenSettings: state.locationPermission == PermissionState.permanentlyDenied
                      ? openAppSettings
                      : null,
                ),
                const SizedBox(height: AppSpacing.s),
                _PermissionRow(
                  label: 'Contacts',
                  state: state.contactsPermission,
                  onOpenSettings: state.contactsPermission == PermissionState.permanentlyDenied
                      ? openAppSettings
                      : null,
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: controller.refreshPermissions,
                    child: const Text('Refresh permissions'),
                  ),
                ),
              ],
            ),
          ),
          _Section(
            title: 'Location',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current: ${_locationLabel(locationState.manualOverride, locationState.location)}'),
                if (locationState.effectiveLocation case final AppLocation effective) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text('Lat/Lng: ${effective.lat.toStringAsFixed(4)}, ${effective.lng.toStringAsFixed(4)}'),
                ],
                const SizedBox(height: AppSpacing.s),
                Wrap(
                  spacing: AppSpacing.s,
                  runSpacing: AppSpacing.s,
                  children: [
                    OutlinedButton(
                      onPressed: () => _showManualLocationDialog(context, locationController),
                      child: const Text('Set manual location'),
                    ),
                    OutlinedButton(
                      onPressed: locationState.manualOverride == null
                          ? null
                          : () {
                              locationController.clearOverride();
                              AppSnackbar.show(context, 'Manual location cleared.');
                            },
                      child: const Text('Clear override'),
                    ),
                    OutlinedButton(
                      onPressed: () async {
                        await locationController.loadCurrentLocation();
                        if (!context.mounted) {
                          return;
                        }
                        AppSnackbar.show(context, 'Live location refreshed.');
                      },
                      child: const Text('Refresh live location'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          _Section(
            title: 'Notifications',
            child: SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Notify me when matches are found'),
              value: state.notificationsEnabled,
              onChanged: controller.setNotificationsEnabled,
            ),
          ),
          const _Section(
            title: 'Privacy',
            child: Text(
              'OurPlanPlan runs invite-only sessions, shares only what is needed to match plans, and does not sell your personal data.',
            ),
          ),
          _Section(
            title: 'Support',
            child: Wrap(
              spacing: AppSpacing.s,
              runSpacing: AppSpacing.s,
              children: [
                FilledButton.tonal(
                  onPressed: () => _emailSupport(context, state.appVersion),
                  child: const Text('Email support'),
                ),
                FilledButton.tonal(
                  onPressed: () => _copyDiagnostics(context, ref),
                  child: const Text('Copy diagnostics'),
                ),
              ],
            ),
          ),
          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.s),
              child: Text(state.errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
        ],
      ),
    );
  }

  Future<void> _emailSupport(BuildContext context, String appVersion) async {
    final subject = Uri.encodeComponent('OurPlanPlan support ($appVersion)');
    final uri = Uri.parse('mailto:support@ourplanplan.com?subject=$subject');
    final launched = await launchUrl(uri);
    if (!launched && context.mounted) {
      AppSnackbar.show(context, 'Could not open email client.', isError: true);
    }
  }

  Future<void> _copyDiagnostics(BuildContext context, WidgetRef ref) async {
    final connectivityState = ref.read(connectivityControllerProvider);
    final sessionsRepository = ref.read(sessionsRepositoryProvider);
    final sessions = await sessionsRepository.listActive();
    final telemetryRepository = ref.read(telemetryRepositoryProvider).valueOrNull;

    int? queueSize;
    if (telemetryRepository != null) {
      final ids = await telemetryRepository.queueStore.sessionIdsWithQueuedEvents();
      var total = 0;
      for (final id in ids) {
        total += await telemetryRepository.queueStore.size(id);
      }
      queueSize = total;
    }

    final userId = await ref.read(userIdProvider.future);
    final diagnostics = await AppDiagnostics.build(
      connectivityState: connectivityState,
      sessionCount: sessions.length,
      telemetryQueueSize: queueSize,
      userId: userId,
    );

    await Clipboard.setData(ClipboardData(text: diagnostics));
    if (!context.mounted) {
      return;
    }
    AppSnackbar.show(context, 'Diagnostics copied.');
  }

  Future<void> _showManualLocationDialog(
    BuildContext context,
    LocationController locationController,
  ) async {
    final latController = TextEditingController();
    final lngController = TextEditingController();

    final result = await showDialog<(double, double)>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Set manual location'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: latController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(labelText: 'Latitude'),
              ),
              TextField(
                controller: lngController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(labelText: 'Longitude'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final lat = double.tryParse(latController.text.trim());
                final lng = double.tryParse(lngController.text.trim());
                if (lat == null || lng == null) {
                  return;
                }
                Navigator.of(context).pop((lat, lng));
              },
              child: const Text('Set'),
            ),
          ],
        );
      },
    );

    if (result == null || !context.mounted) {
      return;
    }

    locationController.setManualOverride(result.$1, result.$2);
    AppSnackbar.show(context, 'Manual location updated.');
  }

  static String _mask(String? value) {
    if (value == null || value.isEmpty) {
      return 'unknown';
    }
    return value.length <= 8 ? value : '${value.substring(0, 8)}…';
  }

  static String _locationLabel(AppLocation? override, AppLocation? live) {
    if (override != null) {
      return 'Manual override';
    }
    if (live != null) {
      return 'Live location';
    }
    return 'Unavailable';
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.m),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.s),
            child,
          ],
        ),
      ),
    );
  }
}

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({
    required this.label,
    required this.state,
    this.onOpenSettings,
  });

  final String label;
  final PermissionState state;
  final Future<bool> Function()? onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text('$label: ${_permissionLabel(state)}')),
        if (onOpenSettings != null)
          TextButton(
            onPressed: () => onOpenSettings!.call(),
            child: const Text('Open Settings'),
          ),
      ],
    );
  }

  static String _permissionLabel(PermissionState state) {
    switch (state) {
      case PermissionState.granted:
        return 'Granted';
      case PermissionState.denied:
        return 'Denied';
      case PermissionState.permanentlyDenied:
        return 'Permanently denied';
      case PermissionState.restricted:
        return 'Restricted';
      case PermissionState.limited:
        return 'Limited';
      case PermissionState.unknown:
        return 'Unknown';
    }
  }
}
