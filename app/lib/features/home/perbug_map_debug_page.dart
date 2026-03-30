import 'package:flutter/material.dart';

import '../../app/theme/widgets.dart';
import 'map_discovery_models.dart';
import 'perbug_world_map_view.dart';

class PerbugMapDebugPage extends StatefulWidget {
  const PerbugMapDebugPage({super.key});

  @override
  State<PerbugMapDebugPage> createState() => _PerbugMapDebugPageState();
}

class _PerbugMapDebugPageState extends State<PerbugMapDebugPage> {
  MapViewport _viewport = const MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
  String? _selectedNodeId;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(title: const Text('Perbug Map Debug Route')),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: AppCard(
          child: SizedBox(
            height: 520,
            child: PerbugWorldMapView(
              viewport: _viewport,
              nodes: const [],
              connections: const {},
              currentNodeId: null,
              selectedNodeId: _selectedNodeId,
              reachableNodeIds: const {},
              completedNodeIds: const {},
              onViewportChanged: (viewport, {required hasGesture}) => setState(() => _viewport = viewport),
              onTapEmpty: () => setState(() => _selectedNodeId = null),
              onNodeSelected: (nodeId) => setState(() => _selectedNodeId = nodeId),
              showDebugOverlay: true,
            ),
          ),
        ),
      ),
    );
  }
}
