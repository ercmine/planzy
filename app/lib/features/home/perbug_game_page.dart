import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/rpg_bar.dart';
import '../../app/theme/widgets.dart';
import '../../app/app_routes.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/navigation/navigation_utils.dart';
import '../../providers/app_providers.dart';
import '../puzzles/grid_path_puzzle_sheet.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'world/world_map_scene.dart';
import 'world/world_map_scene_controller.dart';
import 'world/world_map_scene_generator.dart';
import 'world/world_map_scene_models.dart';
import 'perbug_maplibre_view.dart';
import 'perbug_asset_registry.dart';
import 'perbug_economy_models.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugGamePage extends ConsumerStatefulWidget {
  const PerbugGamePage({
    super.key,
    this.showTacticalHud = true,
  });

  final bool showTacticalHud;

  @override
  ConsumerState<PerbugGamePage> createState() => _PerbugGamePageState();
}

class _PerbugGamePageState extends ConsumerState<PerbugGamePage> {
  String? _selectedNodeId;
  String? _mapAnchoredNodeId;
  late MapViewport _mapViewport;
  final TextEditingController _searchController = TextEditingController();
  _MapEntryState _entryState = _MapEntryState.idle;
  String? _entryDetails;
  late final WorldMapSceneController _sceneController;
  WorldMapNode? _selectedWorldNode;
  String? _lastSceneSignature;

  @override
  void dispose() {
    _sceneController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _mapViewport = const MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    _sceneController = WorldMapSceneController(generator: const WorldMapSceneGenerator());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(perbugGameControllerProvider);
    final locationState = ref.watch(locationControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final currentNode = state.currentNode;
    if (currentNode != null && _selectedNodeId == null) _selectedNodeId = currentNode.id;
    if (currentNode != null && _mapAnchoredNodeId != currentNode.id) {
      _mapAnchoredNodeId = currentNode.id;
      _mapViewport = MapViewport(centerLat: currentNode.latitude, centerLng: currentNode.longitude, zoom: state.fixedZoom);
    }
    final selectedNode = _selectedNode(state);
    final selectedMove = selectedNode == null ? null : _moveForNode(state, selectedNode.id);
    final mapUiState = _mapUiState(state: state, locationState: locationState);
    final showBlockingMapOverlay = _shouldShowBlockingMapOverlay(mapUiState);
    final showDemoLocationCta = _shouldShowDemoLocationCta(state: state, locationState: locationState);
    final locationForScene = locationState.effectiveLocation;
    final signature = '${locationForScene?.lat.toStringAsFixed(3)}:${locationForScene?.lng.toStringAsFixed(3)}:${state.nodes.length}:${state.progression.level}';
    if (_lastSceneSignature != signature) {
      _lastSceneSignature = signature;
      _sceneController.regenerate(
        location: locationForScene,
        demoMode: locationForScene == null,
        seed: state.nodes.length + state.progression.level,
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final mapHeight = math.max(420.0, constraints.maxHeight);
        return RefreshIndicator(
          onRefresh: () async {
            if (_entryState == _MapEntryState.locationGranted) {
              await controller.requestLocationAndRefresh();
            } else {
              await _continueInDemoMode();
            }
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(12),
            children: [
              SizedBox(
                height: mapHeight,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: kIsWeb
                            ? PerbugMapLibreView(
                                viewport: _mapViewport,
                                pins: const <MapPin>[],
                                selectedPlaceId: null,
                                userLocation: locationForScene == null
                                    ? null
                                    : (lat: locationForScene.lat, lng: locationForScene.lng),
                                world: const MapWorldState(
                                  districts: <DistrictZone>[],
                                  collectibles: <CollectibleItem>[],
                                  loadout: PlayerLoadout(
                                    title: 'Web fallback',
                                    level: 1,
                                    archetype: PlayerArchetype.explorer,
                                    bodyColor: Color(0xFF334155),
                                    auraColor: Color(0xFF64748B),
                                    accentColor: Color(0xFF94A3B8),
                                    ringAsset: 'fallback',
                                    trailLabel: 'fallback',
                                    unlockedCosmetics: <String>[],
                                  ),
                                  summary: InventorySummary(
                                    totalCollected: 0,
                                    totalVisible: 0,
                                    districtProgress: 0,
                                    rareFinds: 0,
                                    cosmeticUnlocks: 0,
                                  ),
                                  analytics: <String, Object>{},
                                  tuning: <String, Object>{},
                                ),
                                sponsoredPlaceIds: const <String>{},
                                questPlaceIds: const <String>{},
                                collectionPlaceIds: const <String>{},
                                is3dMode: false,
                                config: ref.watch(envConfigProvider).mapStack,
                                tacticalNodes: state.nodes,
                                tacticalConnections: state.connections,
                                currentNodeId: state.currentNodeId,
                                selectedNodeId: _selectedNodeId,
                                reachableNodeIds: state.reachableMoves.map((m) => m.node.id).toSet(),
                                onMapLoadStarted: () {},
                                onMapReady: () {},
                                onMapLoadError: (_) {},
                                onTapEmpty: () => setState(() => _selectedNodeId = null),
                                onLongPress: (lat, lng) => setState(
                                  () => _mapViewport = MapViewport(centerLat: lat, centerLng: lng, zoom: _mapViewport.zoom),
                                ),
                                onViewportChanged: (nextViewport, {required hasGesture}) => setState(() => _mapViewport = nextViewport),
                                onPlaceSelected: (_) {},
                                onNodeSelected: (nodeId) => _handleNodeTap(controller, state, nodeId),
                              )
                            : WorldMapScene(
                                controller: _sceneController,
                                onTapEmpty: () => setState(() {
                                  _selectedNodeId = null;
                                  _selectedWorldNode = null;
                                }),
                                onNodeTapped: (node) {
                                  final match = state.nodes
                                      .where((candidate) => candidate.nodeType == node.perbugType)
                                      .toList(growable: false);
                                  setState(() {
                                    _selectedWorldNode = node;
                                    _selectedNodeId = match.isNotEmpty ? match.first.id : _selectedNodeId;
                                  });
                                },
                              ),
                      ),
                      Positioned(
                        top: 12,
                        left: 12,
                        right: 12,
                        child: AppCard(
                          tone: AppCardTone.muted,
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _searchController,
                                  decoration: const InputDecoration(
                                    hintText: 'Search a city, district, or landmark…',
                                    isDense: true,
                                    border: OutlineInputBorder(),
                                  ),
                                  onSubmitted: (_) => _runGeoSearch(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              SecondaryButton(label: 'Jump', onPressed: _runGeoSearch),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12,
                        top: 92,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            AppPill(
                              label: ref.watch(locationControllerProvider).effectiveLocation == null ? 'Demo mode' : 'Live location',
                              icon: ref.watch(locationControllerProvider).effectiveLocation == null ? Icons.smart_toy_outlined : Icons.my_location,
                            ),
                            const SizedBox(height: 6),
                            AppPill(label: 'Energy ${state.energy}/${state.maxEnergy}', icon: Icons.bolt_rounded),
                            const SizedBox(height: 6),
                            AppPill(label: state.areaLabel ?? 'Unknown region', icon: Icons.public),
                          ],
                        ),
                      ),
                      Positioned(
                        right: 12,
                        top: 92,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            SizedBox(
                              width: 148,
                              child: RpgBarButton(
                                height: 42,
                                label: 'Node Intel',
                              icon: const Icon(Icons.place_outlined),
                                onPressed: () => context.go(AppRoutes.nodeDetails),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: 148,
                              child: RpgBarButton(
                                height: 42,
                                label: 'Encounter',
                              icon: const Icon(Icons.sports_martial_arts),
                                onPressed: () => context.go(AppRoutes.encounter),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: 148,
                              child: RpgBarButton(
                                height: 42,
                                label: 'Marketplace',
                              icon: const Icon(Icons.storefront_outlined),
                              onPressed: () => context.go(AppRoutes.marketplace),
                                variant: RpgButtonVariant.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (showBlockingMapOverlay)
                        Positioned.fill(
                          child: _MapStatusOverlay(
                            state: mapUiState,
                            locationState: locationState,
                            details: _entryDetails ?? state.error ?? state.worldDebug['fallback_reason']?.toString(),
                            onRequestLocation: _useMyLocation,
                            onContinueDemo: _continueInDemoMode,
                          ),
                        ),
                      if (showDemoLocationCta)
                        Positioned(
                          top: 12,
                          right: 12,
                          child: _DemoModeLocationButton(
                            requestingLocation: _entryState == _MapEntryState.requestingLocation,
                            onPressed: _useMyLocation,
                          ),
                        ),
                      if (kDebugMode)
                        Positioned(
                          right: 8,
                          bottom: 8,
                          child: _DebugMapOverlay(
                            gameState: state,
                            locationState: locationState,
                            viewport: _mapViewport,
                          ),
                        ),
                      if (!showBlockingMapOverlay && _selectedWorldNode != null)
                        Positioned(
                          left: 12,
                          top: 176,
                          child: _WorldNodeInspectorCard(node: _selectedWorldNode!),
                        ),
                      if (!showBlockingMapOverlay && selectedNode != null)
                        Positioned(
                          left: 12,
                          right: 12,
                          bottom: 12,
                          child: _NodeTacticalPanel(
                            node: selectedNode,
                            move: selectedMove,
                            onDeploy: selectedMove == null || !selectedMove.isReachable
                                ? null
                                : () async {
                                    final ok = await controller.jumpTo(selectedMove);
                                    if (!mounted || !ok) return;
                                    setState(() => _selectedNodeId = selectedMove.node.id);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Deployed to ${selectedMove.node.label}.')),
                                    );
                                  },
                            onEnterEncounter: state.currentNodeId == selectedNode.id ? () => context.go(AppRoutes.encounter) : null,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  _MapUiState _mapUiState({
    required PerbugGameState state,
    required LocationControllerState locationState,
  }) {
    if (_entryState == _MapEntryState.idle) return _MapUiState.idle;
    if (_entryState == _MapEntryState.requestingLocation) return _MapUiState.requestingLocation;
    if (_entryState == _MapEntryState.locationDenied) return _MapUiState.permissionDenied;
    if (_entryState == _MapEntryState.unsupported) return _MapUiState.unsupported;
    if (state.loading) {
      if (_entryState == _MapEntryState.locationGranted) return _MapUiState.requestingLocation;
      return _MapUiState.loading;
    }
    if (state.nodes.isEmpty) return _MapUiState.empty;
    if (_entryState == _MapEntryState.demoMode ||
        state.worldDebug['generation_status'] == 'fallback' ||
        state.worldDebug['fallback_active'] == true) {
      return _MapUiState.demoMode;
    }
    if (_entryState == _MapEntryState.locationGranted && locationState.status == LocationStatus.ready) {
      return _MapUiState.locationGranted;
    }
    if (state.error != null && state.nodes.isNotEmpty) return _MapUiState.generationFailed;
    return _MapUiState.ready;
  }

  bool _shouldShowBlockingMapOverlay(_MapUiState state) {
    switch (state) {
      case _MapUiState.idle:
      case _MapUiState.loading:
      case _MapUiState.requestingLocation:
      case _MapUiState.permissionDenied:
      case _MapUiState.unsupported:
      case _MapUiState.empty:
        return true;
      case _MapUiState.locationGranted:
      case _MapUiState.demoMode:
      case _MapUiState.generationFailed:
      case _MapUiState.ready:
        return false;
    }
  }

  bool _shouldShowDemoLocationCta({
    required PerbugGameState state,
    required LocationControllerState locationState,
  }) {
    if (_entryState == _MapEntryState.requestingLocation) return false;
    if (locationState.effectiveLocation != null && locationState.status == LocationStatus.ready) {
      return false;
    }
    if (_entryState == _MapEntryState.demoMode ||
        _entryState == _MapEntryState.locationDenied ||
        _entryState == _MapEntryState.unsupported) {
      return true;
    }
    return state.worldDebug['location_mode'] == 'demo' ||
        state.worldDebug['fallback_active'] == true ||
        state.worldDebug['generation_status'] == 'fallback';
  }

  Future<void> _useMyLocation() async {
    if (_entryState == _MapEntryState.requestingLocation) return;
    if (kIsWeb && !_webCanRequestGeolocation()) {
      setState(() {
        _entryState = _MapEntryState.unsupported;
        _entryDetails = 'Location prompts on web require HTTPS (or localhost).';
      });
      return;
    }

    setState(() {
      _entryState = _MapEntryState.requestingLocation;
      _entryDetails = 'Requesting real location permission from your device/browser.';
    });

    await ref.read(perbugGameControllerProvider.notifier).requestLocationAndRefresh();
    if (!mounted) return;
    final locationState = ref.read(locationControllerProvider);
    final gameState = ref.read(perbugGameControllerProvider);

    if (locationState.effectiveLocation != null && locationState.status == LocationStatus.ready) {
      setState(() {
        _entryState = _MapEntryState.locationGranted;
        _entryDetails = 'Live location enabled. Your world is now anchored to your real position.';
      });
      return;
    }

    if (locationState.status == LocationStatus.permissionDenied) {
      setState(() {
        _entryState = _MapEntryState.locationDenied;
        _entryDetails = locationState.errorMessage ?? 'Location access was denied. Continue in demo mode to keep playing.';
      });
      return;
    }

    if (locationState.status == LocationStatus.serviceDisabled) {
      setState(() {
        _entryState = _MapEntryState.unsupported;
        _entryDetails = locationState.errorMessage ?? 'Location services are unavailable. Continue in demo mode to explore.';
      });
      return;
    }

    setState(() {
      _entryState = gameState.worldDebug['fallback_active'] == true ? _MapEntryState.demoMode : _MapEntryState.locationDenied;
      _entryDetails = gameState.worldDebug['fallback_active'] == true
          ? 'Live position was unavailable. Demo frontier loaded so your run continues.'
          : 'Could not confirm live location. You can continue in demo mode.';
    });
  }

  Future<void> _handleNodeTap(
    PerbugGameController controller,
    PerbugGameState state,
    String nodeId,
  ) async {
    setState(() => _selectedNodeId = nodeId);
    final move = _moveForNode(state, nodeId);
    if (move == null || !move.isReachable) return;
    final ok = await controller.jumpTo(move);
    if (!mounted || !ok) return;
    setState(() => _selectedNodeId = move.node.id);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Claimed node ${move.node.label} (+Perbug progression).')),
    );
  }

  Future<void> _continueInDemoMode() async {
    setState(() {
      _entryState = _MapEntryState.demoMode;
      _entryDetails = 'Demo mode loaded. Use My Location any time to generate your real world.';
    });
    await ref.read(perbugGameControllerProvider.notifier).initialize();
  }

  bool _webCanRequestGeolocation() {
    if (!kIsWeb) return true;
    final base = Uri.base;
    final localHost = base.host == 'localhost' || base.host == '127.0.0.1';
    return base.scheme == 'https' || localHost;
  }

  Future<void> _openPuzzleSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return Consumer(
          builder: (context, ref, _) {
            final session = ref.watch(perbugGameControllerProvider).puzzleSession;
            final controller = ref.read(perbugGameControllerProvider.notifier);
            if (session == null) return const SizedBox.shrink();
            return FractionallySizedBox(
              heightFactor: 0.95,
              child: GridPathPuzzleSheet(
                session: session,
                onStart: controller.startActivePuzzle,
                onTapCell: controller.tapPuzzleCell,
                onUndo: controller.undoPuzzleMove,
                onReset: controller.resetPuzzleSession,
                onAbandon: controller.abandonPuzzleSession,
                onClose: () {
                  controller.clearPuzzleSession();
                  Navigator.of(context).pop();
                },
              ),
            );
          },
        );
      },
    );
  }


  Future<void> _runGeoSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final geo = await ref.read(mapGeoClientProvider.future);
      final results = await geo.geocode(query);
      if (results.isEmpty) {
        messenger.showSnackBar(const SnackBar(content: Text('No matching region found.')));
        return;
      }
      final top = results.first;
      if (!mounted) return;
      setState(() {
        _mapViewport = MapViewport(centerLat: top.lat, centerLng: top.lng, zoom: _mapViewport.zoom);
      });
      messenger.showSnackBar(SnackBar(content: Text('Retargeted to ${top.displayName}.')));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Search unavailable right now.')));
    }
  }

  PerbugNode? _selectedNode(PerbugGameState state) {
    final id = _selectedNodeId ?? state.currentNodeId;
    if (id == null) return null;
    for (final node in state.nodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  PerbugMoveCandidate? _moveForNode(PerbugGameState state, String nodeId) {
    for (final move in state.reachableMoves()) {
      if (move.node.id == nodeId) return move;
    }
    return null;
  }

}

enum _MapUiState {
  idle,
  loading,
  requestingLocation,
  locationGranted,
  permissionDenied,
  unsupported,
  demoMode,
  generationFailed,
  empty,
  ready,
}

enum _MapEntryState {
  idle,
  requestingLocation,
  locationGranted,
  locationDenied,
  unsupported,
  demoMode,
}

class _MapStatusOverlay extends StatefulWidget {
  const _MapStatusOverlay({
    required this.state,
    required this.locationState,
    required this.onRequestLocation,
    required this.onContinueDemo,
    this.details,
  });

  final _MapUiState state;
  final LocationControllerState locationState;
  final VoidCallback onRequestLocation;
  final VoidCallback onContinueDemo;
  final String? details;

  @override
  State<_MapStatusOverlay> createState() => _MapStatusOverlayState();
}

class _MapStatusOverlayState extends State<_MapStatusOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _logoAnimationController;
  late final Animation<double> _logoPulse;
  late final Animation<Offset> _promptSlide;
  late final Animation<double> _promptOpacity;

  @override
  void initState() {
    super.initState();
    _logoAnimationController = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))
      ..repeat(reverse: true);
    _logoPulse = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(parent: _logoAnimationController, curve: Curves.easeInOutCubic),
    );
    _promptSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
      CurvedAnimation(parent: _logoAnimationController, curve: const Interval(0.15, 0.8, curve: Curves.easeOutCubic)),
    );
    _promptOpacity = Tween<double>(begin: 0.55, end: 1).animate(
      CurvedAnimation(parent: _logoAnimationController, curve: const Interval(0.2, 0.95, curve: Curves.easeInOut)),
    );
  }

  @override
  void dispose() {
    _logoAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.state == _MapUiState.ready) return const SizedBox.shrink();
    final (title, subtitle) = switch (widget.state) {
      _MapUiState.idle => (
          'Enable location to begin',
          'Perbug uses your live position to build your tactical world. Enable location and continue to deploy on the real map.',
        ),
      _MapUiState.requestingLocation => ('Requesting location', 'Waiting for browser/device location permission.'),
      _MapUiState.locationGranted => ('Live location active', 'Your tactical world is now generated from your real location.'),
      _MapUiState.permissionDenied => (
          'Location denied',
          widget.locationState.errorMessage ?? 'Location access was denied. Continue in demo mode immediately.',
        ),
      _MapUiState.unsupported => ('Location unavailable', 'Location services are disabled or unsupported on this device/browser.'),
      _MapUiState.demoMode => ('Demo map active', 'Using deterministic fallback world so gameplay remains available.'),
      _MapUiState.generationFailed => ('Live generation failed', 'Using fallback frontier so the map loop continues.'),
      _MapUiState.empty => ('No world nodes yet', 'Retry with location or continue in demo mode.'),
      _MapUiState.loading => ('Loading frontier', 'Building world nodes…'),
      _MapUiState.ready => throw StateError('unreachable'),
    };

    return ColoredBox(
      color: Colors.black.withOpacity(0.35),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: AnimatedBuilder(
                      animation: _logoAnimationController,
                      builder: (context, child) => Transform.scale(scale: _logoPulse.value, child: child),
                      child: Container(
                        width: 92,
                        height: 92,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.24),
                              blurRadius: 20,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset('assets/branding/perbug.png', fit: BoxFit.cover),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 6),
                  Text(subtitle),
                  const SizedBox(height: 8),
                  SlideTransition(
                    position: _promptSlide,
                    child: FadeTransition(
                      opacity: _promptOpacity,
                      child: Text(
                        'Allow location access to continue your map deployment.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ),
                  if (widget.details != null && widget.details!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(widget.details!, style: Theme.of(context).textTheme.bodySmall),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: widget.state == _MapUiState.requestingLocation ? null : widget.onRequestLocation,
                        icon: const Icon(Icons.my_location),
                        label: const Text('Enable Location & Continue'),
                      ),
                      OutlinedButton.icon(
                        onPressed: widget.onContinueDemo,
                        icon: const Icon(Icons.smart_toy_outlined),
                        label: const Text('Continue Demo Mode'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PerbugArtAvatar extends StatelessWidget {
  const _PerbugArtAvatar({
    required this.assetPath,
    required this.fallbackIcon,
    this.tint,
  });

  final String? assetPath;
  final IconData fallbackIcon;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    if (assetPath == null || assetPath!.isEmpty) {
      return CircleAvatar(child: Icon(fallbackIcon, size: 18));
    }
    return ClipOval(
      child: SizedBox.square(
        dimension: 40,
        child: Image.asset(
          assetPath!,
          fit: BoxFit.cover,
          color: tint,
          colorBlendMode: tint == null ? null : BlendMode.modulate,
          errorBuilder: (_, __, ___) => CircleAvatar(child: Icon(fallbackIcon, size: 18)),
        ),
      ),
    );
  }
}

class _DemoModeLocationButton extends StatelessWidget {
  const _DemoModeLocationButton({
    required this.onPressed,
    required this.requestingLocation,
  });

  final VoidCallback onPressed;
  final bool requestingLocation;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Switch from demo to real-world map anchoring',
      child: FilledButton.tonalIcon(
        onPressed: requestingLocation ? null : onPressed,
        icon: const Icon(Icons.explore_outlined),
        label: const Text('Switch to Real World'),
      ),
    );
  }
}

class _NodeTacticalPanel extends StatelessWidget {
  const _NodeTacticalPanel({
    required this.node,
    required this.move,
    required this.onDeploy,
    required this.onEnterEncounter,
  });

  final PerbugNode node;
  final PerbugMoveCandidate? move;
  final VoidCallback? onDeploy;
  final VoidCallback? onEnterEncounter;

  @override
  Widget build(BuildContext context) {
    final visual = PerbugAssetRegistry.nodeVisual(node.nodeType);
    final style = Theme.of(context).textTheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0D1022).withOpacity(0.92),
            visual.color.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.16)),
        boxShadow: [
          BoxShadow(
            blurRadius: 18,
            offset: const Offset(0, 8),
            color: Colors.black.withOpacity(0.35),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                _PerbugArtAvatar(
                  assetPath: visual.tileRef.assetPath,
                  fallbackIcon: visual.icon,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    node.label,
                    style: style.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                AppPill(
                  label: node.nodeType.name.toUpperCase(),
                  icon: Icons.auto_awesome,
                  backgroundColor: visual.color.withOpacity(0.2),
                  foregroundColor: Colors.white,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${node.neighborhood}, ${node.city} • Difficulty ${node.difficulty}',
              style: style.bodySmall?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: RpgBarButton(
                    height: 40,
                    label: move?.isReachable == true ? 'Deploy (-${move!.energyCost}⚡)' : (move?.reason ?? 'Current node'),
                    onPressed: onDeploy,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: RpgBarButton(
                    height: 40,
                    label: 'Enter encounter',
                    variant: RpgButtonVariant.secondary,
                    onPressed: onEnterEncounter,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DebugMapOverlay extends StatelessWidget {
  const _DebugMapOverlay({
    required this.gameState,
    required this.locationState,
    required this.viewport,
  });

  final PerbugGameState gameState;
  final LocationControllerState locationState;
  final MapViewport viewport;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white) ?? const TextStyle(color: Colors.white, fontSize: 11);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.62),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: DefaultTextStyle(
          style: style,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('mode=${gameState.worldDebug['location_mode'] ?? 'unknown'}'),
              Text('perm=${locationState.status.name}'),
              Text('nodes=${gameState.nodes.length} edges=${gameState.connections.length}'),
              Text('center=${viewport.centerLat.toStringAsFixed(4)},${viewport.centerLng.toStringAsFixed(4)} z=${viewport.zoom.toStringAsFixed(1)}'),
              Text('gen=${gameState.worldDebug['generation_status'] ?? 'n/a'}'),
              Text('fallback=${gameState.worldDebug['fallback_active'] == true ? 'on' : 'off'}'),
              if (gameState.error != null) Text('error=${gameState.error}'),
              if (gameState.worldDebug['seed'] != null) Text('seed=${gameState.worldDebug['seed']}'),
            ],
          ),
        ),
      ),
    );
  }
}

class _WorldNodeInspectorCard extends StatelessWidget {
  const _WorldNodeInspectorCard({required this.node});

  final WorldMapNode node;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xCC111728),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: categoryColor(node.category).withOpacity(0.6)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(node.label, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
            Text('${node.category.name.toUpperCase()} • Tier ${node.difficulty}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
            Text('Travel ${node.energyCost}⚡', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFFFFD36E))),
          ],
        ),
      ),
    );
  }
}

class _EnergyMeter extends StatelessWidget {
  const _EnergyMeter({required this.current, required this.max});

  final int current;
  final int max;

  @override
  Widget build(BuildContext context) {
    final ratio = max == 0 ? 0.0 : (current / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Energy $current / $max', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 6),
        LinearProgressIndicator(value: ratio, minHeight: 10),
      ],
    );
  }
}

class _BoardPainter extends CustomPainter {
  const _BoardPainter({required this.state});

  final PerbugGameState state;

  @override
  void paint(Canvas canvas, Size size) {
    if (state.nodes.isEmpty) return;
    final lats = state.nodes.map((n) => n.latitude);
    final lngs = state.nodes.map((n) => n.longitude);
    final minLat = lats.reduce(math.min);
    final maxLat = lats.reduce(math.max);
    final minLng = lngs.reduce(math.min);
    final maxLng = lngs.reduce(math.max);

    Offset toPoint(PerbugNode n) {
      final x = ((n.longitude - minLng) / ((maxLng - minLng).abs() + 0.0001)) * (size.width - 32) + 16;
      final y = ((maxLat - n.latitude) / ((maxLat - minLat).abs() + 0.0001)) * (size.height - 32) + 16;
      return Offset(x, y);
    }

    final current = state.currentNode;
    if (current != null) {
      final currentPoint = toPoint(current);
      final linePaint = Paint()
        ..color = const Color(0xFF4E7DFF).withOpacity(0.38)
        ..strokeWidth = 1.4;
      for (final move in state.reachableMoves().take(14)) {
        canvas.drawLine(currentPoint, toPoint(move.node), linePaint..color = move.isReachable ? const Color(0xFF4E7DFF).withOpacity(0.38) : const Color(0xFF8D99AE).withOpacity(0.2));
      }
    }

    for (final node in state.nodes) {
      final p = toPoint(node);
      final isCurrent = node.id == state.currentNodeId;
      final isVisited = state.visitedNodeIds.contains(node.id);
      final isReachable = state.reachableMoves().any((move) => move.node.id == node.id && move.isReachable);
      final fill = Paint()
        ..color = isCurrent
            ? const Color(0xFFFFD166)
            : isReachable
                ? PerbugAssetRegistry.nodeVisual(node.nodeType).color
                : (isVisited ? const Color(0xFF4ECDC4) : const Color(0xFF8D99AE));
      canvas.drawCircle(p, isCurrent ? 7 : 5, fill);
    }
  }

  @override
  bool shouldRepaint(covariant _BoardPainter oldDelegate) => oldDelegate.state != state;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.collection,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RpgBarSurface(
            height: 54,
            tint: const Color(0x2A000000),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}
