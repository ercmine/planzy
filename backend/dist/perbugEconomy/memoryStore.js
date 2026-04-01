const accountKey = (ownerType, ownerId) => `${ownerType}:${ownerId}`;
const collectionProgressKey = (collectionId, userId) => `${collectionId}:${userId}`;
export class MemoryPerbugEconomyStore {
    splitConfigs = new Map();
    accounts = new Map();
    ledger = [];
    quests = new Map();
    questCompletions = new Map();
    questCompletionsByUser = new Map();
    exploration = new Map();
    collections = new Map();
    collectionProgress = new Map();
    creatorRewardsByUser = new Map();
    creatorRewardsById = new Map();
    guides = new Map();
    guideAnalytics = new Map();
    memberships = new Map();
    offers = new Map();
    redemptionsByUser = new Map();
    fraudFlags = [];
    payoutProfiles = new Map();
    withdrawals = new Map();
    withdrawalsByUser = new Map();
    withdrawalsByIdempotency = new Map();
    listSplitConfigs() { return [...this.splitConfigs.values()].map((v) => structuredClone(v)); }
    saveSplitConfig(config) { this.splitConfigs.set(config.feature, structuredClone(config)); }
    getTokenAccount(ownerType, ownerId) {
        const value = this.accounts.get(accountKey(ownerType, ownerId));
        return value ? structuredClone(value) : null;
    }
    saveTokenAccount(account) { this.accounts.set(accountKey(account.ownerType, account.ownerId), structuredClone(account)); }
    listTokenAccounts(ownerType) {
        const values = [...this.accounts.values()];
        return values.filter((a) => !ownerType || a.ownerType === ownerType).map((a) => structuredClone(a));
    }
    addLedgerEntry(entry) { this.ledger.unshift(structuredClone(entry)); }
    listLedger(referenceType, referenceId) {
        return this.ledger.filter((entry) => {
            if (referenceType && entry.referenceType !== referenceType)
                return false;
            if (referenceId && entry.referenceId !== referenceId)
                return false;
            return true;
        }).map((entry) => structuredClone(entry));
    }
    saveQuest(quest) { this.quests.set(quest.id, structuredClone(quest)); }
    getQuest(questId) { return this.quests.has(questId) ? structuredClone(this.quests.get(questId)) : null; }
    listQuests() { return [...this.quests.values()].map((v) => structuredClone(v)); }
    saveQuestCompletion(completion) {
        this.questCompletions.set(completion.questId, [...(this.questCompletions.get(completion.questId) ?? []), structuredClone(completion)]);
        this.questCompletionsByUser.set(completion.userId, [...(this.questCompletionsByUser.get(completion.userId) ?? []), structuredClone(completion)]);
    }
    listQuestCompletions(questId) { return (this.questCompletions.get(questId) ?? []).map((v) => structuredClone(v)); }
    listQuestCompletionsForUser(userId) { return (this.questCompletionsByUser.get(userId) ?? []).map((v) => structuredClone(v)); }
    getExplorationProgress(userId) { return this.exploration.has(userId) ? structuredClone(this.exploration.get(userId)) : null; }
    saveExplorationProgress(progress) { this.exploration.set(progress.userId, structuredClone(progress)); }
    saveCollection(definition) { this.collections.set(definition.id, structuredClone(definition)); }
    listCollections() { return [...this.collections.values()].map((v) => structuredClone(v)); }
    getCollection(collectionId) { return this.collections.has(collectionId) ? structuredClone(this.collections.get(collectionId)) : null; }
    getCollectionProgress(collectionId, userId) {
        const value = this.collectionProgress.get(collectionProgressKey(collectionId, userId));
        return value ? structuredClone(value) : null;
    }
    saveCollectionProgress(progress) { this.collectionProgress.set(collectionProgressKey(progress.collectionId, progress.userId), structuredClone(progress)); }
    saveCreatorReward(record) {
        const userRewards = (this.creatorRewardsByUser.get(record.userId) ?? []).filter((item) => item.id !== record.id);
        userRewards.unshift(structuredClone(record));
        this.creatorRewardsByUser.set(record.userId, userRewards);
        this.creatorRewardsById.set(record.id, structuredClone(record));
    }
    listCreatorRewards(userId) { return (this.creatorRewardsByUser.get(userId) ?? []).map((v) => structuredClone(v)); }
    getCreatorReward(recordId) { return this.creatorRewardsById.has(recordId) ? structuredClone(this.creatorRewardsById.get(recordId)) : null; }
    saveGuide(guide) { this.guides.set(guide.id, structuredClone(guide)); }
    listGuides(curatorUserId) {
        return [...this.guides.values()].filter((guide) => !curatorUserId || guide.curatorUserId === curatorUserId).map((guide) => structuredClone(guide));
    }
    getGuide(guideId) { return this.guides.has(guideId) ? structuredClone(this.guides.get(guideId)) : null; }
    saveGuideAnalytics(analytics) { this.guideAnalytics.set(analytics.guideId, structuredClone(analytics)); }
    getGuideAnalytics(guideId) { return this.guideAnalytics.has(guideId) ? structuredClone(this.guideAnalytics.get(guideId)) : null; }
    saveMembership(membership) { this.memberships.set(membership.userId, structuredClone(membership)); }
    getMembership(userId) { return this.memberships.has(userId) ? structuredClone(this.memberships.get(userId)) : null; }
    saveOffer(offer) { this.offers.set(offer.id, structuredClone(offer)); }
    getOffer(offerId) { return this.offers.has(offerId) ? structuredClone(this.offers.get(offerId)) : null; }
    listOffers(placeId) { return [...this.offers.values()].filter((offer) => !placeId || offer.placeId === placeId).map((offer) => structuredClone(offer)); }
    saveRedemption(redemption) { this.redemptionsByUser.set(redemption.userId, [...(this.redemptionsByUser.get(redemption.userId) ?? []), structuredClone(redemption)]); }
    listRedemptions(userId) { return (this.redemptionsByUser.get(userId) ?? []).map((redemption) => structuredClone(redemption)); }
    addFraudFlag(flag) { this.fraudFlags.unshift(structuredClone(flag)); }
    listFraudFlags() { return this.fraudFlags.map((f) => structuredClone(f)); }
    savePayoutProfile(profile) {
        this.payoutProfiles.set(profile.userId, structuredClone(profile));
    }
    getPayoutProfile(userId) {
        return this.payoutProfiles.has(userId) ? structuredClone(this.payoutProfiles.get(userId)) : null;
    }
    saveWithdrawal(record) {
        this.withdrawals.set(record.id, structuredClone(record));
        const existing = (this.withdrawalsByUser.get(record.userId) ?? []).filter((item) => item.id !== record.id);
        this.withdrawalsByUser.set(record.userId, [structuredClone(record), ...existing]);
        this.withdrawalsByIdempotency.set(`${record.userId}:${record.idempotencyKey}`, record.id);
    }
    getWithdrawal(withdrawalId) {
        return this.withdrawals.has(withdrawalId) ? structuredClone(this.withdrawals.get(withdrawalId)) : null;
    }
    getWithdrawalByIdempotency(userId, idempotencyKey) {
        const key = `${userId}:${idempotencyKey}`;
        const id = this.withdrawalsByIdempotency.get(key);
        if (!id)
            return null;
        return this.getWithdrawal(id);
    }
    listWithdrawalsByUser(userId) {
        return (this.withdrawalsByUser.get(userId) ?? []).map((item) => structuredClone(item));
    }
}
