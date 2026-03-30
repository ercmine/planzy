# Perbug Custom Rendering Engine Foundation (Stage 1)

## Current stack audit (before this change)

### Existing rendering path
- Rendering is Flutter-first and web-capable, with map visualization implemented through `CustomPainter` in `PerbugWorldMapView`. 
- There is no WebGL-specific backend yet; world rendering was effectively a 2D projected map with stylized paint layers and node markers.
- Camera state already existed (`_PerbugCameraState`) with pan/zoom gestures and wheel zoom.

### Existing world/map runtime
- `PerbugWorldMapEngine` already builds runtime snapshots from viewport + nodes + graph:
  - visibility filtering
  - graph edge extraction
  - terrain bands
  - region theme derivation
  - debug payloads
- `PerbugNodeWorldEngine` and `PerbugGameController` provide deterministic node graphs from geo/search inputs and demo fallback generation.

### Existing asset pipeline
- Asset registry exists (`PerbugAssetRegistry`) and maps gameplay node type to icon/tile references and per-type colors.
- Asset set is 2D sprite-sheet heavy and already aligns with marketplace-ready content and rarity/state based visuals.

### Existing blockers
- No owned scene graph abstraction for long-term 3D evolution.
- No formal camera rig/projection abstraction separate from widget implementation.
- No world-space representation (geo -> world xyz) for later model/mesh/FX layering.
- Hit testing depended on flat geo projection only.
- No explicit render frame object to support diagnostics, culling policy evolution, or backend swapping.

## Chosen web-first architecture

Perbug now has a **Perbug-owned rendering runtime layer** on top of the existing Flutter/web stack:

1. **World snapshot layer** (`PerbugWorldMapEngine`)
   - Geo-aware visibility, terrain themes, graph extraction.
2. **Render engine layer** (`PerbugRenderEngine`)
   - Geo -> world coordinate transformation (`PerbugGeoWorldTransformer`)
   - Camera rig projection (`PerbugCameraRig`)
   - Render-frame composition (`PerbugRenderFrame`)
   - Hit testing against projected render nodes
3. **Paint backend layer** (`PerbugWorldMapView` + painter)
   - Consumes render frame and draws terrain, links, nodes, presence, overlays.

This keeps ownership with Perbug while remaining stable on web now, with clear seams for future WebGL/CanvasKit backend splits.

## Scene graph design (stage-1 runtime form)

Stage 1 scene representation is a runtime graph payload:
- **World root**: `PerbugRenderFrame`
- **Node instances**: `PerbugRenderNode` (world + screen transforms and state)
- **Connections**: `PerbugRenderEdge`
- **Debug channel**: frame-level diagnostics map

This provides the traversal and ownership surface needed for a future explicit tree-based scene graph without locking to a third-party engine object model.

## Camera / world / input architecture

### Camera
- `PerbugCameraRig` projects Perbug world coordinates into screen-space using zoom-aware pseudo-perspective.
- Existing strategic pan/zoom controls remain authoritative and now feed render-frame generation.

### World representation
- `PerbugGeoWorldTransformer` maps real geo deltas to Perbug world-space (`x,z`) and derives stylized elevation (`y`) from node rarity/type.
- This creates a deterministic “fantasy strategy world plane” suitable for future mesh/sprite/billboard upgrades.

### Input + hit testing
- Hit testing now uses render-frame node circles (`PerbugRenderFrame.hitTest`) rather than raw map projection distance, which better matches final rendered positions.

## Demo + real-location behavior
- No regressions to fallback behavior:
  - demo mode still generates deterministic fallback nodes when real node data is unavailable
  - location-driven node snapshots still feed rendering when available
- Render engine composes frames from either source identically.

## Stage mapping

### Implemented now (Stage 1)
- Owned render-engine runtime API and data structures.
- Geo-to-world transformation and camera projection layer.
- Render frame composition and hit testing.
- Integration of runtime frame into world painter and interaction flow.
- Additional tests validating deterministic composition and hit testing.

### Next (Stage 2)
- Introduce chunk-level world sections and culling metadata into render frame.
- Add material channels (terrain/water/node glow) via layered shader-like paint config structs.
- Expand UI bridge contracts for node anchor export and overlay positioning.

### Later (Stage 3)
- Move from pseudo-3D paint to backend-abstracted draw commands that can target WebGL while preserving scene/runtime ownership.
- Introduce encounter scene renderer sharing the same engine runtime.
