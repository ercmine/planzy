import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViewerEngagementRewardsService } from "./service.js";
export interface ViewerEngagementRewardHttpHandlers {
    startSession(req: IncomingMessage, res: ServerResponse): Promise<void>;
    heartbeat(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
    pauseSession(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
    completeSession(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
    submitRating(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    submitComment(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    submitEngagement(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    getEligibility(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
    listRewards(req: IncomingMessage, res: ServerResponse): Promise<void>;
    rewardSummary(req: IncomingMessage, res: ServerResponse): Promise<void>;
    campaignMetadata(_req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    createSponsoredPool(req: IncomingMessage, res: ServerResponse): Promise<void>;
    mapVideoCampaign(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listRiskFlags(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
    updateRule(req: IncomingMessage, res: ServerResponse): Promise<void>;
    reverseReward(req: IncomingMessage, res: ServerResponse, ledgerEntryId: string): Promise<void>;
}
export declare function createViewerEngagementRewardsHttpHandlers(service: ViewerEngagementRewardsService): ViewerEngagementRewardHttpHandlers;
