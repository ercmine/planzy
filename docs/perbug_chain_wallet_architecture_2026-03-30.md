# Perbug chain + light-wallet architecture plan (2026-03-30)

## 1) Grounded audit of current codebase

### Current game economy structure
- Mobile gameplay economy currently runs in an **off-chain local-first RPG model** under `PerbugEconomyState` and `PerbugGameController`, with Perbug sinks/sources and crafting costs represented as integer game points rather than chain UTXOs.  
- `PerbugWalletState` is currently an in-app ledger abstraction (`balance`, `transactions`, `appliedActionIds`) and not a protocol wallet.  
- Economy policy is represented by `PerbugEconomyConfig` (costs, emission caps, anti-abuse caps).  

### Current token/currency representation
- App-side currency is represented in `app/lib/features/home/perbug_economy_models.dart` as:
  - `PerbugSource` and `PerbugSink`
  - `PerbugTransaction`
  - `PerbugWalletState`
- Backend-side economy uses account balances and ledger entries in `backend/src/perbugEconomy/types.ts` as bigint atomics, with service logic in `backend/src/perbugEconomy/service.ts`.

### Existing wallet/demo architecture
- Existing “wallet” flow is EVM browser-wallet connection (`wallet_connector.dart`, `wallet_page.dart`) for legacy Perbug NFT flows, not for a native Perbug chain.
- App supports clear demo-vs-live location runtime mode in the game loop (`PerbugWorldRuntimeMode.demo|real`), which is directly reusable for demo wallet mode rollout.

### Auth/account model
- Backend identity model is profile-based (`accounts/types.ts` and `accounts/service.ts`), with user/profile switching and role-based actions.
- No native chain wallet identity linkage exists yet (no address registry, no xpub binding, no proof-of-address ownership endpoint).

### Marketplace and balance services
- Marketplace model exists with currencies, listings, and settlement-rail metadata (`backend/src/perbugMarketplace/types.ts`), but is currently abstracted and not tied to a Perbug UTXO chain.
- `MarketplaceCurrency.settlementRail` already anticipates hybrid/off-chain rails and is a good seam for chain integration.

### What must change
1. Introduce a **native Perbug chain wallet domain** in app/backend (addresses, sync state, UTXO-derived balances, pending/confirmed state).  
2. Add chain-facing services: block header/indexer service, broadcast/fee estimation, deposit watcher, and settlement bridge.
3. Split economy into:
   - **on-chain treasury balances/transfers** (truth on chain)
   - **off-chain fast action ledger** (truth in game backend)
   - deterministic conversion/reconciliation rules.
4. Replace EVM-wallet-first UX as primary path with game-native “Treasury” UX and optional advanced wallet screens.

---

## 2) Recommended role of chain in the game

### On-chain responsibilities (must be chain truth)
- Wallet ownership and address control
- Deposit/withdrawal transactions
- Player-to-player value transfer
- Marketplace settlement checkpoints (final transfer out of escrow)
- Long-term ecosystem treasury/account value layer

### Off-chain responsibilities (must stay fast)
- Moment-to-moment game actions (movement, encounter actions, crafting ticks)
- Tactical combat and map interactions
- High-frequency micro-spends for immediate UX

### Hybrid bridge responsibilities
- Player has two balances:
  - **On-chain balance:** spendable in native wallet
  - **In-game spendable balance:** off-chain ledger for low-latency actions
- Flow:
  1. Deposit on-chain to a user deposit address
  2. Backend confirms N blocks and credits off-chain spendable account
  3. Gameplay spends from off-chain ledger instantly
  4. Withdrawal request burns/debits off-chain spendable and creates signed payout on-chain

This avoids “every click on-chain” while keeping value custody anchored by chain assets.

---

## 3) Bitcoin-fork chain design recommendation

## Recommended base fork: **Bitcoin Core + modern address + filter extensions**
Use current Bitcoin Core codebase as base (not legacy alt-fork code), with Perbug-specific params and mandatory support for light-wallet indexing infra.

### Parameters (v1 proposal)
- Consensus: PoW SHA-256 (phase 1), with merge-mining option in phase 2 to improve security
- Block target: **30 seconds** (game-economy friendly, still UTXO-based)
- Coin unit: `PBG`
- Supply:
  - Genesis + ecosystem reserve for rewards/ops
  - predictable emissions via halving-style schedule, tuned for ecosystem runway
- Address format: Bech32m HRP `pbg` for user addresses, separate testnet HRP
- Mempool:
  - standardness policy closer to Bitcoin, but lower relay floor for mobile-sized transfers
  - RBF enabled for stuck tx recovery
- Fees:
  - dynamic min relay fee
  - server-provided fee bands (economy/normal/fast)
  - optional fee sponsorship for selected in-game flows

### Why this base
- Maximum protocol maturity and tooling compatibility
- Existing wallet primitives (HD derivation, UTXO semantics)
- Strong path for Electrum-like light wallet support

---

## 4) Light wallet architecture recommendation

## Recommended model: **Electrum-style server-assisted light wallet + header verification on device**

### Rationale
- Better mobile UX than full SPV peer management in early product stages
- Faster sync and simpler firewall/network behavior on mobile
- Can still preserve verification of header chain and merkle proofs for key events

### Components
1. Perbug full nodes (authoritative chain)
2. Perbug Electrum/indexer cluster (address/tx history, merkle proofs, fee estimates)
3. App wallet client:
   - stores keys locally
   - syncs headers + script history via secure API/ws
   - signs transactions locally
4. Backend bridge service:
   - deposit confirmation watcher
   - game ledger credit/debit integration
   - withdrawal queue + risk checks

---

## 5) Account model recommendation

## Recommended: **Hybrid non-custodial primary + managed fallback lanes**
- Default player wallet is non-custodial in mobile app (seed-based HD wallet).
- For demo users, no seed required initially; use off-chain demo ledger.
- On activation, demo account upgrades to real wallet by creating/importing seed and binding wallet fingerprint to user identity.

### Demo -> real migration
1. Demo user plays with starter off-chain balance.
2. “Activate Treasury” prompts wallet creation/import.
3. App stores encrypted seed locally; backend stores only public wallet identifiers (xpub fingerprint), never seed.
4. Demo ledger migrates to full user account; optional claim flow mints/credits starter chain funds via faucet or progression grant policy.

---

## 6) Security model recommendation

- Seed phrase generated on-device only.
- Key material encrypted with:
  - iOS Keychain + Secure Enclave-backed key wrapping
  - Android Keystore hardware-backed where available
- App lock state with biometric/passcode gate before send.
- Transaction guardrails:
  - checksum + format validation
  - suspicious-address warning heuristics
  - explicit fee + total preview
  - soft delay/interstitial for large first-time sends
- Backup UX:
  - staged reminders until `backupStatus == confirmed`
  - restore flow supports seed import and account re-sync

---

## 7) Backend/service boundaries

### New service domains
1. **chain-node-ops**: node lifecycle, health, peers
2. **chain-indexer**: address history, tx lookup, filters/electrum responses
3. **wallet-sync-api**: mobile wallet sync, fee estimate, broadcast
4. **economy-ledger-service**: off-chain rapid ledger for gameplay
5. **settlement-service**: deposit detect/confirm, withdrawal execution, reconciliation
6. **marketplace-settlement-service**: escrow and release rules

### Core contract between services
- Chain services own blockchain truth.
- Economy ledger owns in-game action throughput.
- Settlement service is only writer that mutates both domains in a reconciled, idempotent way.

---

## 8) Wallet UX structure (game-native)

Use “Treasury” language as primary UX.

### Screens
1. Treasury HUD chip (confirmed + pending)
2. Treasury Overview (balances, sync state, quick actions)
3. Receive (current address + QR + copy)
4. Send (amount, priority, fee estimate, confirmation)
5. Activity (pending/confirmed tx timeline)
6. Backup & Recovery
7. Wallet Settings (network, explorer link, advanced diagnostics)

### UX constraints
- No blocking gameplay during sync.
- Clear sync badge: `Syncing`, `Ready`, `Connection issue`.
- Pending tx should appear immediately with calm status language.

---

## 9) On-chain vs off-chain ledger strategy

### Canonical truth
- On-chain truth: wallet UTXO balances and settlement txs.
- Off-chain truth: gameplay spendability and action-level costs.

### Reconciliation rules
- Deposits: credit off-chain only after configurable confirmations.
- Withdrawals: debit off-chain immediately, hold in “pending withdrawal,” then finalize after tx inclusion.
- Daily reconciliation job compares:
  - settlement events
  - chain-indexed tx confirmations
  - off-chain ledger deltas

---

## 10) Marketplace/payment integration

- Listing prices can remain quoted in PBG.
- Marketplace purchase path:
  - reserve funds in off-chain spendable account (instant UX)
  - settlement service handles escrow + eventual on-chain release/withdrawal when needed
- P2P transfers:
  - direct on-chain transfer from send flow
  - optional in-game instant transfer lane via backend ledger if both users are online and opted-in

---

## 11) Explorer and support tools

Must-have tooling:
- Lightweight explorer for block/tx/address pages
- Internal ops dashboard:
  - node sync lag
  - mempool depth
  - wallet-sync API p95 latency
  - deposit watcher lag
- Support tools:
  - tx lookup by hash
  - address history
  - settlement event trace by user id

---

## 12) Tests and verification plan

### Automated
- Wallet creation + restore deterministic address derivation
- Balance sync state transitions (offline -> syncing -> ready)
- Tx creation/sign/broadcast happy path and error path
- Pending->confirmed updates
- Demo->wallet upgrade migration
- Settlement consistency tests between chain events and game ledger

### Manual QA checklist
1. Fresh install -> demo mode gameplay
2. Activate Treasury -> create seed -> backup confirm
3. Receive funds -> pending + confirmed updates
4. Send funds -> fee selection + confirmation
5. App restart -> state restore
6. Restore on second device
7. Poor network -> graceful degraded mode
8. Gameplay spend unaffected while wallet sync runs

---

## 13) Code changes added in this pass

1. New app wallet state model for light-wallet architecture baseline:
   - `app/lib/features/wallet/perbug_light_wallet_models.dart`
   - includes addresses, confirmed/pending balances, tx history, sync/connection health, fee estimates, send/receive state, lock/backup state.

2. New tests:
   - `app/test/wallet/perbug_light_wallet_models_test.dart`
   - validates defaults + state serialization/restore.

---

## 14) Recommended single next implementation step

**Next step: implement backend `wallet-sync-api` skeleton + deposit watcher against a Perbug testnet node.**

### Why this should come next
- It creates the first real integration seam between chain and game backend.
- It unblocks end-to-end demo of:
  - mobile wallet sync
  - deposit detection
  - off-chain spendable crediting
- It de-risks the largest architecture unknown early (sync + settlement correctness).
