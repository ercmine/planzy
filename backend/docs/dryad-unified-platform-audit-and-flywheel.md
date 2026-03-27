# Dryad / Perbug Unified Platform Audit + Flywheel Plan

## 1) Current product audit (active repo architecture)

### Primary user journeys found
1. **Ownership lifecycle**: `/v1/dryad/trees` -> claim/plant -> water -> list -> buy -> dig up -> replant.
2. **Creator support lifecycle**: creator video -> `/v1/dryad/tips/videos/:videoId/intents` -> submit ETH transfer.
3. **Marketplace lifecycle**: listing list endpoint and buy endpoint.
4. **Rewards/economy lifecycle**: creator rewards, competition, dryad economy, viewer rewards.

### Fragmentation points / loop breaks
- **No cohesive world snapshot API** tying map, market, tend, creator, and progression in one response.
- **No explicit Tend queue model** prioritizing urgent owner actions.
- **No first-class return trigger surface** (watchlist movement, tree needs water, tree listed/sold signals).
- **Creator tree identity is implied** but not surfaced as dedicated creator-tree objects.
- **Marketplace pulse/trending is implicit** but not separated into reusable live feed contracts.
- **Progression milestones not explicit** in the tree ownership loop.
- **Loop instrumentation lacked a compact flywheel KPI endpoint** for first-plant/first-water/first-buy/first-replant/repeat-tending.

## 2) Core product flywheel definition

### Flywheel A — Ownership
Discover tree -> claim+plant -> tend/water -> optional list/sell -> dig up -> replant -> discover new world state -> repeat.

### Flywheel B — Creator support
Creator tree/video discovery -> water/tip creator tree -> creator support momentum rises -> creator identity strengthens -> users revisit creator trees.

### Flywheel C — World map
Map pulse surfaces fresh planting/replanting and active regions -> users explore -> claim/support/trade trees -> map changes.

### Flywheel D — Marketplace
Live listings + sold velocity + trending trees -> buying activity -> relocation/replant lifecycle -> fresh scarcity + location uniqueness.

### Flywheel E — Habit/return
Tend queue urgency + watchlist movement + support received + milestone proximity -> repeated sessions.

## 3) What was implemented in this change set

### New unified APIs
- `GET /v1/dryad/world` (single cohesive ecosystem response).
- `GET /v1/dryad/map/pulse` (map-native liveness).
- `GET /v1/dryad/market/pulse` (marketplace liveness).
- `GET /v1/dryad/creators/trees` (creator-tree social identity).
- `GET /v1/dryad/tend?wallet=...` (prioritized tend queue).
- `GET /v1/dryad/progression?wallet=...` (collection/progression snapshot).
- `GET /v1/dryad/return-triggers?wallet=...` (meaningful re-engagement triggers).
- `POST /v1/dryad/watch` + `DELETE /v1/dryad/watch` (watchlist loop).
- `GET /v1/dryad/metrics/loops` (core loop instrumentation view).

### Cohesion model
- Map, Tend, Marketplace, My Trees, Creator tree identity, and progression now derive from one dryad service state machine and lifecycle stream.
- Loop metrics and return triggers are generated from real tree/lifecycle data in active flows.
- No fake UI seed data added to new active API surfaces.

## 4) IA and navigation implications for clients

Recommend primary app tabs remain:
1. **Map** (backed by `/v1/dryad/world` + `/v1/dryad/map/pulse`)
2. **Tend** (`/v1/dryad/tend`, `/v1/dryad/return-triggers`, `/v1/dryad/progression`)
3. **Marketplace** (`/v1/dryad/market/listings`, `/v1/dryad/market/pulse`)
4. **My Trees** (`/v1/dryad/trees/owned`, progression + watchlist)
5. **Creator/Profile** (`/v1/dryad/creators/trees` + tip summaries)

This preserves a tree-first mental model while letting each tab feed the same loop engine.
