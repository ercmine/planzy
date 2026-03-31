export class MemoryPerbugTipsStore {
    tips = new Map();
    ledger = new Map();
    saveTipIntent(tip) { this.tips.set(tip.id, tip); }
    getTipIntent(id) { return this.tips.get(id) ?? null; }
    listTipsByVideo(videoId) { return [...this.tips.values()].filter((tip) => tip.videoId === videoId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    listTipsBySender(userId) { return [...this.tips.values()].filter((tip) => tip.senderUserId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    listTipsByRecipient(recipientUserId) { return [...this.tips.values()].filter((tip) => tip.recipientUserId === recipientUserId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    saveLedgerEvent(event) { this.ledger.set(event.tipIntentId, [...(this.ledger.get(event.tipIntentId) ?? []), event]); }
    listLedgerEvents(tipIntentId) { return [...(this.ledger.get(tipIntentId) ?? [])]; }
}
