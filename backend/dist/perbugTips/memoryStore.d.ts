import type { DryadTipLedgerEvent, DryadTipsStore, DryadVideoTipIntent } from "./types.js";
export declare class MemoryDryadTipsStore implements DryadTipsStore {
    private readonly tips;
    private readonly ledger;
    saveTipIntent(tip: DryadVideoTipIntent): void;
    getTipIntent(id: string): DryadVideoTipIntent | null;
    listTipsByVideo(videoId: string): DryadVideoTipIntent[];
    listTipsBySender(userId: string): DryadVideoTipIntent[];
    listTipsByRecipient(recipientUserId: string): DryadVideoTipIntent[];
    saveLedgerEvent(event: DryadTipLedgerEvent): void;
    listLedgerEvents(tipIntentId: string): DryadTipLedgerEvent[];
}
