import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_models.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';

class LocationClaimMapPage extends ConsumerWidget {
  const LocationClaimMapPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    final controller = ref.read(locationClaimControllerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: ListTile(
            title: const Text('Live location claim map'),
            subtitle: Text(_locationStatusText(state.permissionStatus)),
            trailing: FilledButton(
              onPressed: controller.startTracking,
              child: const Text('Enable location'),
            ),
          ),
        ),
        if (state.banner != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: MaterialBanner(
              content: Text(state.banner!),
              actions: const [SizedBox.shrink()],
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: state.claimables.length,
            itemBuilder: (context, index) {
              final item = state.claimables[index];
              return Card(
                child: ListTile(
                  title: Text(item.location.displayName),
                  subtitle: Text('${item.location.category} • ${(item.distanceMeters).round()}m away • radius ${item.location.claimRadiusMeters.round()}m • reward ${item.currentReward.toStringAsFixed(6)}Ⓟ'),
                  trailing: _ClaimActionButton(item: item, controller: controller),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  String _locationStatusText(LocationStatus status) => switch (status) {
        LocationStatus.loading => 'Finding your location…',
        LocationStatus.ready => 'Tracking active',
        LocationStatus.permissionDenied => 'Permission denied',
        LocationStatus.serviceDisabled => 'Location services disabled',
        LocationStatus.error => 'Location unavailable',
      };
}

class _ClaimActionButton extends StatelessWidget {
  const _ClaimActionButton({required this.item, required this.controller});

  final ClaimableLocationView item;
  final LocationClaimController controller;

  @override
  Widget build(BuildContext context) {
    return switch (item.flowState) {
      ClaimFlowState.visited => FilledButton(onPressed: () => controller.prepareClaim(item.location.id), child: const Text('Claim')),
      ClaimFlowState.adRequired => FilledButton(onPressed: () => controller.completeInterstitialAd(item.location.id, success: true), child: const Text('Watch ad')),
      ClaimFlowState.claimReady => FilledButton(onPressed: () => controller.finalizeClaim(item.location.id), child: const Text('Finalize')),
      ClaimFlowState.claimSuccess => const Chip(label: Text('Claimed')),
      _ => const Chip(label: Text('Move closer')),
    };
  }
}
