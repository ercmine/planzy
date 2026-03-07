import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/links/link_types.dart';
import '../../core/location/location_models.dart';
import '../../features/session_create/invite_friends_sheet.dart';
import '../../providers/app_providers.dart';
import 'session_controller.dart';

class SessionPage extends ConsumerWidget {
  const SessionPage({required this.sessionId, super.key});

  final String sessionId;

  static const _inviteLink = 'https://ourplanplan.com/invite/TEST123';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sessionControllerProvider(sessionId));
    final locationState = ref.watch(locationControllerProvider);
    final effectiveLocation = locationState.effectiveLocation;

    return Scaffold(
      appBar: AppBar(title: Text('Session ${state.sessionId}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Session ID: ${state.sessionId}'),
              const SizedBox(height: AppSpacing.s),
              Text('Swipe count: ${state.swipesCount}'),
              const SizedBox(height: AppSpacing.m),
              PrimaryButton(
                label: 'Increment swipe count',
                onPressed: () {
                  ref
                      .read(sessionControllerProvider(sessionId).notifier)
                      .incrementSwipeCount();
                },
              ),
              const SizedBox(height: AppSpacing.l),
              Text(
                'Location status: ${locationState.status.name}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (effectiveLocation != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Lat/Lng: ${effectiveLocation.lat}, ${effectiveLocation.lng}'
                  '${effectiveLocation.isOverride ? ' (manual override)' : ''}',
                ),
              ],
              if (locationState.status == LocationStatus.error &&
                  locationState.errorMessage != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(locationState.errorMessage!),
              ],
              const SizedBox(height: AppSpacing.m),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  FilledButton(
                    onPressed: () {
                      ref
                          .read(locationControllerProvider.notifier)
                          .requestPermissionAndLoad();
                    },
                    child: const Text('Get my location'),
                  ),
                  OutlinedButton(
                    onPressed: () => _showManualOverrideDialog(context, ref),
                    child: const Text('Manual location override'),
                  ),
                  if (locationState.manualOverride != null)
                    OutlinedButton(
                      onPressed: () {
                        ref.read(locationControllerProvider.notifier).clearOverride();
                      },
                      child: const Text('Clear override'),
                    ),
                  FilledButton(
                    onPressed: () {
                      InviteFriendsSheet.show(context, inviteLink: _inviteLink);
                    },
                    child: const Text('Load contacts'),
                  ),
                  OutlinedButton(
                    onPressed: () {
                      ref.read(shareServiceProvider).shareText(
                            'Join my OurPlanPlan session: $_inviteLink',
                            subject: 'OurPlanPlan invite',
                          );
                    },
                    child: const Text('Share invite link'),
                  ),
                  OutlinedButton(
                    onPressed: () async {
                      await ref
                          .read(shareServiceProvider)
                          .copyToClipboard(_inviteLink);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Invite link copied')),
                        );
                      }
                    },
                    child: const Text('Copy invite link'),
                  ),
                  FilledButton(
                    onPressed: () {
                      ref.read(linkLauncherProvider).openLink(
                            context,
                            uri: Uri.parse(
                              'https://www.google.com/maps/search/?api=1&query=coffee',
                            ),
                            type: LinkType.maps,
                            planTitle: 'Coffee meetup',
                          );
                    },
                    child: const Text('Open maps link'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showManualOverrideDialog(BuildContext context, WidgetRef ref) async {
    final latController = TextEditingController();
    final lngController = TextEditingController();

    final result = await showDialog<(double, double)>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Manual location override'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: latController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(labelText: 'Latitude'),
              ),
              TextField(
                controller: lngController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(labelText: 'Longitude'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final lat = double.tryParse(latController.text.trim());
                final lng = double.tryParse(lngController.text.trim());
                if (lat == null || lng == null) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text('Enter valid coordinates.')),
                  );
                  return;
                }
                Navigator.of(dialogContext).pop((lat, lng));
              },
              child: const Text('Apply'),
            ),
          ],
        );
      },
    );

    latController.dispose();
    lngController.dispose();

    if (result == null) {
      return;
    }

    ref.read(locationControllerProvider.notifier).setManualOverride(
          result.$1,
          result.$2,
        );
  }
}
