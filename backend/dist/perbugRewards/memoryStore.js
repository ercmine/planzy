export class MemoryDryadRewardsStore {
    tiers = new Map();
    places = new Map();
    placeRewardStates = new Map();
    reviews = new Map();
    eligibility = new Map();
    claims = new Map();
    claimsByIdempotency = new Map();
    wallets = new Map();
    walletNonces = new Map();
    auditLogs = [];
    listRewardTiers() { return [...this.tiers.values()].sort((a, b) => a.startPosition - b.startPosition); }
    saveRewardTier(tier) { this.tiers.set(tier.id, tier); }
    listPlaces() { return [...this.places.values()]; }
    getPlace(placeId) { return this.places.get(placeId) ?? null; }
    savePlace(place) { this.places.set(place.id, place); }
    getPlaceRewardState(placeId) { return this.placeRewardStates.get(placeId) ?? null; }
    savePlaceRewardState(state) { this.placeRewardStates.set(state.placeId, state); }
    listReviewsForPlace(placeId) { return [...this.reviews.values()].filter((review) => review.placeId === placeId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
    listReviewsForUser(userId) { return [...this.reviews.values()].filter((review) => review.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    getReview(reviewId) { return this.reviews.get(reviewId) ?? null; }
    saveReview(review) { this.reviews.set(review.id, review); }
    getEligibility(reviewId) { return this.eligibility.get(reviewId) ?? null; }
    saveEligibility(record) { this.eligibility.set(record.reviewId, record); }
    listClaimsForUser(userId) { return [...this.claims.values()].filter((claim) => claim.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    getClaimByReview(reviewId) { return [...this.claims.values()].find((claim) => claim.reviewId === reviewId) ?? null; }
    getClaimByIdempotencyKey(idempotencyKey) { const claimId = this.claimsByIdempotency.get(idempotencyKey); return claimId ? this.claims.get(claimId) ?? null : null; }
    saveClaim(record) { this.claims.set(record.id, record); this.claimsByIdempotency.set(record.idempotencyKey, record.id); }
    listWalletsForUser(userId) { return [...this.wallets.values()].filter((wallet) => wallet.userId === userId); }
    getWalletByPublicKey(publicKey) { return this.wallets.get(publicKey) ?? null; }
    saveWallet(wallet) {
        if (wallet.isPrimary) {
            for (const existing of this.listWalletsForUser(wallet.userId)) {
                if (existing.publicKey !== wallet.publicKey && existing.isPrimary)
                    this.wallets.set(existing.publicKey, { ...existing, isPrimary: false });
            }
        }
        this.wallets.set(wallet.publicKey, wallet);
    }
    listWalletNonces(publicKey) { return [...(this.walletNonces.get(publicKey) ?? [])]; }
    saveWalletNonce(record) {
        const current = this.walletNonces.get(record.publicKey) ?? [];
        const next = [...current.filter((item) => item.id !== record.id), record].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
        this.walletNonces.set(record.publicKey, next);
    }
    listAuditLogs() { return [...this.auditLogs]; }
    addAuditLog(log) { this.auditLogs.push(log); }
}
