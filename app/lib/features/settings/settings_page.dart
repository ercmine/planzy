import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/brand/logo.dart';
import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/diagnostics/diagnostics.dart';
import '../../core/identity/identity_provider.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/permissions/permission_state.dart';
import '../../core/widgets/app_snackbar.dart';
import '../../models/session.dart';
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

    return AppScaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => _handleBackPressed(context, ref),
        ),
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          _Section(
            title: 'Account',
            icon: Icons.person_outline,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('User ID: ${_mask(userIdAsync.valueOrNull)}')),
                    AppIconButton(
                      onPressed: userIdAsync.valueOrNull == null
                          ? null
                          : () async {
                              await Clipboard.setData(ClipboardData(text: userIdAsync.valueOrNull!));
                              if (context.mounted) {
                                AppSnackbar.show(context, 'User ID copied.');
                              }
                            },
                      icon: Icons.copy,
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
            icon: Icons.shield_outlined,
            child: Column(
              children: [
                _PermissionRow(
                  label: 'Location',
                  state: state.locationPermission,
                  onOpenSettings: state.locationPermission == PermissionState.permanentlyDenied ? openAppSettings : null,
                ),
                const SizedBox(height: AppSpacing.s),
                _PermissionRow(
                  label: 'Contacts',
                  state: state.contactsPermission,
                  onOpenSettings: state.contactsPermission == PermissionState.permanentlyDenied ? openAppSettings : null,
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(onPressed: controller.refreshPermissions, child: const Text('Refresh permissions')),
                ),
              ],
            ),
          ),
          _Section(
            title: 'Location',
            icon: Icons.my_location,
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
                    SecondaryButton(
                      onPressed: () => _showManualLocationDialog(context, locationController),
                      label: 'Set manual location',
                    ),
                    SecondaryButton(
                      onPressed: locationState.manualOverride == null
                          ? null
                          : () {
                              locationController.clearOverride();
                              AppSnackbar.show(context, 'Manual location cleared.');
                            },
                      label: 'Clear override',
                    ),
                    SecondaryButton(
                      onPressed: () async {
                        await locationController.loadCurrentLocation();
                        if (context.mounted) {
                          AppSnackbar.show(context, 'Live location refreshed.');
                        }
                      },
                      label: 'Refresh live location',
                    ),
                  ],
                ),
              ],
            ),
          ),
          _Section(
            title: 'Notifications',
            icon: Icons.notifications_none,
            child: SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Notify me when matches are found'),
              value: state.notificationsEnabled,
              onChanged: controller.setNotificationsEnabled,
            ),
          ),
          _Section(
            title: 'Diagnostics',
            icon: Icons.monitor_heart_outlined,
            child: SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Diagnostics logging'),
              subtitle: const Text('Enable extra local logs to help troubleshoot app issues.'),
              value: state.diagnosticsLoggingEnabled,
              onChanged: controller.setDiagnosticsLoggingEnabled,
            ),
          ),
          _Section(
            title: 'Support',
            icon: Icons.support_agent,
            child: Wrap(
              spacing: AppSpacing.s,
              runSpacing: AppSpacing.s,
              children: [
                FilledButton.tonal(onPressed: () => _emailSupport(context, state.appVersion), child: const Text('Email support')),
                FilledButton.tonal(onPressed: () => _copyDiagnostics(context, ref), child: const Text('Copy diagnostics')),
              ],
            ),
          ),
          _Section(
            title: 'Privacy',
            icon: Icons.privacy_tip_outlined,
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ads may be shown. We do not sell personal info.'),
                SizedBox(height: AppSpacing.xs),
                Text('TODO: add consent manager for region-specific requirements.'),
              ],
            ),
          ),
          _Section(
            title: 'About',
            icon: Icons.info_outline,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const PerbugLogo(size: 40, variant: PerbugLogoVariant.withWordmark),
                const SizedBox(height: AppSpacing.s),
                const Text('Perbug helps your group find plans together.'),
                const SizedBox(height: AppSpacing.xs),
                Text('Version: ${state.appVersion}'),
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

  Future<void> _handleBackPressed(BuildContext context, WidgetRef ref) async {
    if (context.canPop()) {
      if (kDebugMode) {
        debugPrint('Settings back press: pop()');
      }
      context.pop();
      return;
    }

    final activeSessionId = await _resolveActiveSessionId(ref);

    if (!context.mounted) {
      return;
    }

    if (activeSessionId != null && activeSessionId.isNotEmpty) {
      if (kDebugMode) {
        debugPrint('Settings back press: fallback go(/sessions/$activeSessionId)');
      }
      context.go('/sessions/$activeSessionId');
      return;
    }

    if (kDebugMode) {
      debugPrint('Settings back press: fallback go(/sessions)');
    }
    context.go('/sessions');
  }

  Future<String?> _resolveActiveSessionId(WidgetRef ref) async {
    final inMemorySessionId = _pickMostRecentSessionId(ref.read(sessionsControllerProvider).sessions);
    if (inMemorySessionId != null) {
      return inMemorySessionId;
    }

    try {
      final sessions = await ref.read(sessionsRepositoryProvider).listActive();
      return _pickMostRecentSessionId(sessions);
    } catch (_) {
      return null;
    }
  }

  String? _pickMostRecentSessionId(List<Session> sessions) {
    if (sessions.isEmpty) {
      return null;
    }

    final sortedSessions = [...sessions]
      ..sort((a, b) => _parseIsoOrEpoch(b.updatedAtISO).compareTo(_parseIsoOrEpoch(a.updatedAtISO)));
    return sortedSessions.first.sessionId;
  }

  DateTime _parseIsoOrEpoch(String value) {
    return DateTime.tryParse(value) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  Future<void> _emailSupport(BuildContext context, String appVersion) async {
    final subject = Uri.encodeComponent('Perbug support ($appVersion)');
    final uri = Uri.parse('mailto:support@perbug.com?subject=$subject');
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

    final String userId = await ref.read(userIdProvider.future);
    final diagnostics = await AppDiagnostics.build(
      connectivityState: connectivityState,
      sessionCount: sessions.length,
      telemetryQueueSize: queueSize,
      userId: userId,
    );

    await Clipboard.setData(ClipboardData(text: diagnostics));
    if (context.mounted) {
      AppSnackbar.show(context, 'Diagnostics copied.');
    }
  }

  Future<void> _showManualLocationDialog(BuildContext context, LocationController locationController) async {
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
              TextField(controller: latController, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(labelText: 'Latitude')),
              TextField(controller: lngController, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(labelText: 'Longitude')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
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
  const _Section({required this.title, required this.child, required this.icon});

  final String title;
  final Widget child;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.m),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18),
                const SizedBox(width: AppSpacing.s),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: AppSpacing.s),
            child,
          ],
        ),
      ),
    );
  }
}

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({required this.label, required this.state, this.onOpenSettings});

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
