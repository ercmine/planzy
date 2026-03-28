# Perbug NFT-Ready Architecture (Game-First, Optional Ownership Layer)

## Current architecture audit

### Existing systems
- **Squad/unit system**: `PerbugUnit`, `SquadState`, and `UnitProgression` power core encounter viability and squad loadouts. Core assignment and progression logic is gameplay-first and chain-independent.
- **Inventory/resource economy**: `Inventory` and `PerbugEconomyState` store stackable crafting/progression resources and wallet transaction history.
- **Marketplace surface**: Dryad has marketplace APIs/UI; Perbug strategy map did not yet have a unified owned-asset provenance model for a future hybrid market.
- **Wallet and chain linkage**: Existing wallet concepts exist in other features (rewards/dryad), but Perbug core loop could not model optional wallet linkage without custom ad-hoc fields.
- **NFT-related scaffolding**: `UnitNftLink` existed but was unit-only and not generalized to relics, cosmetics, items, or map assets.

### Gaps addressed by this change
- Missing explicit ownership-source taxonomy across asset classes.
- Missing normalized asset identity model that supports stackable and unique instances.
- Missing inventory container for optional collectible assets coexisting with core resources.
- Missing wallet-link fallback state in Perbug economy model.
- Missing marketplace-neutral listing model that can represent both game-native and chain-backed listings.

## Ownership/provenance domain model

Implemented in `app/lib/features/home/perbug_asset_models.dart`:

- `OwnershipSource`
  - `starter`, `earned`, `crafted`, `rewarded`, `event`, `premium`, `importedNft`, `chainMinted`, `marketplaceAcquired`.
- `AssetClass`
  - `character`, `item`, `relic`, `cosmetic`, `mapAsset`, `collectible`.
- `AssetIdentity`
  - canonical game identity with `assetClass`, `templateId`, `instanceId`, optional `variantId`, and `stackBehavior`.
- `AssetProvenance`
  - source + optional external chain linkage through `ExternalAssetReference`.
- `OwnedAsset`
  - gameplay/cosmetic payload that combines identity + provenance.
- `AssetInventory`
  - mixed inventory for unique and stackable owned assets.
- `MarketplaceListing`
  - listing abstraction that distinguishes chain-backed vs game-native assets without forcing NFT-only assumptions.
- `WalletLinkState`
  - explicit optional wallet connectivity boundary with safe fallback behavior.
- `MapAssetAttachment` and `SquadAssetBinding`
  - extension points for map/territory assets and squad-level provenance-aware representation.

## Integration details

### Squad integration
- `PerbugUnit` now accepts optional `assetIdentity` and `assetProvenance` while preserving existing fields.
- Added derived `resolvedAssetIdentity` and `resolvedProvenance` to keep older units valid and auto-migrate behavior at read-time.
- `isChainBacked` is derived from provenance, so gameplay logic does not require NFT-specific branching.

### Inventory integration
- `PerbugEconomyState` now stores:
  - `ownedAssets: AssetInventory` for optional collectible/NFT-ready entities.
  - `walletLink: WalletLinkState` for optional wallet linkage and sync state.
- JSON serialization/deserialization includes these new fields with resilient defaults.

### Marketplace integration
- Introduced `MarketplaceListing` model (chain-backed or not), enabling future marketplace APIs/UI to support both in-game and NFT-backed listings from one shape.

### Map asset readiness
- Added `MapAssetAttachment` as a map-node linkable owned-asset model for optional future landmark/territory/decorative ownership.

### Wallet linkage boundaries
- Added `WalletLinkState.disconnected` default to ensure gameplay does not depend on connected wallets.
- `canImportAssets` is explicit and gated only for import/sync flows.

### UI/UX updates
- Perbug game page now shows:
  - Owned asset count.
  - Wallet optional/linked indicator.
  - Provenance-aware roster labels (`resolvedProvenance.source`).
  - Optional collectibles/provenance section that does not devalue non-NFT progression.

## Fallback/anti-fragility behavior
- No wallet: core squad/inventory/encounters still work.
- No external metadata: assets still function through local `AssetIdentity`/`AssetProvenance` defaults.
- No imported assets: owned-asset inventory can remain empty with no gameplay regression.
- Chain linkage failures are represented by `AssetLinkStatus` rather than crashing core systems.

## Test coverage added
- Starter squad remains fully playable with no NFT linkage.
- Mixed inventory supports stackable game-native assets plus unique chain-backed assets.
- Economy serialization preserves optional wallet state and owned assets.
- Marketplace listing model supports both chain-backed and non-chain-backed assets.

## How future NFT assets plug in
- **Characters**: attach `AssetProvenance.externalReference` and optional cosmetic payload.
- **Items/relics**: represent as `OwnedAsset` with `AssetClass.item/relic`; unique stack behavior for NFTs.
- **Cosmetics**: `AssetClass.cosmetic` with gameplay-neutral cosmetic payload.
- **Map assets**: attach via `MapAssetAttachment` without gating traversal/progression.
- **Import/sync**: wallet-linked ingestion populates `ownedAssets` and provenance references, while base systems continue to read `resolved*` identity/provenance safely.
