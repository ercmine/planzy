import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/location/location_models.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';
import 'nearby_claim_locations_page.dart';

class LocationClaimMapPage extends ConsumerStatefulWidget {
  const LocationClaimMapPage({super.key});

  @override
  ConsumerState<LocationClaimMapPage> createState() => _LocationClaimMapPageState();
}

class _LocationClaimMapPageState extends ConsumerState<LocationClaimMapPage> {
  final MapController _mapController = MapController();
  LatLng? _lastCenteredPosition;

  @override
  void initState() {
    super.initState();
    ref.listenManual<LocationClaimState>(
      locationClaimControllerProvider,
      (previous, next) {
        final nextPosition = next.currentPosition;
        if (nextPosition == null) return;
        final nextLatLng = LatLng(nextPosition.lat, nextPosition.lng);
        final previousPosition = previous?.currentPosition;
        final positionChanged = previousPosition == null ||
            previousPosition.lat != nextPosition.lat ||
            previousPosition.lng != nextPosition.lng;
        final shouldRecenter = _lastCenteredPosition == null || positionChanged;
        if (shouldRecenter) {
          _mapController.move(nextLatLng, _mapController.camera.zoom);
          _lastCenteredPosition = nextLatLng;
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(locationClaimControllerProvider);
    final controller = ref.read(locationClaimControllerProvider.notifier);
    final center = state.currentPosition == null
        ? const LatLng(37.7749, -122.4194)
        : LatLng(state.currentPosition!.lat, state.currentPosition!.lng);
    final latestClaim = state.claimHistory.isEmpty ? null : state.claimHistory.first;
    final claimFxLocationId = latestClaim != null && DateTime.now().toUtc().difference(latestClaim.createdAt) < const Duration(seconds: 2)
        ? latestClaim.locationId
        : null;

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
              mapController: _mapController,
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
                            child: _MapNodeMarker(
                              item: item,
                              showClaimEffect: claimFxLocationId == item.location.id,
                              onTap: () => controller.claimInstantly(item.location.id),
                            ),
                          ),
                        ),
                      )
                      .toList(growable: false),
                ),
                CircleLayer(
                  circles: state.claimables
                      .map(
                        (item) => CircleMarker(
                          point: LatLng(item.location.lat, item.location.lng),
                          radius: item.location.claimRadiusMeters,
                          useRadiusInMeter: true,
                          color: item.inRange ? const Color(0x2234D399) : const Color(0x1F94A3B8),
                          borderColor: item.inRange ? const Color(0xAA34D399) : const Color(0x8894A3B8),
                          borderStrokeWidth: 1.2,
                        ),
                      )
                      .toList(growable: false),
                ),
                if (state.currentPosition != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(state.currentPosition!.lat, state.currentPosition!.lng),
                        width: 40,
                        height: 40,
                        child: const DecoratedBox(
                          decoration: BoxDecoration(
                            color: Color(0xAA2563EB),
                            shape: BoxShape.circle,
                          ),
                          child: Padding(
                            padding: EdgeInsets.all(8),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
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
  const _MapNodeMarker({
    required this.item,
    required this.showClaimEffect,
    required this.onTap,
  });

  final ClaimableLocationView item;
  final bool showClaimEffect;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final disabled = item.flowState == ClaimFlowState.unavailable;
    final onCooldown = item.flowState == ClaimFlowState.cooldown && item.isOnCooldown;
    final color = disabled
        ? Colors.grey.shade500
        : onCooldown
            ? const Color(0xFF94A3B8)
            : const Color(0xFF34D399);
    final timerLabel = onCooldown ? _cooldownLabel(item.cooldownUntil!) : '${item.currentReward.toStringAsFixed(4)} Ⓟ';

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Center(
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            if (showClaimEffect) const _ClaimParticleBurst(),
            DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.72),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: color, width: 1.4),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                child: Text(
                  timerLabel,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _cooldownLabel(DateTime cooldownUntil) {
    final remaining = cooldownUntil.difference(DateTime.now().toUtc());
    if (remaining.isNegative) return '${item.currentReward.toStringAsFixed(4)} Ⓟ';
    final hours = remaining.inHours;
    final minutes = remaining.inMinutes.remainder(60);
    return '${hours}h ${minutes}m';
  }
}

class _ClaimParticleBurst extends StatefulWidget {
  const _ClaimParticleBurst();

  @override
  State<_ClaimParticleBurst> createState() => _ClaimParticleBurstState();
}

class _ClaimParticleBurstState extends State<_ClaimParticleBurst> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  )..forward();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final progress = Curves.easeOut.transform(_controller.value);
        final fade = (1 - _controller.value).clamp(0.0, 1.0);
        return IgnorePointer(
          child: SizedBox(
            width: 72,
            height: 72,
            child: Stack(
              alignment: Alignment.center,
              children: List<Widget>.generate(8, (index) {
                final angle = (index / 8) * 6.28318530718;
                final radius = 10 + (18 * progress);
                return Transform.translate(
                  offset: Offset(radius * math.cos(angle), radius * math.sin(angle)),
                  child: Opacity(
                    opacity: fade,
                    child: Container(
                      width: 5,
                      height: 5,
                      decoration: const BoxDecoration(
                        color: Color(0xFF34D399),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        );
      },
    );
  }
}
