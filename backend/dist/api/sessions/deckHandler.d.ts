import type { IncomingMessage, ServerResponse } from "node:http";
import type { AppConfig } from "../../config/schema.js";
import type { Logger } from "../../logging/loggerTypes.js";
import type { Plan } from "../../plans/plan.js";
import type { Category } from "../../plans/types.js";
import { type ProviderRouter } from "../../plans/router/providerRouter.js";
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
export declare function parseDeckQuery(url: URL): DeckQueryParamsNormalized;
export declare function computeMix(plans: Plan[], providersUsed: string[]): DeckSourceMix;
export type SessionDeckHandler = (req: IncomingMessage, res: ServerResponse, params: {
    sessionId: string;
}) => Promise<void>;
export declare function createDeckHandler(deps: {
    router: ProviderRouter;
    logger?: Logger;
    config?: AppConfig;
}): (req: IncomingMessage, res: ServerResponse, params: {
    sessionId: string;
}) => Promise<void>;
export {};
