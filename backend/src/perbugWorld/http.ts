import type { IncomingMessage, ServerResponse } from "node:http";

import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import { ValidationError } from "../plans/errors.js";
import type { EncounterResolution, PerbugNode } from "./types.js";
import { PerbugWorldService } from "./service.js";
import { buildChunkRegionContext, deriveWorldSeed } from "./worldHierarchy.js";

export function createPerbugWorldHttpHandlers(service: PerbugWorldService) {
  return {
    async bootstrap(req: IncomingMessage, res: ServerResponse) {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        const userId = (url.searchParams.get("userId") ?? "guest").trim();
        const lat = Number(url.searchParams.get("lat") ?? "30.2672");
        const lng = Number(url.searchParams.get("lng") ?? "-97.7431");
        const nodes = buildSeedNodes(lat, lng, "demo");
        const state = service.initializePlayer(userId, nodes);
        const reachable = service.computeReachableNodes(state, nodes);
        const currentPreview = service.previewEncounter(userId, state.currentNodeId, nodes);
        sendJson(res, 200, { state, reachable, currentPreview });
      } catch (error) {
        sendError(res, error);
      }
    },

    async move(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const destinationNodeId = String(body.destinationNodeId ?? "");
        const lat = Number(body.lat ?? 30.2672);
        const lng = Number(body.lng ?? -97.7431);
        const nodes = buildSeedNodes(lat, lng, "demo");
        const state = service.movePlayer(userId, destinationNodeId, nodes);
        const reachable = service.computeReachableNodes(state, nodes);
        const preview = service.previewEncounter(userId, destinationNodeId, nodes);
        sendJson(res, 200, { state, reachable, preview });
      } catch (error) {
        sendError(res, error);
      }
    },

    async previewEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        const userId = String(url.searchParams.get("userId") ?? "guest");
        const nodeId = String(url.searchParams.get("nodeId") ?? "");
        const lat = Number(url.searchParams.get("lat") ?? "30.2672");
        const lng = Number(url.searchParams.get("lng") ?? "-97.7431");
        const preview = service.previewEncounter(userId, nodeId, buildSeedNodes(lat, lng, "real"));
        sendJson(res, 200, { preview });
      } catch (error) {
        sendError(res, error);
      }
    },

    async launchEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const nodeId = String(body.nodeId ?? "");
        const lat = Number(body.lat ?? 30.2672);
        const lng = Number(body.lng ?? -97.7431);
        const state = service.launchEncounter(userId, nodeId, buildSeedNodes(lat, lng, "real"));
        sendJson(res, 200, { state, encounter: state.activeEncounter });
      } catch (error) {
        sendError(res, error);
      }
    },

    async submitEncounterAction(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const resolution = body.resolution as EncounterResolution;
        const state = service.submitEncounterAction(userId, resolution);
        sendJson(res, 200, { state, encounter: state.activeEncounter });
      } catch (error) {
        sendError(res, error);
      }
    },

    async finalizeEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const state = service.finalizeEncounter(userId);
        sendJson(res, 200, { state });
      } catch (error) {
        sendError(res, error);
      }
    },

    async abandonEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const state = service.abandonEncounter(userId);
        sendJson(res, 200, { state, encounter: state.activeEncounter });
      } catch (error) {
        sendError(res, error);
      }
    },

    async retryEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const state = service.retryEncounter(userId);
        sendJson(res, 200, { state, encounter: state.activeEncounter });
      } catch (error) {
        sendError(res, error);
      }
    },

    async resolveEncounter(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = await parseJsonBody(req) as Record<string, unknown>;
        const userId = String(body.userId ?? "guest");
        const succeeded = body.succeeded === true;
        const state = service.resolveEncounter(userId, succeeded);
        sendJson(res, 200, { state });
      } catch (error) {
        sendError(res, error);
      }
    }
  };
}

function buildSeedNodes(lat: number, lng: number, mode: "demo" | "real"): PerbugNode[] {
  const worldSeed = deriveWorldSeed({ mode, lat, lng });
  const anchorContext = buildChunkRegionContext(lat, lng, worldSeed);
  const farContext = buildChunkRegionContext(lat + 0.081, lng + 0.081, worldSeed);

  const mapBiome = (biome: string): string => {
    switch (biome) {
      case "urban_sprawl_band": return "urban";
      case "enchanted_forest_belt": return "garden";
      case "marshy_lowlands": return "wild";
      case "anomaly_frontier": return "wastes";
      default: return "wild";
    }
  };

  const baseDifficulty = (danger: number, bonus = 0) => Math.max(2, Math.min(7, Math.round(2 + danger * 4 + bonus)));
  const rarityFor = (rarityBias: number): PerbugNode["rarity"] => {
    if (rarityBias > 0.65) return "legendary";
    if (rarityBias > 0.45) return "epic";
    if (rarityBias > 0.25) return "rare";
    if (rarityBias > 0.1) return "uncommon";
    return "common";
  };

  const attachContext = (node: PerbugNode, context: ReturnType<typeof buildChunkRegionContext>): PerbugNode => ({
    ...node,
    chunkId: context.chunkId,
    region: `${context.macroRegion.name} · ${context.district.name}`,
    biome: mapBiome(context.biomeBand.biome),
    rarity: node.rarity ?? rarityFor(context.progressionBand.rarityBias),
    difficulty: baseDifficulty(context.progressionBand.danger, node.nodeType === "boss" ? 1 : 0),
    macroRegionId: context.macroRegion.id,
    districtId: context.district.id,
    factionZoneId: context.factionZone.id,
    progressionBandId: context.progressionBand.id,
    macroDanger: context.progressionBand.danger,
    landmarkInfluence: context.influenceField.landmarkFrequency
  });

  return [
    attachContext({
      id: `hub-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      label: "Anchor Hub",
      lat,
      lng,
      region: "Anchor",
      nodeType: "encounter",
      difficulty: 2,
      state: "available",
      energyReward: 3
    }, anchorContext),
    attachContext({
      id: `resource-${lat.toFixed(3)}-${(lng + 0.012).toFixed(3)}`,
      label: "Transit Garden",
      lat: lat + 0.009,
      lng: lng + 0.012,
      region: "District",
      nodeType: "resource",
      difficulty: 3,
      state: "available",
      energyReward: 4
    }, buildChunkRegionContext(lat + 0.009, lng + 0.012, worldSeed)),
    attachContext({
      id: `rare-${(lat - 0.011).toFixed(3)}-${(lng + 0.008).toFixed(3)}`,
      label: "Signal Tower",
      lat: lat - 0.011,
      lng: lng + 0.008,
      region: "District",
      rarity: "rare",
      nodeType: "rare",
      difficulty: 4,
      state: "special",
      energyReward: 4
    }, buildChunkRegionContext(lat - 0.011, lng + 0.008, worldSeed)),
    attachContext({
      id: `far-${(lat + 0.081).toFixed(3)}-${(lng + 0.081).toFixed(3)}`,
      label: "Far Frontier",
      lat: lat + 0.081,
      lng: lng + 0.081,
      region: "Outlands",
      rarity: "epic",
      nodeType: "boss",
      difficulty: 6,
      state: "locked",
      energyReward: 5
    }, farContext)
  ];
}

function sendError(res: ServerResponse, error: unknown) {
  if (error instanceof ValidationError) {
    sendJson(res, 400, { error: "validation_error", details: [error.message] });
    return;
  }
  sendJson(res, 500, { error: "perbug_world_failed", message: String(error) });
}
