import type { DryadTipsAdapter, DryadTipsStore, DryadVideoTipIntent, VideoTipSummary } from "./types.js";
export interface VideoTipDependencies {
    getVideo(videoId: string): Promise<{
        id: string;
        canonicalPlaceId?: string;
        primaryTreeId?: string;
        authorUserId: string;
        authorProfileId?: string;
        status: string;
        moderationStatus: string;
    } | undefined>;
    getPrimaryWallet(userId: string): {
        publicKey: string;
    } | undefined;
}
export declare class DryadTipsService {
    private readonly store;
    private readonly deps;
    private readonly adapter;
    constructor(store: DryadTipsStore, deps: VideoTipDependencies, adapter?: DryadTipsAdapter);
    createVideoTipIntent(input: {
        videoId: string;
        senderUserId: string;
        senderWalletAddress: string;
        amountWei: bigint;
        note?: string;
        allowSelfTip?: boolean;
        platformFeeBps?: number;
        tipKind?: "water_tree" | "direct_eth";
    }): Promise<DryadVideoTipIntent>;
    private create;
    submitTip(input: {
        tipIntentId: string;
        senderUserId: string;
    }): Promise<DryadVideoTipIntent>;
    listTipsByVideo(videoId: string): DryadVideoTipIntent[];
    listSentTips(userId: string): DryadVideoTipIntent[];
    listReceivedTips(userId: string): DryadVideoTipIntent[];
    summarizeVideo(videoId: string): VideoTipSummary;
    summarizeCreator(recipientUserId: string): VideoTipSummary;
    private reduceSummary;
    private requireTip;
}
