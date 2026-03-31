import type { PerbugTipsAdapter, PerbugTipsStore, PerbugVideoTipIntent, VideoTipSummary } from "./types.js";
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
export declare class PerbugTipsService {
    private readonly store;
    private readonly deps;
    private readonly adapter;
    constructor(store: PerbugTipsStore, deps: VideoTipDependencies, adapter?: PerbugTipsAdapter);
    createVideoTipIntent(input: {
        videoId: string;
        senderUserId: string;
        senderWalletAddress: string;
        amountWei: bigint;
        note?: string;
        allowSelfTip?: boolean;
        platformFeeBps?: number;
        tipKind?: "water_tree" | "direct_eth";
    }): Promise<PerbugVideoTipIntent>;
    private create;
    submitTip(input: {
        tipIntentId: string;
        senderUserId: string;
    }): Promise<PerbugVideoTipIntent>;
    listTipsByVideo(videoId: string): PerbugVideoTipIntent[];
    listSentTips(userId: string): PerbugVideoTipIntent[];
    listReceivedTips(userId: string): PerbugVideoTipIntent[];
    summarizeVideo(videoId: string): VideoTipSummary;
    summarizeCreator(recipientUserId: string): VideoTipSummary;
    private reduceSummary;
    private requireTip;
}
