import type { IncomingMessage, ServerResponse } from "node:http";
import type { VideoPlatformService } from "./service.js";
export interface VideoPlatformHttpHandlers {
    createDraft(req: IncomingMessage, res: ServerResponse): Promise<void>;
    requestUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    finalizeUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    publish(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    retryUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    retryProcessing(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    processNextJob(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    updateDraft(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    listStudio(req: IncomingMessage, res: ServerResponse): Promise<void>;
    getStudioAnalytics(req: IncomingMessage, res: ServerResponse): Promise<void>;
    archiveDraft(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    trackEvent(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    likeVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    unlikeVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    saveVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    unsaveVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
    listSavedVideos(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
    listWatchHistory(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listFeed(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
    listPlaceVideos(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
    listCreatorVideos(req: IncomingMessage, res: ServerResponse, userId: string): Promise<void>;
    reportVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
}
export declare function createVideoPlatformHttpHandlers(service: VideoPlatformService): VideoPlatformHttpHandlers;
