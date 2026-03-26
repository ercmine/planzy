# Dryad world-map SVG asset pipeline

## Directory structure
- `assets/game_world/collectibles/<rarity>/...svg`
- `assets/game_world/player/...svg`

## Naming
- `district_relic_*` for district-linked collectibles
- `cuisine_charm_*` for cuisine/category collectibles
- `scene_token_*` for scene and district energy tokens
- `hotspot_emblem_*` for creator/nightlife/hotspot rewards
- `player_ring_*` for unlockable avatar shells and orbit effects

## Rendering expectations
- SVG-first assets support map markers, inventory cells, profile trophies, and unlock previews.
- Dense-area spawns should aggregate with `clusterCount` rather than rendering overlapping sprites.
- Backend-linked metadata should refer to canonical place IDs and rarity tier separately from asset path.
