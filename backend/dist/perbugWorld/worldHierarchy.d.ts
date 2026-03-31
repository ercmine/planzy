export type WorldBiomeBandType = "enchanted_forest_belt" | "crystal_plains" | "marshy_lowlands" | "ruin_laced_highlands" | "urban_sprawl_band" | "coast_water_influence" | "sacred_grove_corridor" | "anomaly_frontier";
export type WorldDistrictType = "urban_cluster" | "village_ring" | "woodland_corridor" | "relic_basin" | "mission_frontier" | "anomaly_belt" | "merchant_district" | "high_threat_zone" | "peaceful_rest_district";
export type WorldFactionType = "merchant_guild" | "mission_control" | "relic_hunters" | "wild_hostiles" | "anomaly_cabal";
export interface WorldMacroRegion {
    id: string;
    name: string;
    climateBias: "temperate" | "humid" | "arid" | "storm";
    mood: "settled" | "frontier" | "mystic" | "contested";
    terrainTint: string;
}
export interface WorldDistrict {
    id: string;
    name: string;
    districtType: WorldDistrictType;
    flavorText: string;
}
export interface WorldBiomeBand {
    id: string;
    biome: WorldBiomeBandType;
    blend: number;
}
export interface WorldFactionZone {
    id: string;
    faction: WorldFactionType;
    dominance: number;
}
export interface WorldProgressionBand {
    id: string;
    tier: "starter" | "adventurer" | "veteran" | "apex";
    danger: number;
    rarityBias: number;
}
export interface RegionInfluenceField {
    landmarkFrequency: number;
    pathDensity: number;
    encounterBias: number;
    resourceBias: number;
    eventProbability: number;
}
export interface ChunkRegionContext {
    worldSeed: number;
    chunkId: string;
    chunkX: number;
    chunkY: number;
    macroRegion: WorldMacroRegion;
    district: WorldDistrict;
    biomeBand: WorldBiomeBand;
    factionZone: WorldFactionZone;
    progressionBand: WorldProgressionBand;
    influenceField: RegionInfluenceField;
}
export interface HierarchySeedInput {
    mode: "demo" | "real";
    lat: number;
    lng: number;
}
export declare function deriveWorldSeed(input: HierarchySeedInput): number;
export declare function buildChunkRegionContext(lat: number, lng: number, seed: number): ChunkRegionContext;
