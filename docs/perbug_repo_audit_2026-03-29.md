# Perbug repo audit (2026-03-29)

## Reusable systems already present
- **World node generation exists** with Nominatim-style geo pin ingest, spacing, type derivation, and graph reachability in `PerbugNodeWorldEngine`.
- **Core loop state exists** in `PerbugGameController`: initialize world -> jump/move -> launch/resolve encounter -> payout -> progression update.
- **Encounter framework exists** via modular encounter enums/status and puzzle integration (`grid_path_puzzle`).
- **Progression and retention scaffolding exists**: daily objectives, milestones, unlockables, collection progress in `perbug_progression_models.dart`.
- **Economy foundations exist**: Perbug wallet transactions/sinks/sources, resources, recipes, crafted item usage, and owned-asset provenance.
- **NFT-ready ownership architecture exists** (`OwnedAsset`, `AssetIdentity`, `AssetProvenance`, external references) without hard-gating gameplay.
- **Onboarding exists** with explicit “first move / first encounter / first reward” steps and telemetry.

## Scaffolded but not fully wired
- Visual asset pipeline references mostly rely on icon/color placeholders rather than a centralized game-art registry.
- Marketplace-ready data models exist, but dedicated in-game marketplace browsing surfaces are minimal.
- Several role labels diverge from product naming (e.g., `striker/controller` instead of `warrior/cleric` presentation).
- Resource/material/relic visuals are represented in economy systems but not consistently surfaced in map loop UI.

## Old-direction remnants
- Codebase still has **Perbug/review-platform** surfaces (reviews, places, creator media, legacy economy pages) that are orthogonal to map-native RPG shell.
- Some discovery UI and supporting repositories retain utility/review vocabulary.

## Dead or obsolete risk areas
- Legacy “Perbug Balance” and reward-ledger pages appear disconnected from the core Perbug map loop.
- Parallel map discovery/review workflows can dilute progression-first UX if exposed as primary navigation.

## Asset inventory status
- Root repo contains new Perbug source sheets (characters, portraits, nodes, encounters, resources/materials, relics, token family, HUD).
- App asset folder currently includes only a subset of curated SVG collectibles/player ring; many new sheet assets are not yet bundled into `pubspec.yaml`.

## State management and backend support
- Riverpod state management is in place for gameplay and app-level providers.
- Backend/repo scaffolding supports auth/session/rewards/reviews and can be repurposed, but game-centric services should be made primary in shell navigation.

## Where immersion currently breaks
- Tactical map board is solid, but visual identity is still mostly Material icon driven.
- Node/squad/economy screens are connected logically, but art-system cohesion is incomplete.
- Legacy screen naming/branding (“Perbug”) breaks Perbug fantasy.

## Recommended implementation order (grounded)
1. Introduce a **single asset registry layer** for node/role/resource/relic/encounter mappings with fallback-safe metadata.
2. Route map + roster rendering through this registry (even before full sprite extraction).
3. Continue removing/isolating legacy Perbug/review-first navigation from primary shell.
4. Expand marketplace UI on top of existing ownership/listing models.
5. Add integration tests for asset mapping + fallback guarantees, then iterate visual sheet extraction.
