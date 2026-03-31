import type { PerbugTipLedgerEvent, PerbugTipsStore, PerbugVideoTipIntent } from "./types.js";

export class MemoryPerbugTipsStore implements PerbugTipsStore {
  private readonly tips = new Map<string, PerbugVideoTipIntent>();
  private readonly ledger = new Map<string, PerbugTipLedgerEvent[]>();

  saveTipIntent(tip: PerbugVideoTipIntent): void { this.tips.set(tip.id, tip); }
  getTipIntent(id: string): PerbugVideoTipIntent | null { return this.tips.get(id) ?? null; }
  listTipsByVideo(videoId: string): PerbugVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.videoId === videoId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  listTipsBySender(userId: string): PerbugVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.senderUserId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  listTipsByRecipient(recipientUserId: string): PerbugVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.recipientUserId === recipientUserId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  saveLedgerEvent(event: PerbugTipLedgerEvent): void { this.ledger.set(event.tipIntentId, [...(this.ledger.get(event.tipIntentId) ?? []), event]); }
  listLedgerEvents(tipIntentId: string): PerbugTipLedgerEvent[] { return [...(this.ledger.get(tipIntentId) ?? [])]; }
}
