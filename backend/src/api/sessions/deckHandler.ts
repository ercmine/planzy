import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { AppConfig } from "../../config/schema.js";
import { defaultLogger } from "../../logging/logger.js";
import { coarseGeo, hashString } from "../../logging/redact.js";
import type { Logger } from "../../logging/loggerTypes.js";
import { ProviderError, ValidationError } from "../../plans/errors.js";
import type { Plan } from "../../plans/plan.js";
import { PLAN_CATEGORIES } from "../../plans/plan.js";
import type { Category, SearchPlansInput } from "../../plans/types.js";
import { type ProviderRouter } from "../../plans/router/providerRouter.js";
import { PolicyViolationError } from "../../policy/noScrapePolicy.js";
import { readHeader, sendJson } from "../../venues/claims/http.js";
import type { DeckSourceMix } from "./deckTypes.js";

interface DeckQueryParamsNormalized {
  cursor?: string | null;
  limit: number;
  radiusMeters: number;
  categories?: Category[];
  openNow: boolean;
  priceLevelMax?: number;
  timeStart?: string;
  timeEnd?: string;
  locale?: string;
  lat: number;
  lng: number;
}

const VALID_CATEGORIES = new Set<string>(PLAN_CATEGORIES);

function parseNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseDeckQuery(url: URL): DeckQueryParamsNormalized {
  const details: string[] = [];
  const lat = parseNumber(url.searchParams.get("lat"));
  const lng = parseNumber(url.searchParams.get("lng"));

  if (lat === undefined) {
    details.push("lat is required and must be a finite number");
  }
  if (lng === undefined) {
    details.push("lng is required and must be a finite number");
  }

  if (lat === undefined || lng === undefined) {
    throw new ValidationError(details);
  }

  const limitValue = parseNumber(url.searchParams.get("limit"));
  const radiusValue = parseNumber(url.searchParams.get("radiusMeters"));
  const priceLevelMaxRaw = parseNumber(url.searchParams.get("priceLevelMax"));
  const categoryParam = url.searchParams.get("categories");
  const timeStart = url.searchParams.get("timeStart") ?? undefined;
  const timeEnd = url.searchParams.get("timeEnd") ?? undefined;

  const categories = categoryParam
    ?.split(",")
    .map((category) => category.trim())
    .filter((category): category is Category => category.length > 0 && VALID_CATEGORIES.has(category));

  return {
    cursor: url.searchParams.get("cursor"),
    limit: clamp(limitValue ?? 50, 1, 100),
    radiusMeters: clamp(radiusValue ?? 5000, 100, 50_000),
    categories: categories && categories.length > 0 ? categories : undefined,
    openNow: ["true", "1"].includes((url.searchParams.get("openNow") ?? "").toLowerCase()),
    priceLevelMax: priceLevelMaxRaw === undefined ? undefined : clamp(Math.trunc(priceLevelMaxRaw), 0, 4),
    timeStart,
    timeEnd,
    locale: url.searchParams.get("locale") ?? undefined,
    lat,
    lng
  };
}

export function computeMix(plans: Plan[], providersUsed: string[]): DeckSourceMix {
  const planSourceCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let sponsoredCount = 0;

  for (const plan of plans) {
    planSourceCounts[plan.source] = (planSourceCounts[plan.source] ?? 0) + 1;
    categoryCounts[plan.category] = (categoryCounts[plan.category] ?? 0) + 1;

    const metadata = plan.metadata as { sponsored?: unknown } | undefined;
    if (metadata?.sponsored === true || plan.source === "promoted") {
      sponsoredCount += 1;
    }
  }

  return {
    providersUsed,
    planSourceCounts,
    categoryCounts,
    sponsoredCount
  };
}

function toSearchPlansInput(query: DeckQueryParamsNormalized): SearchPlansInput {
  return {
    location: { lat: query.lat, lng: query.lng },
    radiusMeters: query.radiusMeters,
    categories: query.categories,
    openNow: query.openNow,
    priceLevelMax: query.priceLevelMax as SearchPlansInput["priceLevelMax"],
    timeWindow: query.timeStart && query.timeEnd ? { start: query.timeStart, end: query.timeEnd } : undefined,
    limit: query.limit,
    cursor: query.cursor,
    locale: query.locale
  };
}

export type SessionDeckHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: { sessionId: string }
) => Promise<void>;

export function createDeckHandler(deps: {
  router: ProviderRouter;
  logger?: Logger;
  config?: AppConfig;
}): (req: IncomingMessage, res: ServerResponse, params: { sessionId: string }) => Promise<void> {
  const logger = deps.logger ?? defaultLogger;

  return async (req: IncomingMessage, res: ServerResponse, params: { sessionId: string }) => {
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const requestId = readHeader(req, "x-request-id") ?? randomUUID();
    const userId = readHeader(req, "x-user-id");

    try {
      const query = parseDeckQuery(url);
      const searchInput = toSearchPlansInput(query);

      logger.info("api.deck.fetch", {
        module: "api.sessions.deck",
        requestId,
        sessionHash: hashString(params.sessionId),
        userHash: userId ? hashString(userId) : undefined,
        geo: coarseGeo(query.lat, query.lng)
      });

      const result = await deps.router.search(searchInput, {
        sessionId: params.sessionId,
        requestId,
        userId,
        config: deps.config,
        logger
      });

      sendJson(res, 200, {
        sessionId: params.sessionId,
        plans: result.plans,
        nextCursor: result.nextCursor ?? null,
        mix: computeMix(result.plans, result.sources),
        debug: {
          requestId,
          cacheHit: result.debug?.cacheHit
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: "validation_error", details: error.details });
        return;
      }

      if (error instanceof PolicyViolationError) {
        sendJson(res, 403, { error: "policy_violation" });
        return;
      }

      if (error instanceof ProviderError) {
        sendJson(res, 502, { error: "provider_error", code: error.code, retryable: error.retryable });
        return;
      }

      logger.error("api.deck.fetch_failed", {
        module: "api.sessions.deck",
        requestId,
        sessionHash: hashString(params.sessionId),
        userHash: userId ? hashString(userId) : undefined,
        error: error instanceof Error ? error.message : "unknown"
      });
      sendJson(res, 500, { error: "internal_error" });
    }
  };
}
