import type { PerbugTipLedgerEvent, PerbugTipsStore, PerbugVideoTipIntent } from "./types.js";
export declare class MemoryPerbugTipsStore implements PerbugTipsStore {
    private readonly tips;
    private readonly ledger;
    saveTipIntent(tip: PerbugVideoTipIntent): void;
    getTipIntent(id: string): PerbugVideoTipIntent | null;
    listTipsByVideo(videoId: string): PerbugVideoTipIntent[];
    listTipsBySender(userId: string): PerbugVideoTipIntent[];
    listTipsByRecipient(recipientUserId: string): PerbugVideoTipIntent[];
    saveLedgerEvent(event: PerbugTipLedgerEvent): void;
    listLedgerEvents(tipIntentId: string): PerbugTipLedgerEvent[];
}
