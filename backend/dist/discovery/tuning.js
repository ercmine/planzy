import { randomUUID } from "node:crypto";
const DEFAULT_PAYLOAD = {
    weights: { featuredBoost: 0.3, trendingBoost: 0.2, qualityBoost: 0.3, reviewBoost: 0.1, saveWeight: 0.1, clickWeight: 0.1, viewWeight: 0.05, creatorAffinityWeight: 0.1, sourceTrustWeight: 0.2, freshnessWeight: 0.1, diversityWeight: 0.1 },
    categoryRules: [],
    featuredRules: [],
    trendingRules: { recencyDecay: 0.35, minEngagement: 0.1, viewWeight: 0.25, clickWeight: 0.2, saveWeight: 0.25, reviewWeight: 0.2, trustWeight: 0.1 },
    sourceRules: [],
    recommendationRules: [
        { surface: "for_you", personalizedWeight: 0.45, trendingWeight: 0.2, nearbyWeight: 0.15, creatorWeight: 0.1, featuredWeight: 0.1, diversityLimit: 3, duplicationThreshold: 0.7, freshnessBias: 0.15 }
    ]
};
function nowIso() { return new Date().toISOString(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export class RankingConfigService {
    configs = new Map();
    audits = [];
    constructor() {
        this.createDraft({ actorId: "system", name: "Global defaults", scopeType: "global", payload: DEFAULT_PAYLOAD });
        const draft = this.listConfigSets({ includeDrafts: true })[0];
        if (draft)
            this.publish({ actorId: "system", configSetId: draft.id, reason: "bootstrap" });
    }
    listConfigSets(options) {
        return [...this.configs.values()].flat().filter((set) => options?.includeDrafts ? true : set.status === "published").map(clone);
    }
    getConfig(id) {
        return this.findById(id);
    }
    createDraft(input) {
        const createdAt = nowIso();
        const set = { id: randomUUID(), name: input.name, scopeType: input.scopeType, scopeKey: input.scopeKey, status: "draft", version: 1, createdBy: input.actorId, updatedBy: input.actorId, createdAt, updatedAt: createdAt, notes: input.notes, payload: clone(input.payload ?? DEFAULT_PAYLOAD) };
        const key = `${set.scopeType}:${set.scopeKey ?? "*"}`;
        const list = this.configs.get(key) ?? [];
        list.push(set);
        this.configs.set(key, list);
        this.audit(set.id, "created", input.actorId, input.notes);
        return clone(set);
    }
    updateDraft(input) {
        const config = this.findByIdRef(input.configSetId);
        if (!config || config.status !== "draft")
            throw new Error("DRAFT_NOT_FOUND");
        config.payload = clone(input.payload);
        config.updatedBy = input.actorId;
        config.updatedAt = nowIso();
        config.notes = input.notes ?? config.notes;
        this.audit(config.id, "updated", input.actorId, input.notes);
        return clone(config);
    }
    validateDraft(configSetId, actorId) {
        const config = this.findByIdRef(configSetId);
        if (!config || config.status !== "draft")
            return { valid: false, errors: ["DRAFT_NOT_FOUND"] };
        const errors = [];
        const w = config.payload.weights;
        Object.keys(w).forEach((key) => {
            const value = w[key];
            if (!Number.isFinite(value) || value < -2 || value > 5)
                errors.push(`invalid_weight:${String(key)}`);
            w[key] = clamp(value, -2, 5);
        });
        config.payload.categoryRules.forEach((rule, idx) => {
            if (!rule.categoryId)
                errors.push(`categoryRules[${idx}].categoryId_required`);
            rule.confidenceThreshold = clamp(rule.confidenceThreshold, 0, 1);
        });
        this.audit(config.id, "validated", actorId);
        return { valid: errors.length === 0, errors };
    }
    publish(input) {
        const target = this.findByIdRef(input.configSetId);
        if (!target || target.status !== "draft")
            throw new Error("DRAFT_NOT_FOUND");
        const validation = this.validateDraft(target.id, input.actorId);
        if (!validation.valid)
            throw new Error(`INVALID_CONFIG:${validation.errors.join(",")}`);
        const key = `${target.scopeType}:${target.scopeKey ?? "*"}`;
        const list = this.configs.get(key) ?? [];
        for (const cfg of list)
            if (cfg.status === "published")
                cfg.status = "archived";
        target.status = "published";
        target.publishedBy = input.actorId;
        target.publishedAt = nowIso();
        target.updatedAt = target.publishedAt;
        target.changeReason = input.reason;
        this.audit(target.id, "published", input.actorId, input.reason);
        return clone(target);
    }
    rollback(input) {
        const key = `${input.scopeType}:${input.scopeKey ?? "*"}`;
        const list = this.configs.get(key) ?? [];
        const archived = list.filter((cfg) => cfg.status === "archived").sort((a, b) => b.version - a.version);
        const source = input.toVersion ? archived.find((cfg) => cfg.version === input.toVersion) : archived[0];
        if (!source)
            throw new Error("ROLLBACK_TARGET_NOT_FOUND");
        const draft = this.createDraft({ actorId: input.actorId, name: `${source.name} rollback`, scopeType: source.scopeType, scopeKey: source.scopeKey, payload: source.payload, notes: input.reason });
        const draftRef = this.findByIdRef(draft.id);
        draftRef.version = Math.max(...list.map((cfg) => cfg.version), 0) + 1;
        const published = this.publish({ actorId: input.actorId, configSetId: draft.id, reason: input.reason });
        this.audit(published.id, "rollback", input.actorId, input.reason);
        return published;
    }
    listAuditHistory(configSetId) {
        return this.audits.filter((event) => !configSetId || event.configSetId === configSetId).map(clone);
    }
    findById(id) {
        return this.findByIdRef(id) ? clone(this.findByIdRef(id)) : undefined;
    }
    findByIdRef(id) {
        return [...this.configs.values()].flat().find((set) => set.id === id);
    }
    audit(configSetId, action, actorId, reason) {
        this.audits.push({ id: randomUUID(), configSetId, action, actorId, at: nowIso(), reason });
    }
}
const PRECEDENCE = ["global", "surface", "provider", "city", "category", "category_city"];
export class RankingConfigResolver {
    service;
    constructor(service) {
        this.service = service;
    }
    resolve(scope) {
        const published = this.service.listConfigSets();
        const ordered = PRECEDENCE.flatMap((scopeType) => published.filter((cfg) => cfg.scopeType === scopeType && this.scopeMatches(cfg, scope)));
        let merged = clone(DEFAULT_PAYLOAD);
        const matchedConfigIds = [];
        for (const cfg of ordered) {
            merged = {
                weights: { ...merged.weights, ...cfg.payload.weights },
                categoryRules: [...merged.categoryRules, ...cfg.payload.categoryRules],
                featuredRules: [...merged.featuredRules, ...cfg.payload.featuredRules],
                trendingRules: { ...merged.trendingRules, ...cfg.payload.trendingRules },
                sourceRules: [...merged.sourceRules, ...cfg.payload.sourceRules],
                recommendationRules: [...merged.recommendationRules, ...cfg.payload.recommendationRules]
            };
            matchedConfigIds.push(cfg.id);
        }
        return {
            weights: merged.weights,
            categoryRules: merged.categoryRules,
            featuredRules: merged.featuredRules,
            trendingRules: merged.trendingRules,
            sourceRules: merged.sourceRules,
            recommendationRule: merged.recommendationRules.find((rule) => rule.surface === scope.surface),
            matchedConfigIds
        };
    }
    scopeMatches(cfg, scope) {
        if (cfg.scopeType === "global")
            return true;
        if (cfg.scopeType === "city")
            return cfg.scopeKey?.toLowerCase() === scope.city?.toLowerCase();
        if (cfg.scopeType === "category")
            return cfg.scopeKey === scope.categoryId;
        if (cfg.scopeType === "category_city")
            return cfg.scopeKey === `${scope.categoryId}:${scope.city}`;
        if (cfg.scopeType === "surface")
            return cfg.scopeKey === scope.surface;
        return true;
    }
}
function inWindow(rule) {
    const now = Date.now();
    if (rule.startsAt && Date.parse(rule.startsAt) > now)
        return false;
    if (rule.endsAt && Date.parse(rule.endsAt) < now)
        return false;
    return rule.enabled;
}
export function evaluateRankingAdjustments(place, baseScore, resolved, context) {
    let score = baseScore;
    const reasons = [];
    let hardPinnedSlot;
    const categoryRule = resolved.categoryRules.find((rule) => rule.categoryId === context.categoryId || rule.categoryId === place.primaryCategory);
    if (categoryRule && !categoryRule.enabled)
        return { score: -1, reasons: ["category_disabled"], excluded: true };
    if (categoryRule?.excludedPlaceIds.includes(place.canonicalPlaceId))
        return { score: -1, reasons: ["category_excluded"], excluded: true };
    if (categoryRule?.pinnedPlaceIds.includes(place.canonicalPlaceId)) {
        score += 5;
        reasons.push("manual_pin");
    }
    if (categoryRule) {
        score += categoryRule.manualBoost;
        reasons.push("category_boost");
    }
    for (const feature of resolved.featuredRules.filter((rule) => rule.placeId === place.canonicalPlaceId && inWindow(rule))) {
        if (feature.mode === "hard_pin") {
            hardPinnedSlot = feature.slot ?? 0;
            reasons.push("featured_hard_pin");
        }
        else {
            score += feature.boost || resolved.weights.featuredBoost;
            reasons.push("featured_soft_boost");
        }
    }
    const provider = (context.provider ?? place.sourceAttribution[0] ?? "").toLowerCase();
    const providerRule = resolved.sourceRules.find((rule) => rule.provider.toLowerCase() === provider && rule.enabled !== false);
    if (providerRule) {
        score += providerRule.qualityWeight * resolved.weights.sourceTrustWeight;
        reasons.push("provider_weight_applied");
    }
    score += place.qualityScore * resolved.weights.qualityBoost;
    score += place.trendingScore * resolved.weights.trendingBoost;
    if ((place.reviewCount ?? 0) > 0)
        score += Math.min(1, (place.reviewCount ?? 0) / 100) * resolved.weights.reviewBoost;
    return { score, reasons, hardPinnedSlot, excluded: false };
}
