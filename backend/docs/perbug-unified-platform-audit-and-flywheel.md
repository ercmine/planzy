# Perbug / Perbug Unified Platform Audit + Flywheel Plan

## 1) Current product audit (active repo architecture)

### Primary user journeys found
1. **Ownership lifecycle**: `/v1/perbug/trees` -> claim/plant -> water -> list -> buy -> dig up -> replant.
2. **Creator support lifecycle**: creator video -> `/v1/perbug/tips/videos/:videoId/intents` -> submit ETH transfer.
3. **Marketplace lifecycle**: listing list endpoint and buy endpoint.
4. **Rewards/economy lifecycle**: creator rewards, competition, perbug economy, viewer rewards.

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
- `GET /v1/perbug/world` (single cohesive ecosystem response).
- `GET /v1/perbug/map/pulse` (map-native liveness).
- `GET /v1/perbug/market/pulse` (marketplace liveness).
- `GET /v1/perbug/creators/trees` (creator-tree social identity).
- `GET /v1/perbug/tend?wallet=...` (prioritized tend queue).
- `GET /v1/perbug/progression?wallet=...` (collection/progression snapshot).
- `GET /v1/perbug/return-triggers?wallet=...` (meaningful re-engagement triggers).
- `POST /v1/perbug/watch` + `DELETE /v1/perbug/watch` (watchlist loop).
- `GET /v1/perbug/metrics/loops` (core loop instrumentation view).

### Cohesion model
- Map, Tend, Marketplace, My Trees, Creator tree identity, and progression now derive from one perbug service state machine and lifecycle stream.
- Loop metrics and return triggers are generated from real tree/lifecycle data in active flows.
- No fake UI seed data added to new active API surfaces.

## 4) IA and navigation implications for clients

Recommend primary app tabs remain:
1. **Map** (backed by `/v1/perbug/world` + `/v1/perbug/map/pulse`)
2. **Tend** (`/v1/perbug/tend`, `/v1/perbug/return-triggers`, `/v1/perbug/progression`)
3. **Marketplace** (`/v1/perbug/market/listings`, `/v1/perbug/market/pulse`)
4. **My Trees** (`/v1/perbug/trees/owned`, progression + watchlist)
5. **Creator/Profile** (`/v1/perbug/creators/trees` + tip summaries)

This preserves a tree-first mental model while letting each tab feed the same loop engine.
