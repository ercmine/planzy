import { describe, expect, it } from "vitest";
import { buildChunkRegionContext, deriveWorldSeed } from "../worldHierarchy.js";
describe("world hierarchy generation", () => {
    it("keeps deterministic macro context for same world seed and position", () => {
        const seed = deriveWorldSeed({ mode: "real", lat: 30.2672, lng: -97.7431 });
        const a = buildChunkRegionContext(30.2672, -97.7431, seed);
        const b = buildChunkRegionContext(30.2672, -97.7431, seed);
        expect(a.chunkId).toBe(b.chunkId);
        expect(a.macroRegion.id).toBe(b.macroRegion.id);
        expect(a.district.id).toBe(b.district.id);
        expect(a.biomeBand.biome).toBe(b.biomeBand.biome);
        expect(a.progressionBand.tier).toBe(b.progressionBand.tier);
    });
    it("provides seam continuity across nearby chunk positions", () => {
        const seed = deriveWorldSeed({ mode: "real", lat: 30.2672, lng: -97.7431 });
        const left = buildChunkRegionContext(30.2672, -97.7431, seed);
        const right = buildChunkRegionContext(30.269, -97.741, seed);
        expect(left.macroRegion.id).toBe(right.macroRegion.id);
        expect(left.district.id).toBe(right.district.id);
        expect(Math.abs(left.influenceField.pathDensity - right.influenceField.pathDensity)).toBeLessThan(0.2);
        expect(Math.abs(left.influenceField.landmarkFrequency - right.influenceField.landmarkFrequency)).toBeLessThan(0.2);
    });
    it("uses stable demo seed independent of location", () => {
        const a = deriveWorldSeed({ mode: "demo", lat: 30.2, lng: -97.7 });
        const b = deriveWorldSeed({ mode: "demo", lat: 10, lng: 10 });
        expect(a).toBe(b);
    });
});
