import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
import { NodeEncounterResolver, computeSquadPower, createDefaultEncounterRegistry, defaultRewardPreview } from "./encounters.js";
const nowIso = () => new Date().toISOString();
export class PerbugWorldService {
    store;
    registry;
    resolver = new NodeEncounterResolver();
    constructor(store, registry) {
        this.store = store;
        this.registry = registry ?? createDefaultEncounterRegistry();
    }
    initializePlayer(userId, nodePool) {
        if (!userId.trim())
            throw new ValidationError(["userId is required"]);
        if (nodePool.length === 0)
            throw new ValidationError(["nodePool must include at least one real geodata node"]);
        const existing = this.store.getPlayerState(userId);
        if (existing)
            return existing;
        const startNode = nodePool[0];
        const state = {
            userId,
            currentNodeId: startNode.id,
            energy: 14,
            maxEnergy: 30,
            movementRangeMeters: 2400,
            visitedNodeIds: [startNode.id],
            movementHistory: [],
            progression: {
                level: 1,
                xp: 0,
                perbug: 0,
                inventory: { bio_dust: 0, signal_shard: 0 },
                completedNodeIds: [],
                missionProgress: {},
                unlocks: []
            },
            squad: {
                maxSlots: 3,
                units: [
                    { id: "u-scout", name: "Scout Midge", power: 8, rarity: "common", equipped: true },
                    { id: "u-tech", name: "Relay Beetle", power: 6, rarity: "common", equipped: true }
                ]
            },
            encounterHistory: [],
            nodeProgress: {
                [startNode.id]: { nodeId: startNode.id, completionState: "unseen", attempts: 0 }
            },
            analyticsLog: []
        };
        this.store.savePlayerState(state);
        return state;
    }
    computeReachableNodes(state, nodePool) {
        const current = nodePool.find((node) => node.id === state.currentNodeId);
        if (!current)
            throw new ValidationError(["current node missing from node pool"]);
        return nodePool
            .filter((node) => node.id !== current.id)
            .map((node) => {
            const distance = haversineMeters(current.lat, current.lng, node.lat, node.lng);
            const energyCost = Math.max(2, Math.round(distance / 450));
            return {
                node,
                distanceMeters: distance,
                energyCost,
                reachable: distance <= state.movementRangeMeters && state.energy >= energyCost
            };
        })
            .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    movePlayer(userId, destinationNodeId, nodePool) {
        const state = this.getPlayerState(userId);
        const reachable = this.computeReachableNodes(state, nodePool);
        const choice = reachable.find((item) => item.node.id === destinationNodeId);
        if (!choice)
            throw new ValidationError(["destination node is unknown"]);
        if (!choice.reachable)
            throw new ValidationError(["destination node is not reachable by range/energy"]);
        if (state.activeEncounter && ["launching", "active", "paused"].includes(state.activeEncounter.state)) {
            throw new ValidationError(["cannot move while encounter is unresolved"]);
        }
        const isFirstVisit = !state.visitedNodeIds.includes(choice.node.id);
        const reward = isFirstVisit ? choice.node.energyReward : 1;
        const nextEnergy = Math.min(state.maxEnergy, Math.max(0, state.energy - choice.energyCost + reward));
        const nextNodeProgress = { ...state.nodeProgress };
        nextNodeProgress[choice.node.id] = nextNodeProgress[choice.node.id] ?? { nodeId: choice.node.id, completionState: "unseen", attempts: 0 };
        const next = {
            ...state,
            currentNodeId: choice.node.id,
            energy: nextEnergy,
            visitedNodeIds: isFirstVisit ? [...state.visitedNodeIds, choice.node.id] : state.visitedNodeIds,
            movementHistory: [
                ...state.movementHistory,
                { fromNodeId: state.currentNodeId, toNodeId: choice.node.id, energyCost: choice.energyCost, happenedAt: nowIso() }
            ],
            nodeProgress: nextNodeProgress
        };
        this.store.savePlayerState(next);
        return next;
    }
    previewEncounter(userId, nodeId, nodePool) {
        const state = this.getPlayerState(userId);
        const node = this.requireNode(nodePool, nodeId);
        const context = this.buildContext(state, node);
        const selection = this.resolver.resolveType(context);
        const eligibility = this.computeEligibility(state, node, selection.type);
        const module = this.registry.get(selection.type);
        const payload = {
            nodeId: node.id,
            nodeType: node.nodeType,
            encounterType: selection.type,
            biome: node.biome,
            rarity: node.rarity,
            difficulty: node.difficulty
        };
        this.recordEvent(state, {
            nodeId: node.id,
            encounterType: selection.type,
            eventType: "generated",
            encounterId: `preview-${node.id}`,
            metadata: { selectionReason: selection.reason, payload }
        });
        this.store.savePlayerState(state);
        return {
            type: selection.type,
            state: eligibility.eligible ? "available" : "locked",
            preview: module.buildPreview(context),
            eligibility,
            payload
        };
    }
    launchEncounter(userId, nodeId, nodePool) {
        const state = this.getPlayerState(userId);
        const node = this.requireNode(nodePool, nodeId);
        if (state.currentNodeId !== nodeId)
            throw new ValidationError(["player must move to node before launch"]);
        const context = this.buildContext(state, node);
        const selection = this.resolver.resolveType(context);
        const eligibility = this.computeEligibility(state, node, selection.type);
        if (!eligibility.eligible)
            throw new ValidationError([`encounter not eligible: ${eligibility.reasons.join(", ")}`]);
        const module = this.registry.get(selection.type);
        const launchedAt = nowIso();
        const payload = {
            nodeId: node.id,
            encounterType: selection.type,
            nodeType: node.nodeType,
            biome: node.biome,
            rarity: node.rarity,
            difficulty: node.difficulty
        };
        const session = {
            id: `enc-${node.id}-${Date.now()}`,
            nodeId: node.id,
            type: selection.type,
            state: "active",
            launchedAt,
            updatedAt: launchedAt,
            retryCount: state.nodeProgress[node.id]?.attempts ?? 0,
            moduleState: module.buildInitialState(context),
            contextSnapshot: {
                squadPower: computeSquadPower(context),
                squadSize: context.squad.units.filter((u) => u.equipped).length,
                playerLevel: context.progression.level
            },
            rewardPreview: defaultRewardPreview(context, selection.type),
            rewardGranted: false,
            debug: {
                selectionReason: selection.reason,
                payload,
                transitions: [{ from: "launching", to: "active", at: launchedAt, reason: "launch complete" }]
            }
        };
        const nodeProgress = this.bumpNodeProgress(state.nodeProgress[node.id], node.id, "in_progress");
        const next = {
            ...state,
            activeEncounter: session,
            nodeProgress: { ...state.nodeProgress, [node.id]: nodeProgress }
        };
        this.recordEvent(next, { nodeId: node.id, encounterType: selection.type, encounterId: session.id, eventType: "launched", metadata: { selectionReason: selection.reason } });
        this.store.savePlayerState(next);
        return next;
    }
    submitEncounterAction(userId, resolution) {
        const state = this.getPlayerState(userId);
        const session = this.requireActiveEncounter(state);
        const node = this.requireNodeFromState(session.nodeId, state.currentNodeId, state, resolution);
        const context = this.buildContext(state, node);
        const module = this.registry.get(session.type);
        const outcome = module.evaluate(context, session, resolution);
        const updatedSession = { ...session, state: outcome.state, updatedAt: nowIso(), completedAt: outcome.succeeded ? nowIso() : undefined, failureReason: outcome.failureReason };
        const next = { ...state, activeEncounter: updatedSession };
        this.recordEvent(next, {
            nodeId: session.nodeId,
            encounterType: session.type,
            encounterId: session.id,
            eventType: "action",
            metadata: { actionId: resolution.actionId, succeeded: outcome.succeeded, score: resolution.score ?? null }
        });
        this.store.savePlayerState(next);
        return next;
    }
    resolveEncounter(userId, succeeded) {
        const state = this.getPlayerState(userId);
        const session = this.requireActiveEncounter(state);
        const node = this.requireNodeByVisited(state, session.nodeId);
        const module = this.registry.get(session.type);
        const inferredResolution = succeeded === false
            ? { actionId: "fail", summary: "Encounter failed" }
            : { actionId: "complete", summary: "Encounter completed" };
        const outcome = module.evaluate(this.buildContext(state, node), session, inferredResolution);
        return this.finalizeEncounterWithOutcome(state, session, node, module.buildReward(this.buildContext(state, node), outcome), outcome.succeeded, outcome.failureReason);
    }
    finalizeEncounter(userId) {
        const state = this.getPlayerState(userId);
        const session = this.requireActiveEncounter(state);
        if (!["completed", "failed", "abandoned"].includes(session.state)) {
            throw new ValidationError(["encounter must be completed/failed/abandoned before finalization"]);
        }
        if (session.rewardGranted) {
            throw new ValidationError(["encounter rewards already granted"]);
        }
        const node = this.requireNodeByVisited(state, session.nodeId);
        const module = this.registry.get(session.type);
        const succeeded = session.state === "completed";
        const reward = module.buildReward(this.buildContext(state, node), {
            succeeded,
            state: session.state,
            failureReason: session.failureReason,
            resolution: { actionId: succeeded ? "complete" : "fail", summary: succeeded ? "completed" : "failed" }
        });
        return this.finalizeEncounterWithOutcome(state, session, node, reward, succeeded, session.failureReason);
    }
    abandonEncounter(userId) {
        const state = this.getPlayerState(userId);
        const session = this.requireActiveEncounter(state);
        if (!["active", "paused"].includes(session.state))
            throw new ValidationError(["only active encounter can be abandoned"]);
        const updated = {
            ...session,
            state: "abandoned",
            updatedAt: nowIso(),
            failureReason: "abandoned",
            debug: {
                ...session.debug,
                transitions: [...session.debug.transitions, { from: session.state, to: "abandoned", at: nowIso(), reason: "player abandoned" }]
            }
        };
        const nodeProgress = this.bumpNodeProgress(state.nodeProgress[session.nodeId], session.nodeId, "failed");
        const next = { ...state, activeEncounter: updated, nodeProgress: { ...state.nodeProgress, [session.nodeId]: nodeProgress } };
        this.recordEvent(next, { nodeId: session.nodeId, encounterId: session.id, encounterType: session.type, eventType: "abandoned", metadata: {} });
        this.store.savePlayerState(next);
        return next;
    }
    retryEncounter(userId) {
        const state = this.getPlayerState(userId);
        const session = this.requireActiveEncounter(state);
        if (!["failed", "abandoned"].includes(session.state))
            throw new ValidationError(["retry is only allowed after fail/abandon"]);
        const reset = {
            ...session,
            state: "active",
            updatedAt: nowIso(),
            retryCount: session.retryCount + 1,
            failureReason: undefined,
            rewardGranted: false,
            debug: {
                ...session.debug,
                transitions: [...session.debug.transitions, { from: session.state, to: "active", at: nowIso(), reason: "retry" }]
            }
        };
        const nodeProgress = this.bumpNodeProgress(state.nodeProgress[session.nodeId], session.nodeId, "in_progress");
        const next = { ...state, activeEncounter: reset, nodeProgress: { ...state.nodeProgress, [session.nodeId]: nodeProgress } };
        this.recordEvent(next, { nodeId: session.nodeId, encounterId: session.id, encounterType: session.type, eventType: "retried", metadata: { retryCount: reset.retryCount } });
        this.store.savePlayerState(next);
        return next;
    }
    claimEnergy(userId, amount = 3) {
        const state = this.getPlayerState(userId);
        const next = { ...state, energy: Math.min(state.maxEnergy, state.energy + Math.max(1, amount)) };
        this.store.savePlayerState(next);
        return next;
    }
    finalizeEncounterWithOutcome(state, session, node, payout, succeeded, failureReason) {
        if (session.rewardGranted)
            throw new ValidationError(["encounter rewards already granted"]);
        const applied = succeeded ? payout : { xp: 0, perbug: 0, resources: {}, energy: 0, missionProgress: {} };
        const nextInventory = { ...state.progression.inventory };
        for (const [key, value] of Object.entries(applied.resources)) {
            nextInventory[key] = (nextInventory[key] ?? 0) + value;
        }
        const nextMissionProgress = { ...state.progression.missionProgress };
        for (const [key, value] of Object.entries(applied.missionProgress ?? {})) {
            nextMissionProgress[key] = (nextMissionProgress[key] ?? 0) + value;
        }
        const nextXp = state.progression.xp + applied.xp;
        const updatedSession = {
            ...session,
            state: succeeded ? "rewarded" : "failed",
            rewardGranted: true,
            failureReason: succeeded ? undefined : failureReason ?? "rules_failed",
            updatedAt: nowIso(),
            completedAt: session.completedAt ?? nowIso(),
            debug: {
                ...session.debug,
                transitions: [...session.debug.transitions, { from: session.state, to: succeeded ? "rewarded" : "failed", at: nowIso(), reason: "finalized" }]
            }
        };
        const encounterHistory = [...state.encounterHistory, updatedSession];
        const nodeProgress = this.bumpNodeProgress(state.nodeProgress[node.id], node.id, succeeded ? "completed" : "failed");
        const next = {
            ...state,
            energy: Math.min(state.maxEnergy, state.energy + applied.energy),
            progression: {
                level: 1 + Math.floor(nextXp / 120),
                xp: nextXp,
                perbug: state.progression.perbug + applied.perbug,
                inventory: nextInventory,
                missionProgress: nextMissionProgress,
                completedNodeIds: succeeded && !state.progression.completedNodeIds.includes(node.id)
                    ? [...state.progression.completedNodeIds, node.id]
                    : state.progression.completedNodeIds,
                unlocks: [...new Set([...(state.progression.unlocks ?? []), ...(applied.unlocks ?? [])])]
            },
            nodeProgress: { ...state.nodeProgress, [node.id]: nodeProgress },
            activeEncounter: undefined,
            encounterHistory
        };
        this.recordEvent(next, { nodeId: node.id, encounterId: updatedSession.id, encounterType: updatedSession.type, eventType: succeeded ? "completed" : "failed", metadata: { payout: applied } });
        this.recordEvent(next, { nodeId: node.id, encounterId: updatedSession.id, encounterType: updatedSession.type, eventType: "rewarded", metadata: { rewardGranted: succeeded } });
        this.store.savePlayerState(next);
        return next;
    }
    computeEligibility(state, node, type) {
        const reasons = [];
        if (node.state === "locked")
            reasons.push("node locked");
        if (state.currentNodeId !== node.id)
            reasons.push("player not at node");
        if (state.energy <= 0)
            reasons.push("insufficient energy");
        if (type === "boss" && state.squad.units.filter((u) => u.equipped).length < 2)
            reasons.push("squad too small for boss");
        return { eligible: reasons.length === 0, reasons };
    }
    buildContext(state, node) {
        return {
            userId: state.userId,
            node,
            progression: state.progression,
            squad: state.squad,
            retryCount: state.nodeProgress[node.id]?.attempts ?? 0
        };
    }
    bumpNodeProgress(current, nodeId, completionState) {
        return {
            nodeId,
            attempts: (current?.attempts ?? 0) + 1,
            lastEncounterId: current?.lastEncounterId,
            completionState,
            completedAt: completionState === "completed" ? nowIso() : current?.completedAt,
            failedAt: completionState === "failed" ? nowIso() : current?.failedAt
        };
    }
    requireNode(nodePool, nodeId) {
        const node = nodePool.find((n) => n.id === nodeId);
        if (!node)
            throw new ValidationError(["node not found"]);
        return node;
    }
    requireNodeFromState(nodeId, currentNodeId, state, resolution) {
        const historyNodeId = nodeId || currentNodeId;
        return {
            id: historyNodeId,
            label: resolution.metadata?.nodeLabel ? String(resolution.metadata.nodeLabel) : "Encounter Node",
            lat: 0,
            lng: 0,
            region: "runtime",
            nodeType: "encounter",
            difficulty: Number(resolution.metadata?.difficulty ?? 2),
            state: "available",
            energyReward: 0
        };
    }
    requireNodeByVisited(state, nodeId) {
        return {
            id: nodeId,
            label: "Encounter Node",
            lat: 0,
            lng: 0,
            region: "runtime",
            nodeType: "encounter",
            difficulty: 2,
            state: "available",
            energyReward: 0
        };
    }
    recordEvent(state, event) {
        state.analyticsLog = [
            ...state.analyticsLog,
            {
                id: `ana_${randomUUID()}`,
                userId: state.userId,
                timestamp: nowIso(),
                ...event
            }
        ].slice(-100);
    }
    requireActiveEncounter(state) {
        if (!state.activeEncounter)
            throw new ValidationError(["no active encounter"]);
        return state.activeEncounter;
    }
    getPlayerState(userId) {
        const state = this.store.getPlayerState(userId);
        if (!state)
            throw new ValidationError(["player state not initialized"]);
        return state;
    }
}
function haversineMeters(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371000;
    const toRad = (degree) => degree * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}
