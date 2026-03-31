# Perbug World Map System (Custom Engine)

## 1) Current map stack audit

### Existing dependencies and flow
- `maplibre_gl` is currently included in Flutter app dependencies (`pubspec.lock`) and used by `PerbugMapLibreView` for native map rendering with a web fallback path. 
- `PerbugMapLibreView` integrates camera lifecycle, style loading, pin sync, and click handling, but on web it falls back to a simplified static layer (`_WebStaticFallbackMap`) because full plugin behavior is constrained. 
- Tactical game mode (`PerbugGamePage`) previously used `PerbugMapLibreView` as the core world board renderer.
- Gameplay map state is already mostly map-engine agnostic through data models:
  - `MapViewport`, `MapPin` (`map_discovery_models.dart`)
  - `PerbugNode`, `PerbugMoveCandidate`, graph semantics (`perbug_game_models.dart`)
  - Node generation from geographic data (`perbug_node_world_engine.dart`)

### Nominatim and real-geo semantics already present
- `RemoteMapGeoClient` resolves geocode/reverse geocode and nearby place calls over backend geo APIs.
- Node generation attaches semantic/source metadata like `source: geo_nominatim` and category/rating context.
- `PerbugGameController.initialize()` uses reverse geocode + nearby fetches, then converts places to tactical nodes.

### Reuse vs replace
- Reuse:
  - Node generation and progression logic
  - Nominatim-backed discovery and reverse geocoding
  - Existing graph/reachability and movement economy loop
- Replace for core experience:
  - UI rendering layer of tactical world board no longer tied to MapLibre widget assumptions.
- Adapter seam:
  - Keep `MapViewport` contract and node graph contract stable.
  - Inject a Perbug-specific renderer (`PerbugWorldMapView`) that consumes only viewport + nodes + graph + gameplay state.

## 2) New architecture

### Layers
1. **Geo data/source layer**
   - Backend + Nominatim semantic place lookup and reverse geocode.
2. **Node generation layer**
   - `PerbugNodeWorldEngine` transforms places into tactical nodes and connections.
3. **Perbug world surface layer (new)**
   - `PerbugWorldMapEngine` builds render snapshot from viewport + nodes + graph.
   - Includes projection, visible-node filtering, edge extraction, and stylized terrain bands.
4. **Interaction/render layer (new)**
   - `PerbugWorldMapView` + custom painter for game-first visuals, gestures, and node hit-testing.
5. **Gameplay loop layer**
   - `PerbugGameController` and progression/economy systems remain unchanged and consume map selections.

### Why this is game-first
- Rendering is now authored for tactical nodes/connections instead of marker overlays on third-party tiles.
- Visual language (terrain bands, tactical links, node rings/status) is Perbug-native.
- Real place semantics still drive node labels/categories and map geography.

## 3) Performance and platform stance
- `CustomPaint` + `RepaintBoundary` keeps rendering lightweight and web/mobile compatible.
- Snapshot precomputation (`PerbugWorldMapEngine`) avoids repeated graph work during paint.
- No hard dependency on map SDK runtime for core tactical map board.

## 4) Future extension plan
- Add optional offline vector material pack (coastline polygons, biome masks) as raw geographic input.
- Move painter to retained scene/layer cache for dense node clusters.
- Add fog-of-war and server-authored world events overlays.
