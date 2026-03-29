import type { IncomingMessage, ServerResponse } from "node:http";
import { RankingConfigResolver, RankingConfigService } from "./tuning.js";
import type { PlaceDiscoveryRepository } from "./types.js";
export declare function createRankingTuningHandlers(service: RankingConfigService, resolver: RankingConfigResolver, repo: PlaceDiscoveryRepository): {
    list(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    createDraft(req: IncomingMessage, res: ServerResponse): Promise<void>;
    updateDraft(req: IncomingMessage, res: ServerResponse, configSetId: string): Promise<void>;
    validate(req: IncomingMessage, res: ServerResponse, configSetId: string): Promise<void>;
    publish(req: IncomingMessage, res: ServerResponse, configSetId: string): Promise<void>;
    rollback(req: IncomingMessage, res: ServerResponse): Promise<void>;
    audit(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    preview(req: IncomingMessage, res: ServerResponse): Promise<void>;
    ensureAdmin(req: IncomingMessage, res: ServerResponse): boolean;
};
