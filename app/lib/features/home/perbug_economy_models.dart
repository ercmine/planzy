import 'dart:convert';

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
  });

  factory PerbugEconomyState.initial() => const PerbugEconomyState(
        inventory: Inventory(stacks: {'ore': 0, 'scrap': 0, 'signal_shard': 0}),
        unlockedRecipeIds: {'field_kit', 'upgrade_module'},
        sessions: [],
        sourceLedger: [],
      );

  final Inventory inventory;
  final Set<String> unlockedRecipeIds;
  final List<CraftingSession> sessions;
  final List<Map<String, Object>> sourceLedger;

  PerbugEconomyState copyWith({
    Inventory? inventory,
    Set<String>? unlockedRecipeIds,
    List<CraftingSession>? sessions,
    List<Map<String, Object>>? sourceLedger,
  }) {
    return PerbugEconomyState(
      inventory: inventory ?? this.inventory,
      unlockedRecipeIds: unlockedRecipeIds ?? this.unlockedRecipeIds,
      sessions: sessions ?? this.sessions,
      sourceLedger: sourceLedger ?? this.sourceLedger,
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
      };

  factory PerbugEconomyState.fromEncoded(String raw) {
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final sessionsRaw = (json['sessions'] as List?) ?? const [];
    final unlockedRaw = (json['unlockedRecipeIds'] as List?) ?? const [];
    final ledgerRaw = (json['sourceLedger'] as List?) ?? const [];
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
    );
  }
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
