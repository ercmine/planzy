# Perbug World Hierarchy Generation Audit + Design

## Current generation stack audit (before this change)

- **Chunk inputs**: the Perbug backend currently generated a small node pool from `lat/lng` in `buildSeedNodes`, but did not include chunk IDs, bounds, or inherited macro context. Generation was local and per-request.  
- **Seam coherence**: no explicit seam system existed in backend world generation; continuity came only from deterministic offsets around the requested anchor point.  
- **Terrain/biome/path/node logic**: node `biome`, `region`, `rarity`, and `difficulty` were hard-coded defaults in `buildSeedNodes`, with encounter selection deriving from node type/rarity/biome in `NodeEncounterResolver`.  
- **Large world zones**: no explicit macro-region/district/faction/progression model existed.  
- **Landmarks**: landmarks were represented indirectly by node labels only; there was no landmark influence field affecting generation.  
- **Demo vs real-location seeds**: there was no explicit world seed model; location values implicitly changed node IDs/positions.

## Hierarchy added in this change

Introduced a deterministic hierarchy above local nodes/chunks:

1. `worldSeed` (demo/real derivation)
2. `WorldMacroRegion` (large area identity)
3. `WorldDistrict` (sub-region identity)
4. `WorldBiomeBand` (macro biome field)
5. `WorldFactionZone` (influence ownership)
6. `WorldProgressionBand` (danger + rarity tendency)
7. `RegionInfluenceField` (landmark/path/resource/event biases)
8. `ChunkRegionContext` (per-chunk inherited context consumed by node generation)

## Plug-in points

- `buildSeedNodes` now computes one deterministic world seed and resolves per-node `ChunkRegionContext`, then derives node region/biome/rarity/difficulty and macro metadata from the hierarchy.
- This is compatible with existing Perbug world runtime because nodes remain the same shape plus optional macro metadata fields.
- Encounter generation keeps working and now benefits from richer macro-driven biome/region inputs.

## Continuity approach

- Hierarchy uses deterministic hash-based value noise sampled in world space.
- Macro and district cells span multiple chunks.
- Biome/faction/influence fields use smooth interpolation so adjacent chunks transition coherently.
