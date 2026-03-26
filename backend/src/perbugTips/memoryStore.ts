import type { DryadTipLedgerEvent, DryadTipsStore, DryadVideoTipIntent } from "./types.js";

export class MemoryDryadTipsStore implements DryadTipsStore {
  private readonly tips = new Map<string, DryadVideoTipIntent>();
  private readonly ledger = new Map<string, DryadTipLedgerEvent[]>();

  saveTipIntent(tip: DryadVideoTipIntent): void { this.tips.set(tip.id, tip); }
  getTipIntent(id: string): DryadVideoTipIntent | null { return this.tips.get(id) ?? null; }
  listTipsByVideo(videoId: string): DryadVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.videoId === videoId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  listTipsBySender(userId: string): DryadVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.senderUserId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  listTipsByRecipient(recipientUserId: string): DryadVideoTipIntent[] { return [...this.tips.values()].filter((tip) => tip.recipientUserId === recipientUserId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  saveLedgerEvent(event: DryadTipLedgerEvent): void { this.ledger.set(event.tipIntentId, [...(this.ledger.get(event.tipIntentId) ?? []), event]); }
  listLedgerEvents(tipIntentId: string): DryadTipLedgerEvent[] { return [...(this.ledger.get(tipIntentId) ?? [])]; }
}
