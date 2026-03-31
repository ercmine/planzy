const CHUNK_DEGREES = 0.02;
const macroNames = ["Lumin Expanse", "Shatter March", "Verdant Circuit", "Signal Crown", "Glass Frontier"];
const districtTypes = [
    "urban_cluster",
    "village_ring",
    "woodland_corridor",
    "relic_basin",
    "mission_frontier",
    "anomaly_belt",
    "merchant_district",
    "high_threat_zone",
    "peaceful_rest_district"
];
const biomeBands = [
    "enchanted_forest_belt",
    "crystal_plains",
    "marshy_lowlands",
    "ruin_laced_highlands",
    "urban_sprawl_band",
    "coast_water_influence",
    "sacred_grove_corridor",
    "anomaly_frontier"
];
const factionTypes = ["merchant_guild", "mission_control", "relic_hunters", "wild_hostiles", "anomaly_cabal"];
export function deriveWorldSeed(input) {
    if (input.mode === "demo")
        return hash32("perbug-demo-world-v1");
    const quantized = `${Math.round(input.lat * 1000)}:${Math.round(input.lng * 1000)}`;
    return hash32(`perbug-real-world-v1:${quantized}`);
}
export function buildChunkRegionContext(lat, lng, seed) {
    const chunkX = Math.floor(lng / CHUNK_DEGREES);
    const chunkY = Math.floor(lat / CHUNK_DEGREES);
    const chunkId = `chunk_${chunkX}_${chunkY}`;
    const macroCellX = Math.floor(chunkX / 18);
    const macroCellY = Math.floor(chunkY / 18);
    const macroIdx = pickIndex(macroNames.length, seed, macroCellX, macroCellY, "macro");
    const macroRegion = {
        id: `macro_${macroCellX}_${macroCellY}_${macroIdx}`,
        name: macroNames[macroIdx],
        climateBias: pickFrom(["temperate", "humid", "arid", "storm"], seed, macroCellX, macroCellY, "macro-climate"),
        mood: pickFrom(["settled", "frontier", "mystic", "contested"], seed, macroCellX, macroCellY, "macro-mood"),
        terrainTint: pickFrom(["verdigris", "amber", "violet", "teal", "slate"], seed, macroCellX, macroCellY, "macro-tint")
    };
    const districtCellX = Math.floor(chunkX / 8);
    const districtCellY = Math.floor(chunkY / 8);
    const districtType = pickFrom(districtTypes, seed, districtCellX, districtCellY, "district-type");
    const district = {
        id: `district_${districtCellX}_${districtCellY}`,
        name: `${titleCase(districtType.replaceAll("_", " "))} ${Math.abs(districtCellX + districtCellY)}`,
        districtType,
        flavorText: `${macroRegion.name} ${districtType.replaceAll("_", " ")}`
    };
    const biomeNoise = smoothNoise(seed, lng * 0.08, lat * 0.08, "biome");
    const biomeIdx = Math.min(biomeBands.length - 1, Math.floor(biomeNoise * biomeBands.length));
    const biomeBand = {
        id: `biome_${biomeIdx}_${Math.floor(chunkX / 6)}_${Math.floor(chunkY / 6)}`,
        biome: biomeBands[biomeIdx],
        blend: smoothNoise(seed, lng * 0.1, lat * 0.1, "biome-blend")
    };
    const factionNoise = smoothNoise(seed, lng * 0.05, lat * 0.05, "faction");
    const factionIdx = Math.min(factionTypes.length - 1, Math.floor(factionNoise * factionTypes.length));
    const factionZone = {
        id: `faction_${factionIdx}_${Math.floor(chunkX / 10)}_${Math.floor(chunkY / 10)}`,
        faction: factionTypes[factionIdx],
        dominance: 0.35 + smoothNoise(seed, lng * 0.15, lat * 0.15, "faction-dominance") * 0.65
    };
    const radialDistance = Math.sqrt(lat * lat + lng * lng);
    const progressionNoise = smoothNoise(seed, lng * 0.03, lat * 0.03, "progression");
    const progressionValue = radialDistance * 0.015 + progressionNoise;
    const progressionBand = progressionValue < 0.85
        ? { id: `prog_${chunkX}_${chunkY}`, tier: "starter", danger: 0.2, rarityBias: 0.05 }
        : progressionValue < 1.2
            ? { id: `prog_${chunkX}_${chunkY}`, tier: "adventurer", danger: 0.45, rarityBias: 0.2 }
            : progressionValue < 1.6
                ? { id: `prog_${chunkX}_${chunkY}`, tier: "veteran", danger: 0.7, rarityBias: 0.4 }
                : { id: `prog_${chunkX}_${chunkY}`, tier: "apex", danger: 0.9, rarityBias: 0.7 };
    const influenceField = {
        landmarkFrequency: clamp01(0.2 + smoothNoise(seed, lng * 0.2, lat * 0.2, "landmark") * 0.8),
        pathDensity: clamp01(0.3 + smoothNoise(seed, lng * 0.12, lat * 0.12, "path") * 0.7),
        encounterBias: clamp01(0.15 + progressionBand.danger * 0.6 + smoothNoise(seed, lng * 0.18, lat * 0.18, "encounter") * 0.25),
        resourceBias: clamp01(0.2 + (1 - progressionBand.danger) * 0.45 + smoothNoise(seed, lng * 0.14, lat * 0.14, "resource") * 0.2),
        eventProbability: clamp01(0.1 + factionZone.dominance * 0.35 + smoothNoise(seed, lng * 0.22, lat * 0.22, "event") * 0.2)
    };
    return {
        worldSeed: seed,
        chunkId,
        chunkX,
        chunkY,
        macroRegion,
        district,
        biomeBand,
        factionZone,
        progressionBand,
        influenceField
    };
}
function smoothNoise(seed, x, y, channel) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const c00 = valueNoise(seed, x0, y0, channel);
    const c10 = valueNoise(seed, x0 + 1, y0, channel);
    const c01 = valueNoise(seed, x0, y0 + 1, channel);
    const c11 = valueNoise(seed, x0 + 1, y0 + 1, channel);
    const sx = smoothstep(tx);
    const sy = smoothstep(ty);
    const nx0 = lerp(c00, c10, sx);
    const nx1 = lerp(c01, c11, sx);
    return lerp(nx0, nx1, sy);
}
function valueNoise(seed, x, y, channel) {
    const h = hash32(`${seed}:${channel}:${x}:${y}`);
    return (h >>> 0) / 0xffffffff;
}
function pickFrom(arr, seed, x, y, channel) {
    return arr[pickIndex(arr.length, seed, x, y, channel)];
}
function pickIndex(length, seed, x, y, channel) {
    const h = hash32(`${seed}:${channel}:${x}:${y}`);
    return Math.abs(h) % length;
}
function hash32(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash | 0;
}
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function titleCase(value) {
    return value.split(" ").map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(" ");
}
