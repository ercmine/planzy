import type {
  EncounterContext,
  EncounterModule,
  EncounterOutcome,
  EncounterResolution,
  EncounterResolver,
  EncounterSession,
  EncounterType,
  PerbugNodeType,
  RewardBundle
} from "./types.js";

export class PerbugEncounterRegistry {
  private readonly modules = new Map<EncounterType, EncounterModule>();

  register(module: EncounterModule) {
    this.modules.set(module.type, module);
  }

  get(type: EncounterType): EncounterModule {
    const module = this.modules.get(type);
    if (!module) throw new Error(`encounter module missing for type ${type}`);
    return module;
  }

  has(type: EncounterType) {
    return this.modules.has(type);
  }
}

export class NodeEncounterResolver implements EncounterResolver {
  resolveType(context: EncounterContext): { type: EncounterType; reason: string } {
    const { node, progression, squad } = context;
    if (node.nodeType === "boss") return { type: "boss", reason: "boss node requires boss encounter" };
    if (node.nodeType === "mission") return { type: "mission", reason: "mission node maps to mission encounter" };
    if (node.nodeType === "event") return { type: "event", reason: "event node maps to event encounter" };
    if (node.nodeType === "resource") return { type: "treasure", reason: "resource node yields treasure encounter" };
    if ((node.rarity === "rare" || node.rarity === "epic") && squad.units.some((u) => u.power >= 9)) {
      return { type: "tactical", reason: "rarity + squad readiness selects tactical" };
    }
    if (progression.level >= 5 && (node.biome === "wild" || node.region.toLowerCase().includes("anomaly"))) {
      return { type: "anomaly", reason: "biome/progression combination selects anomaly" };
    }
    return { type: "puzzle", reason: "default puzzle encounter" };
  }
}

function buildReward(baseXp: number, perbug: number, resources: Record<string, number>, energy: number, unlocks?: string[]): RewardBundle {
  return { xp: baseXp, perbug, resources, energy, unlocks, missionProgress: {} };
}

export function createDefaultEncounterRegistry() {
  const registry = new PerbugEncounterRegistry();

  const fallbackEvaluate = (
    resolution: EncounterResolution,
    successState: EncounterOutcome["state"]
  ): EncounterOutcome => ({
    succeeded: resolution.actionId === "complete" || resolution.actionId === "solve",
    state: resolution.actionId === "complete" || resolution.actionId === "solve" ? successState : "failed",
    failureReason: resolution.actionId === "complete" || resolution.actionId === "solve" ? undefined : "rules_failed",
    resolution
  });

  const simpleModule = (
    type: EncounterType,
    title: string,
    description: string,
    rewardFactory: (ctx: EncounterContext, outcome: EncounterOutcome) => RewardBundle
  ): EncounterModule => ({
    type,
    buildPreview: (ctx) => ({
      title,
      description,
      risk: ctx.node.difficulty >= 5 ? "high" : ctx.node.difficulty >= 3 ? "medium" : "low",
      rewardHint: ctx.node.difficulty >= 5 ? "High-value drop chance" : "Standard payout"
    }),
    buildInitialState: (ctx) => ({ objectiveProgress: 0, target: 1 + Math.max(1, Math.floor(ctx.node.difficulty / 2)) }),
    evaluate: (_ctx, _session, resolution) => fallbackEvaluate(resolution, "completed"),
    buildReward: rewardFactory
  });

  registry.register(simpleModule("puzzle", "Signal Pattern", "Solve a pattern lock from the node uplink.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(0, 0, {}, 0);
    return buildReward(10 + ctx.node.difficulty * 4, 1, { signal_shard: 1 + Math.floor(ctx.node.difficulty / 2) }, 1);
  }));

  registry.register(simpleModule("treasure", "Resource Cache", "Recover hidden materials while avoiding traps.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(2, 0, {}, 0);
    return buildReward(8 + ctx.node.difficulty * 3, 1, { bio_dust: 2 + ctx.node.difficulty }, 1);
  }));

  registry.register(simpleModule("mission", "Field Objective", "Complete mission objectives to secure supplies.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(4, 0, {}, 0);
    return {
      ...buildReward(14 + ctx.node.difficulty * 3, 2, { mission_data: 1 }, 1),
      missionProgress: { [`mission_${ctx.node.id}`]: 1 }
    };
  }));

  registry.register(simpleModule("boss", "Apex Threat", "Defeat an elite node guardian.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(0, 0, {}, 0);
    return buildReward(30 + ctx.node.difficulty * 6, 5, { apex_core: 1 }, 2, ["boss_clear"]);
  }));

  registry.register(simpleModule("event", "Live Event", "Adapt to a timed world event in this district.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(3, 0, {}, 0);
    return buildReward(12 + ctx.node.difficulty * 3, 2, { event_token: 2 }, 1);
  }));

  registry.register(simpleModule("anomaly", "Anomaly Rift", "Stabilize anomaly energy around the node.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(2, 0, {}, 0);
    return buildReward(16 + ctx.node.difficulty * 3, 2, { anomaly_sample: 1 }, 1);
  }));

  registry.register(simpleModule("combat", "Squad Skirmish", "Win a short combat encounter.", (ctx, outcome) => {
    if (!outcome.succeeded) return buildReward(3, 0, {}, 0);
    return buildReward(18 + ctx.node.difficulty * 4, 2, { combat_parts: 1 }, 1);
  }));

  const tacticalModule: EncounterModule = {
    type: "tactical",
    buildPreview: (ctx) => ({
      title: "Tactical Challenge",
      description: "Allocate squad actions to break through node defenses.",
      risk: ctx.node.difficulty >= 4 ? "high" : "medium",
      rewardHint: "Bonus rewards for strong tactical score"
    }),
    buildInitialState: () => ({ stepsRemaining: 2, score: 0 }),
    evaluate: (_ctx, session, resolution) => {
      const actionScore = Number(resolution.score ?? 0);
      const objective = Number(session.moduleState.targetScore ?? 50);
      const succeeded = resolution.actionId === "complete" && actionScore >= objective;
      return {
        succeeded,
        state: succeeded ? "completed" : "failed",
        failureReason: succeeded ? undefined : "rules_failed",
        resolution
      };
    },
    buildReward: (ctx, outcome) => {
      if (!outcome.succeeded) return buildReward(4, 0, {}, 0);
      const score = Number(outcome.resolution.score ?? 50);
      const rareBonus = score >= 75 ? 2 : 1;
      return buildReward(16 + ctx.node.difficulty * 3, rareBonus, { signal_shard: rareBonus, tactical_chip: 1 }, 1);
    }
  };

  registry.register(tacticalModule);

  return registry;
}

export function nodeTypeToEncounterType(nodeType: PerbugNodeType): EncounterType {
  switch (nodeType) {
    case "resource": return "treasure";
    case "mission": return "mission";
    case "boss": return "boss";
    case "event": return "event";
    default: return "puzzle";
  }
}

export function computeSquadPower(context: EncounterContext): number {
  return context.squad.units.filter((u) => u.equipped).reduce((sum, u) => sum + u.power, 0);
}

export function defaultRewardPreview(context: EncounterContext, type: EncounterType): RewardBundle {
  const base = 8 + context.node.difficulty * 2;
  if (type === "boss") return buildReward(base + 20, 4, { apex_core: 1 }, 2);
  if (type === "treasure") return buildReward(base, 1, { bio_dust: 2 + context.node.difficulty }, 1);
  if (type === "mission") return buildReward(base + 4, 2, { mission_data: 1 }, 1);
  return buildReward(base, 1, { signal_shard: 1 }, 1);
}
