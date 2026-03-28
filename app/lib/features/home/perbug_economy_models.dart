import 'dart:convert';

import 'perbug_asset_models.dart';

enum ResourceCategory {
  basicMaterial,
  refinedComponent,
  upgradeMaterial,
  consumableIngredient,
  craftingCatalyst,
  progressionItem,
  strategic,
}

enum ResourceRarity { common, uncommon, rare, epic }

enum ResourceSource {
  nodeEncounter,
  resourceNode,
  missionNode,
  bossNode,
  crafting,
  consumableUse,
  squadUpgrade,
}

enum PerbugSource {
  nodeClear,
  encounter,
  mission,
  milestone,
  progressionStep,
  eventReward,
}

enum PerbugSink {
  movement,
  nodeAccess,
  upgrade,
  crafting,
  reroll,
  scouting,
  eventEntry,
  premiumProgression,
}

enum PerbugTransactionType { reward, spend }

enum PerbugActionType {
  movement,
  nodeAccess,
  upgrade,
  crafting,
  reroll,
  scouting,
  eventEntry,
  premiumProgression,
}

class PerbugActionCost {
  const PerbugActionCost({
    required this.action,
    required this.baseCost,
    this.rarityMultiplier = 0,
    this.distanceDivisorMeters = 0,
    this.levelDiscountStep = 0,
    this.maxDiscount = 0,
  });

  final PerbugActionType action;
  final int baseCost;
  final double rarityMultiplier;
  final int distanceDivisorMeters;
  final int levelDiscountStep;
  final int maxDiscount;
}

class PerbugEmissionPolicy {
  const PerbugEmissionPolicy({
    required this.dailySourceCap,
    required this.minNodeDifficultyForReward,
    required this.trivialActionReward,
  });

  final Map<PerbugSource, int> dailySourceCap;
  final int minNodeDifficultyForReward;
  final int trivialActionReward;
}

class PerbugAntiAbusePolicy {
  const PerbugAntiAbusePolicy({
    required this.dailySpendActionCap,
    required this.requireUniqueActionId,
  });

  final Map<PerbugSink, int> dailySpendActionCap;
  final bool requireUniqueActionId;
}

class PerbugEconomyConfig {
  const PerbugEconomyConfig({
    required this.actionCosts,
    required this.emissionPolicy,
    required this.antiAbusePolicy,
  });

  factory PerbugEconomyConfig.defaults() => const PerbugEconomyConfig(
        actionCosts: {
          PerbugActionType.movement: PerbugActionCost(action: PerbugActionType.movement, baseCost: 1, distanceDivisorMeters: 650),
          PerbugActionType.nodeAccess: PerbugActionCost(action: PerbugActionType.nodeAccess, baseCost: 1, rarityMultiplier: 2.4),
          PerbugActionType.upgrade: PerbugActionCost(action: PerbugActionType.upgrade, baseCost: 2, levelDiscountStep: 5, maxDiscount: 2),
          PerbugActionType.crafting: PerbugActionCost(action: PerbugActionType.crafting, baseCost: 1),
          PerbugActionType.reroll: PerbugActionCost(action: PerbugActionType.reroll, baseCost: 3),
          PerbugActionType.scouting: PerbugActionCost(action: PerbugActionType.scouting, baseCost: 2),
          PerbugActionType.eventEntry: PerbugActionCost(action: PerbugActionType.eventEntry, baseCost: 4),
          PerbugActionType.premiumProgression: PerbugActionCost(action: PerbugActionType.premiumProgression, baseCost: 5),
        },
        emissionPolicy: PerbugEmissionPolicy(
          dailySourceCap: {
            PerbugSource.nodeClear: 40,
            PerbugSource.encounter: 80,
            PerbugSource.mission: 55,
            PerbugSource.milestone: 60,
            PerbugSource.progressionStep: 50,
            PerbugSource.eventReward: 90,
          },
          minNodeDifficultyForReward: 2,
          trivialActionReward: 0,
        ),
        antiAbusePolicy: PerbugAntiAbusePolicy(
          dailySpendActionCap: {
            PerbugSink.reroll: 18,
            PerbugSink.scouting: 28,
            PerbugSink.eventEntry: 12,
            PerbugSink.premiumProgression: 6,
          },
          requireUniqueActionId: true,
        ),
      );

  final Map<PerbugActionType, PerbugActionCost> actionCosts;
  final PerbugEmissionPolicy emissionPolicy;
  final PerbugAntiAbusePolicy antiAbusePolicy;
}

class PerbugTransaction {
  const PerbugTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceAfter,
    required this.createdAt,
    this.source,
    this.sink,
    this.actionId,
    this.metadata = const <String, Object>{},
  });

  final String id;
  final PerbugTransactionType type;
  final int amount;
  final int balanceAfter;
  final DateTime createdAt;
  final PerbugSource? source;
  final PerbugSink? sink;
  final String? actionId;
  final Map<String, Object> metadata;
}

class PerbugWalletState {
  const PerbugWalletState({
    required this.balance,
    required this.transactions,
    required this.appliedActionIds,
  });

  factory PerbugWalletState.initial() => const PerbugWalletState(balance: 12, transactions: [], appliedActionIds: {});

  final int balance;
  final List<PerbugTransaction> transactions;
  final Set<String> appliedActionIds;

  PerbugWalletState copyWith({
    int? balance,
    List<PerbugTransaction>? transactions,
    Set<String>? appliedActionIds,
  }) {
    return PerbugWalletState(
      balance: balance ?? this.balance,
      transactions: transactions ?? this.transactions,
      appliedActionIds: appliedActionIds ?? this.appliedActionIds,
    );
  }
}

enum RecipeCategory { gear, consumable, upgrade, progression }

enum RecipeVisibility { visible, hidden, locked }

class ResourceDefinition {
  const ResourceDefinition({
    required this.id,
    required this.label,
    required this.category,
    required this.rarity,
    required this.description,
    this.biomes = const <String>{},
    this.isPerbug = false,
  });

  final String id;
  final String label;
  final ResourceCategory category;
  final ResourceRarity rarity;
  final String description;
  final Set<String> biomes;
  final bool isPerbug;
}

class ResourceStack {
  const ResourceStack({required this.resourceId, required this.amount});

  final String resourceId;
  final int amount;
}

class Inventory {
  const Inventory({required this.stacks});

  final Map<String, int> stacks;

  factory Inventory.empty() => const Inventory(stacks: {});

  int quantityOf(String resourceId) => stacks[resourceId] ?? 0;

  bool has(ResourceStack stack) => quantityOf(stack.resourceId) >= stack.amount;

  bool canAfford(List<ResourceStack> costs) => costs.every(has);

  Inventory add(ResourceStack stack) {
    if (stack.amount <= 0) return this;
    return Inventory(stacks: {...stacks, stack.resourceId: quantityOf(stack.resourceId) + stack.amount});
  }

  Inventory remove(ResourceStack stack) {
    if (stack.amount <= 0) return this;
    final current = quantityOf(stack.resourceId);
    final next = current - stack.amount;
    if (next < 0) {
      throw StateError('Negative inventory is not allowed for ${stack.resourceId}');
    }
    final updated = <String, int>{...stacks};
    if (next == 0) {
      updated.remove(stack.resourceId);
    } else {
      updated[stack.resourceId] = next;
    }
    return Inventory(stacks: updated);
  }

  Map<String, dynamic> toJson() => {'stacks': stacks};

  factory Inventory.fromJson(Map<String, dynamic> json) {
    final rawStacks = (json['stacks'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    return Inventory(
      stacks: {
        for (final entry in rawStacks.entries)
          entry.key: (entry.value as num?)?.toInt() ?? 0,
      },
    );
  }
}

class RecipeInput {
  const RecipeInput({required this.resourceId, required this.amount});

  final String resourceId;
  final int amount;

  ResourceStack toStack() => ResourceStack(resourceId: resourceId, amount: amount);
}

class RecipeOutput {
  const RecipeOutput({required this.resourceId, required this.amount});

  final String resourceId;
  final int amount;

  ResourceStack toStack() => ResourceStack(resourceId: resourceId, amount: amount);
}

class CraftingRecipe {
  const CraftingRecipe({
    required this.id,
    required this.label,
    required this.category,
    required this.inputs,
    required this.outputs,
    required this.perbugCost,
    required this.energyCost,
    this.unlockLevel = 1,
    this.visibility = RecipeVisibility.visible,
  });

  final String id;
  final String label;
  final RecipeCategory category;
  final List<RecipeInput> inputs;
  final List<RecipeOutput> outputs;
  final int perbugCost;
  final int energyCost;
  final int unlockLevel;
  final RecipeVisibility visibility;
}

class CraftingSession {
  const CraftingSession({
    required this.recipeId,
    required this.createdAt,
    required this.succeeded,
    required this.error,
  });

  final String recipeId;
  final DateTime createdAt;
  final bool succeeded;
  final String? error;
}

class EconomyBalance {
  const EconomyBalance({required this.perbug, required this.energy});

  final int perbug;
  final int energy;
}

class PerbugEconomyState {
  const PerbugEconomyState({
    required this.inventory,
    required this.unlockedRecipeIds,
    required this.sessions,
    required this.sourceLedger,
    required this.wallet,
    required this.config,
    this.ownedAssets = AssetInventory.empty,
    this.walletLink = WalletLinkState.disconnected,
  });

  factory PerbugEconomyState.initial() => const PerbugEconomyState(
        inventory: Inventory(stacks: {'ore': 0, 'scrap': 0, 'signal_shard': 0}),
        unlockedRecipeIds: {'field_kit', 'upgrade_module'},
        sessions: [],
        sourceLedger: [],
        wallet: PerbugWalletState.initial(),
        config: PerbugEconomyConfig.defaults(),
        ownedAssets: AssetInventory.empty,
        walletLink: WalletLinkState.disconnected,
      );

  final Inventory inventory;
  final Set<String> unlockedRecipeIds;
  final List<CraftingSession> sessions;
  final List<Map<String, Object>> sourceLedger;
  final PerbugWalletState wallet;
  final PerbugEconomyConfig config;
  final AssetInventory ownedAssets;
  final WalletLinkState walletLink;

  PerbugEconomyState copyWith({
    Inventory? inventory,
    Set<String>? unlockedRecipeIds,
    List<CraftingSession>? sessions,
    List<Map<String, Object>>? sourceLedger,
    PerbugWalletState? wallet,
    PerbugEconomyConfig? config,
    AssetInventory? ownedAssets,
    WalletLinkState? walletLink,
  }) {
    return PerbugEconomyState(
      inventory: inventory ?? this.inventory,
      unlockedRecipeIds: unlockedRecipeIds ?? this.unlockedRecipeIds,
      sessions: sessions ?? this.sessions,
      sourceLedger: sourceLedger ?? this.sourceLedger,
      wallet: wallet ?? this.wallet,
      config: config ?? this.config,
      ownedAssets: ownedAssets ?? this.ownedAssets,
      walletLink: walletLink ?? this.walletLink,
    );
  }

  Map<String, dynamic> toJson() => {
        'inventory': inventory.toJson(),
        'unlockedRecipeIds': unlockedRecipeIds.toList(growable: false),
        'sessions': sessions
            .map((session) => {
                  'recipeId': session.recipeId,
                  'createdAt': session.createdAt.toIso8601String(),
                  'succeeded': session.succeeded,
                  'error': session.error,
                })
            .toList(growable: false),
        'sourceLedger': sourceLedger,
        'wallet': {
          'balance': wallet.balance,
          'appliedActionIds': wallet.appliedActionIds.toList(growable: false),
          'transactions': wallet.transactions
              .map(
                (tx) => {
                  'id': tx.id,
                  'type': tx.type.name,
                  'amount': tx.amount,
                  'balanceAfter': tx.balanceAfter,
                  'createdAt': tx.createdAt.toIso8601String(),
                  'source': tx.source?.name,
                  'sink': tx.sink?.name,
                  'actionId': tx.actionId,
                  'metadata': tx.metadata,
                },
              )
              .toList(growable: false),
        },
        'ownedAssets': ownedAssets.toJson(),
        'walletLink': {
          'isConnected': walletLink.isConnected,
          'walletAddress': walletLink.walletAddress,
          'lastSyncStatus': walletLink.lastSyncStatus.name,
        },
      };

  factory PerbugEconomyState.fromEncoded(String raw) {
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final sessionsRaw = (json['sessions'] as List?) ?? const [];
    final unlockedRaw = (json['unlockedRecipeIds'] as List?) ?? const [];
    final ledgerRaw = (json['sourceLedger'] as List?) ?? const [];
    final walletRaw = (json['wallet'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    final walletTransactions = (walletRaw['transactions'] as List?) ?? const [];
    final walletLinkRaw = (json['walletLink'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    return PerbugEconomyState(
      inventory: Inventory.fromJson((json['inventory'] as Map?)?.cast<String, dynamic>() ?? const {}),
      unlockedRecipeIds: unlockedRaw.map((entry) => entry.toString()).toSet(),
      sessions: sessionsRaw
          .whereType<Map>()
          .map(
            (entry) => CraftingSession(
              recipeId: entry['recipeId']?.toString() ?? '',
              createdAt: DateTime.tryParse(entry['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
              succeeded: entry['succeeded'] == true,
              error: entry['error']?.toString(),
            ),
          )
          .toList(growable: false),
      sourceLedger: ledgerRaw.whereType<Map>().map((e) => e.cast<String, Object>()).toList(growable: false),
      wallet: PerbugWalletState(
        balance: (walletRaw['balance'] as num?)?.toInt() ?? 12,
        appliedActionIds: ((walletRaw['appliedActionIds'] as List?) ?? const []).map((e) => e.toString()).toSet(),
        transactions: walletTransactions
            .whereType<Map>()
            .map(
              (entry) => PerbugTransaction(
                id: entry['id']?.toString() ?? '',
                type: PerbugTransactionType.values.firstWhere(
                  (v) => v.name == entry['type']?.toString(),
                  orElse: () => PerbugTransactionType.reward,
                ),
                amount: (entry['amount'] as num?)?.toInt() ?? 0,
                balanceAfter: (entry['balanceAfter'] as num?)?.toInt() ?? 0,
                createdAt: DateTime.tryParse(entry['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
                source: _parsePerbugSource(entry['source']?.toString()),
                sink: _parsePerbugSink(entry['sink']?.toString()),
                actionId: entry['actionId']?.toString(),
                metadata: (entry['metadata'] as Map?)?.cast<String, Object>() ?? const <String, Object>{},
              ),
            )
            .toList(growable: false),
      ),
      config: PerbugEconomyConfig.defaults(),
      ownedAssets: AssetInventory.fromJson((json['ownedAssets'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{}),
      walletLink: WalletLinkState(
        isConnected: walletLinkRaw['isConnected'] == true,
        walletAddress: walletLinkRaw['walletAddress']?.toString(),
        lastSyncStatus: AssetLinkStatus.values.firstWhere(
          (value) => value.name == walletLinkRaw['lastSyncStatus']?.toString(),
          orElse: () => AssetLinkStatus.notLinked,
        ),
      ),
    );
  }
}

PerbugSource? _parsePerbugSource(String? raw) {
  for (final source in PerbugSource.values) {
    if (source.name == raw) return source;
  }
  return null;
}

PerbugSink? _parsePerbugSink(String? raw) {
  for (final sink in PerbugSink.values) {
    if (sink.name == raw) return sink;
  }
  return null;
}

const Map<String, ResourceDefinition> perbugResourceDefinitions = {
  'perbug': ResourceDefinition(
    id: 'perbug',
    label: 'Perbug',
    category: ResourceCategory.strategic,
    rarity: ResourceRarity.uncommon,
    description: 'Strategic fuel and catalyst used for crafting and progression sinks.',
    isPerbug: true,
  ),
  'ore': ResourceDefinition(
    id: 'ore',
    label: 'Ore',
    category: ResourceCategory.basicMaterial,
    rarity: ResourceRarity.common,
    description: 'Raw world material gathered from industrial and metro nodes.',
  ),
  'crystal': ResourceDefinition(
    id: 'crystal',
    label: 'Crystal',
    category: ResourceCategory.basicMaterial,
    rarity: ResourceRarity.uncommon,
    description: 'High resonance shard from rare encounters.',
  ),
  'scrap': ResourceDefinition(
    id: 'scrap',
    label: 'Scrap',
    category: ResourceCategory.basicMaterial,
    rarity: ResourceRarity.common,
    description: 'Broken components that can be refined into useful modules.',
  ),
  'bio_matter': ResourceDefinition(
    id: 'bio_matter',
    label: 'Bio-Matter',
    category: ResourceCategory.consumableIngredient,
    rarity: ResourceRarity.common,
    description: 'Organic substrate used in recovery consumables.',
  ),
  'relic_shard': ResourceDefinition(
    id: 'relic_shard',
    label: 'Relic Shard',
    category: ResourceCategory.progressionItem,
    rarity: ResourceRarity.rare,
    description: 'Ancient progression shard used for high-tier unlocks.',
  ),
  'fuel_cell': ResourceDefinition(
    id: 'fuel_cell',
    label: 'Fuel Cell',
    category: ResourceCategory.craftingCatalyst,
    rarity: ResourceRarity.uncommon,
    description: 'Catalytic cell used to stabilize high-power crafting.',
  ),
  'circuit': ResourceDefinition(
    id: 'circuit',
    label: 'Circuit',
    category: ResourceCategory.refinedComponent,
    rarity: ResourceRarity.uncommon,
    description: 'Refined component feeding squad upgrade systems.',
  ),
  'essence': ResourceDefinition(
    id: 'essence',
    label: 'Essence',
    category: ResourceCategory.upgradeMaterial,
    rarity: ResourceRarity.rare,
    description: 'Concentrated upgrade material for squad modules.',
  ),
  'field_kit': ResourceDefinition(
    id: 'field_kit',
    label: 'Field Kit',
    category: ResourceCategory.progressionItem,
    rarity: ResourceRarity.uncommon,
    description: 'Consumable kit that restores map energy for node traversal.',
  ),
  'upgrade_module': ResourceDefinition(
    id: 'upgrade_module',
    label: 'Upgrade Module',
    category: ResourceCategory.upgradeMaterial,
    rarity: ResourceRarity.uncommon,
    description: 'Applied to squad upgrades as a real economy sink.',
  ),
};

const List<CraftingRecipe> perbugCraftingRecipes = [
  CraftingRecipe(
    id: 'field_kit',
    label: 'Craft Field Kit',
    category: RecipeCategory.consumable,
    perbugCost: 2,
    energyCost: 1,
    inputs: [RecipeInput(resourceId: 'bio_matter', amount: 2), RecipeInput(resourceId: 'scrap', amount: 1)],
    outputs: [RecipeOutput(resourceId: 'field_kit', amount: 1)],
  ),
  CraftingRecipe(
    id: 'upgrade_module',
    label: 'Forge Upgrade Module',
    category: RecipeCategory.upgrade,
    perbugCost: 3,
    energyCost: 1,
    inputs: [RecipeInput(resourceId: 'ore', amount: 2), RecipeInput(resourceId: 'circuit', amount: 1)],
    outputs: [RecipeOutput(resourceId: 'upgrade_module', amount: 1)],
  ),
  CraftingRecipe(
    id: 'relic_key',
    label: 'Assemble Relic Key',
    category: RecipeCategory.progression,
    perbugCost: 5,
    energyCost: 2,
    unlockLevel: 3,
    visibility: RecipeVisibility.locked,
    inputs: [RecipeInput(resourceId: 'relic_shard', amount: 2), RecipeInput(resourceId: 'fuel_cell', amount: 1)],
    outputs: [RecipeOutput(resourceId: 'essence', amount: 2)],
  ),
];
