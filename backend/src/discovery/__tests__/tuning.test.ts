import { describe, expect, it } from "vitest";

import { evaluateRankingAdjustments, RankingConfigResolver, RankingConfigService } from "../tuning.js";
import type { PlaceDocument } from "../types.js";

const samplePlace: PlaceDocument = {
  canonicalPlaceId: "p1",
  name: "Sample",
  primaryCategory: "food",
  secondaryCategories: ["brunch"],
  lat: 1,
  lng: 1,
  imageUrls: [],
  sourceAttribution: ["google"],
  qualityScore: 0.8,
  popularityScore: 0.7,
  trendingScore: 0.6,
  keywords: [],
  updatedAt: new Date().toISOString()
};

describe("ranking tuning", () => {
  it("supports draft validate publish rollback lifecycle", () => {
    const service = new RankingConfigService();
    const draft = service.createDraft({ actorId: "admin", name: "Food city", scopeType: "category_city", scopeKey: "food:austin" });
    const validation = service.validateDraft(draft.id, "admin");
    expect(validation.valid).toBe(true);

    const published = service.publish({ actorId: "admin", configSetId: draft.id, reason: "launch tuning" });
    expect(published.status).toBe("published");

    const nextDraft = service.createDraft({ actorId: "admin", name: "Food city v2", scopeType: "category_city", scopeKey: "food:austin" });
    service.publish({ actorId: "admin", configSetId: nextDraft.id, reason: "new iteration" });

    const rolled = service.rollback({ actorId: "admin", scopeType: "category_city", scopeKey: "food:austin", reason: "undo" });
    expect(rolled.status).toBe("published");
    expect(service.listAuditHistory().some((event) => event.action === "rollback")).toBe(true);
  });

  it("applies deterministic precedence and manual exclusion/pin rules", () => {
    const service = new RankingConfigService();
    const resolver = new RankingConfigResolver(service);

    const city = service.createDraft({ actorId: "admin", name: "city", scopeType: "city", scopeKey: "austin", payload: {
      weights: { featuredBoost: 0.1, trendingBoost: 0.1, qualityBoost: 0.1, reviewBoost: 0.1, saveWeight: 0, clickWeight: 0, viewWeight: 0, creatorAffinityWeight: 0, sourceTrustWeight: 0, freshnessWeight: 0, diversityWeight: 0 },
      categoryRules: [{ categoryId: "food", enabled: true, confidenceThreshold: 0.3, manualBoost: 0.2, pinnedPlaceIds: ["p1"], excludedPlaceIds: [], sourcePreferences: {} }],
      featuredRules: [],
      trendingRules: { recencyDecay: 0.2, minEngagement: 0.1, viewWeight: 0.2, clickWeight: 0.2, saveWeight: 0.2, reviewWeight: 0.2, trustWeight: 0.2 },
      sourceRules: [{ provider: "google", qualityWeight: 0.2, categoryConfidenceWeight: 0.2, enabled: true, fallbackPriority: 1 }],
      recommendationRules: []
    } });
    service.publish({ actorId: "admin", configSetId: city.id, reason: "city tune" });

    const categoryCity = service.createDraft({ actorId: "admin", name: "category+city", scopeType: "category_city", scopeKey: "food:austin", payload: {
      weights: { featuredBoost: 1, trendingBoost: 1, qualityBoost: 1, reviewBoost: 0.5, saveWeight: 0, clickWeight: 0, viewWeight: 0, creatorAffinityWeight: 0, sourceTrustWeight: 0.4, freshnessWeight: 0, diversityWeight: 0 },
      categoryRules: [{ categoryId: "food", enabled: true, confidenceThreshold: 0.7, manualBoost: 0.6, pinnedPlaceIds: ["p1"], excludedPlaceIds: [], sourcePreferences: {} }],
      featuredRules: [{ placeId: "p1", scopeType: "category_city", categoryId: "food", city: "austin", mode: "soft_boost", boost: 2, enabled: true }],
      trendingRules: { recencyDecay: 0.3, minEngagement: 0.1, viewWeight: 0.3, clickWeight: 0.2, saveWeight: 0.3, reviewWeight: 0.1, trustWeight: 0.1 },
      sourceRules: [{ provider: "google", qualityWeight: 0.3, categoryConfidenceWeight: 0.4, enabled: true, fallbackPriority: 1 }],
      recommendationRules: []
    } });
    service.publish({ actorId: "admin", configSetId: categoryCity.id, reason: "specific tune" });

    const resolved = resolver.resolve({ city: "austin", categoryId: "food", surface: "for_you" });
    expect(resolved.matchedConfigIds.length).toBeGreaterThan(1);
    const evaluation = evaluateRankingAdjustments(samplePlace, 1, resolved, { city: "austin", categoryId: "food", provider: "google", surface: "for_you" });
    expect(evaluation.score).toBeGreaterThan(1);
    expect(evaluation.reasons).toContain("manual_pin");
  });
});
