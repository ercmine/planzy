# Perbug Custom Earth Map Architecture (Web-first)

## 1) Current stack audit (March 30, 2026)

### Frontend map/game stack currently present
- **Rendering surface:** custom Flutter `CustomPaint` world renderer in `PerbugWorldMapView` (no embedded third-party widget map on the Perbug game surface).
- **Gameplay generation:** `PerbugNodeWorldEngine` builds deterministic node graph from geo pins + progression context.
- **Projection:** runtime equirectangular projection via `PerbugGeoProjection`.
- **Geo data source path:** app calls backend `/api/geo/*` endpoints through `RemoteMapGeoClient`, backend resolves through Nominatim-backed geo gateway.
- **Place intelligence:** map pins include canonical place IDs + category metadata from backend discovery.

### Reusable pieces
- `app/lib/features/home/perbug_node_world_engine.dart` deterministic node pipeline.
- `app/lib/features/home/map_discovery_clients.dart` clean geo client boundary.
- `backend/src/geo/http.ts` + `backend/src/geo/gateway.ts` Nominatim + nearby query contract.
- `app/lib/features/home/perbug_game_controller.dart` map-as-game loop (jump, energy, encounters, progression).

### Blocking/limiting parts found
- Region visual identity and biome expression were still relatively flat (single style family).
- No explicit region-targeting search loop in main world HUD.
- Player presence existed mostly as selected node, not a stronger avatar/influence signal.
- Route intent feedback from current node to selected node was limited.

### Replace/isolate guidance
- Keep backend geo contracts.
- Keep deterministic node engine.
- Expand custom rendering layer (already isolated at `PerbugWorldMapView`) instead of introducing another map SDK.
- Continue treating raw geographic data as gameplay input only; final visuals are Perbug-native.

## 2) Architecture decision

### Chosen architecture: **Hybrid geographic-input + fully custom game renderer**

- **Data plane:** real geography from Nominatim/nearby services provides anchors, place identity, categories, and coordinates.
- **Render plane:** Perbug-owned painter (Canvas on Flutter web/mobile) handles terrain bands, fog, tactical grid, route highlighting, node rendering, and avatar presence.
- **Game plane:** deterministic node/world generation + progression logic remains first-class and drives render state.

Why this is the best fit now:
1. Works on Flutter web without depending on weakly supported embedded map plugins.
2. Preserves app/mobile parity because the same paint pipeline runs across targets.
3. Gives deep visual ownership (Perbug style) while still grounded in real Earth coordinates.
4. Keeps map interactions tied directly to gameplay state rather than marker overlays.

## 3) Rendering pipeline summary

1. Controller obtains anchor (real location or demo fallback), reverse geocode, and nearby places.
2. Node engine deterministically builds node set + adjacency graph.
3. Map engine derives visible subset + edges + terrain bands + region theme.
4. Painter composes layers in order:
   - thematic backdrop
   - procedural terrain bands
   - fog/frontier overlay
   - tactical grid
   - graph edges
   - selected route arc
   - custom node glyphs
   - player presence + influence ring

## 4) Nominatim integration in world generation

- Nominatim-backed nearby/search/reverse endpoints provide semantic place records.
- Map pins carry canonical place IDs, categories, naming, and location context.
- Node generator scores and filters these into gameplay nodes (spacing, distance, quality, social signals).
- Metadata stores source identity (`geo_nominatim`) to keep the data lineage explicit.

## 5) Deterministic generation behavior

- Stable ID seed from canonical place identity + normalized coordinate tuple.
- Repeat runs with identical inputs produce matching node IDs and links.
- Progression and dynamic systems can still layer on top (rare/event windows, objectives).

## 6) Web compatibility notes

- Uses Flutter painting primitives only (`CustomPaint`/gestures), no platform map view dependency.
- Works in browser and native app targets with one renderer.
- Heavy GIS visuals intentionally avoided in frame-critical loop; stylization is generated procedurally.

## 7) UX/HUD integration notes

- Added region-targeting search card into main game HUD.
- Added explicit mode chip (`Demo mode anchor` vs `Live location anchor`).
- Added map pills for region identity + node count to keep map-state legible.
- Added selected route visualization and stronger player aura/range rings.

## 8) Next recommended extensions

- Cache generated region snapshots by normalized tile/seed key.
- Add anomaly/event shader layer driven by server event feed.
- Add server-side region summary endpoint (biome/faction/frontier hints).
- Add debug seed inspector panel with copyable generation signature.
