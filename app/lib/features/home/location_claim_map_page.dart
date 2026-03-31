import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/location/location_models.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';
import 'nearby_claim_locations_page.dart';

class LocationClaimMapPage extends ConsumerWidget {
  const LocationClaimMapPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    final controller = ref.read(locationClaimControllerProvider.notifier);
    final center = state.currentPosition == null
        ? const LatLng(37.7749, -122.4194)
        : LatLng(state.currentPosition!.lat, state.currentPosition!.lng);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: ListTile(
            title: const Text('Claimable map nodes'),
            subtitle: Text(_locationStatusText(state.permissionStatus)),
            trailing: FilledButton(
              onPressed: controller.startTracking,
              child: const Text('Enable location'),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
          child: FilledButton.tonalIcon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NearbyClaimLocationsPage(),
                ),
              );
            },
            icon: const Icon(Icons.list_alt_rounded),
            label: const Text('Open nearby locations'),
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
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: 15,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.drag | InteractiveFlag.pinchZoom,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.perbug.app',
                ),
                MarkerLayer(
                  markers: state.claimables
                      .map(
                        (item) => Marker(
                          point: LatLng(item.location.lat, item.location.lng),
                          width: 120,
                          height: 56,
                          child: Tooltip(
                            message: '${item.location.displayName}\nClaimable ${item.currentReward.toStringAsFixed(6)} Ⓟ',
                            child: _MapNodeMarker(item: item),
                          ),
                        ),
                      )
                      .toList(growable: false),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _locationStatusText(LocationStatus status) => switch (status) {
        LocationStatus.loading => 'Finding your location…',
        LocationStatus.ready => 'Map centered on your current area',
        LocationStatus.permissionDenied => 'Permission denied',
        LocationStatus.serviceDisabled => 'Location services disabled',
        LocationStatus.error => 'Location unavailable',
      };
}

class _MapNodeMarker extends StatelessWidget {
  const _MapNodeMarker({required this.item});

  final ClaimableLocationView item;

  @override
  Widget build(BuildContext context) {
    final disabled = item.flowState == ClaimFlowState.unavailable;
    final color = disabled ? Colors.grey.shade500 : const Color(0xFF34D399);

    return Center(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.72),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color, width: 1.4),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Text(
            '${item.currentReward.toStringAsFixed(4)} Ⓟ',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
