import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/location/location_permission_service.dart';
import '../../core/widgets/section_card.dart';
import '../../providers/app_providers.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationState = ref.watch(locationControllerProvider);
    final locationController = ref.read(locationControllerProvider.notifier);

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          AppSectionCard(
            title: 'Location access',
            icon: Icons.my_location,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FilledButton.icon(
                  onPressed: () => locationController.requestPermissionAndLoad(),
                  icon: const Icon(Icons.location_on_outlined),
                  label: const Text('Enable location'),
                ),
                const SizedBox(height: AppSpacing.s),
                Text(_statusText(locationState)),
                if (locationState.lastPermissionResult?.outcome ==
                    LocationPermissionOutcome.deniedForever)
                  TextButton(
                    onPressed: openAppSettings,
                    child: const Text('Open app settings'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _statusText(LocationControllerState state) {
    if (state.effectiveLocation case final AppLocation location) {
      return 'Enabled: ${location.lat.toStringAsFixed(4)}, ${location.lng.toStringAsFixed(4)}';
    }
    return state.errorMessage ?? 'Location is not enabled yet.';
  }
}
