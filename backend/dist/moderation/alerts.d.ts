import type { ModerationAlertRecord, ModerationCaseSnapshot } from "./types.js";
export interface ModerationAlertDispatcher {
    sendCaseAlert(input: {
        recipient: string;
        snapshot: ModerationCaseSnapshot;
        dedupeKey: string;
    }): Promise<ModerationAlertRecord>;
}
export declare class MemoryModerationAlertDispatcher implements ModerationAlertDispatcher {
    readonly sent: ModerationAlertRecord[];
    sendCaseAlert(input: {
        recipient: string;
        snapshot: ModerationCaseSnapshot;
        dedupeKey: string;
    }): Promise<ModerationAlertRecord>;
}
export declare class WebhookModerationAlertDispatcher implements ModerationAlertDispatcher {
    private readonly cfg;
    private readonly fallback;
    constructor(cfg: {
        endpoint: string;
        apiKey?: string;
        fromEmail: string;
        reviewBaseUrl: string;
    }, fallback?: ModerationAlertDispatcher);
    sendCaseAlert(input: {
        recipient: string;
        snapshot: ModerationCaseSnapshot;
        dedupeKey: string;
    }): Promise<ModerationAlertRecord>;
}
