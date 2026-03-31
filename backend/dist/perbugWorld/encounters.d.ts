import type { EncounterContext, EncounterModule, EncounterResolver, EncounterType, PerbugNodeType, RewardBundle } from "./types.js";
export declare class PerbugEncounterRegistry {
    private readonly modules;
    register(module: EncounterModule): void;
    get(type: EncounterType): EncounterModule;
    has(type: EncounterType): boolean;
}
export declare class NodeEncounterResolver implements EncounterResolver {
    resolveType(context: EncounterContext): {
        type: EncounterType;
        reason: string;
    };
}
export declare function createDefaultEncounterRegistry(): PerbugEncounterRegistry;
export declare function nodeTypeToEncounterType(nodeType: PerbugNodeType): EncounterType;
export declare function computeSquadPower(context: EncounterContext): number;
export declare function defaultRewardPreview(context: EncounterContext, type: EncounterType): RewardBundle;
