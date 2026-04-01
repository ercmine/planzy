import type { BusinessQuest, CollectionDefinition, CollectionProgress, CreatorRewardRecord, CuratorGuide, CuratorGuideAnalytics, EconomyFraudFlag, EconomyLedgerEntry, EconomyStore, ExplorationProgress, Offer, PremiumMembership, QuestCompletion, Redemption, TokenAccount, TokenSplitConfig, UserPayoutProfile, WithdrawalRecord } from "./types.js";

const accountKey = (ownerType: TokenAccount["ownerType"], ownerId: string) => `${ownerType}:${ownerId}`;
const collectionProgressKey = (collectionId: string, userId: string) => `${collectionId}:${userId}`;

export class MemoryPerbugEconomyStore implements EconomyStore {
  private splitConfigs = new Map<string, TokenSplitConfig>();
  private accounts = new Map<string, TokenAccount>();
  private ledger: EconomyLedgerEntry[] = [];
  private quests = new Map<string, BusinessQuest>();
  private questCompletions = new Map<string, QuestCompletion[]>();
  private questCompletionsByUser = new Map<string, QuestCompletion[]>();
  private exploration = new Map<string, ExplorationProgress>();
  private collections = new Map<string, CollectionDefinition>();
  private collectionProgress = new Map<string, CollectionProgress>();
  private creatorRewardsByUser = new Map<string, CreatorRewardRecord[]>();
  private creatorRewardsById = new Map<string, CreatorRewardRecord>();
  private guides = new Map<string, CuratorGuide>();
  private guideAnalytics = new Map<string, CuratorGuideAnalytics>();
  private memberships = new Map<string, PremiumMembership>();
  private offers = new Map<string, Offer>();
  private redemptionsByUser = new Map<string, Redemption[]>();
  private fraudFlags: EconomyFraudFlag[] = [];
  private payoutProfiles = new Map<string, UserPayoutProfile>();
  private withdrawals = new Map<string, WithdrawalRecord>();
  private withdrawalsByUser = new Map<string, WithdrawalRecord[]>();
  private withdrawalsByIdempotency = new Map<string, string>();

  listSplitConfigs(): TokenSplitConfig[] { return [...this.splitConfigs.values()].map((v) => structuredClone(v)); }
  saveSplitConfig(config: TokenSplitConfig): void { this.splitConfigs.set(config.feature, structuredClone(config)); }

  getTokenAccount(ownerType: TokenAccount["ownerType"], ownerId: string): TokenAccount | null {
    const value = this.accounts.get(accountKey(ownerType, ownerId));
    return value ? structuredClone(value) : null;
  }
  saveTokenAccount(account: TokenAccount): void { this.accounts.set(accountKey(account.ownerType, account.ownerId), structuredClone(account)); }
  listTokenAccounts(ownerType?: TokenAccount["ownerType"]): TokenAccount[] {
    const values = [...this.accounts.values()];
    return values.filter((a) => !ownerType || a.ownerType === ownerType).map((a) => structuredClone(a));
  }

  addLedgerEntry(entry: EconomyLedgerEntry): void { this.ledger.unshift(structuredClone(entry)); }
  listLedger(referenceType?: string, referenceId?: string): EconomyLedgerEntry[] {
    return this.ledger.filter((entry) => {
      if (referenceType && entry.referenceType !== referenceType) return false;
      if (referenceId && entry.referenceId !== referenceId) return false;
      return true;
    }).map((entry) => structuredClone(entry));
  }

  saveQuest(quest: BusinessQuest): void { this.quests.set(quest.id, structuredClone(quest)); }
  getQuest(questId: string): BusinessQuest | null { return this.quests.has(questId) ? structuredClone(this.quests.get(questId)!) : null; }
  listQuests(): BusinessQuest[] { return [...this.quests.values()].map((v) => structuredClone(v)); }

  saveQuestCompletion(completion: QuestCompletion): void {
    this.questCompletions.set(completion.questId, [...(this.questCompletions.get(completion.questId) ?? []), structuredClone(completion)]);
    this.questCompletionsByUser.set(completion.userId, [...(this.questCompletionsByUser.get(completion.userId) ?? []), structuredClone(completion)]);
  }
  listQuestCompletions(questId: string): QuestCompletion[] { return (this.questCompletions.get(questId) ?? []).map((v) => structuredClone(v)); }
  listQuestCompletionsForUser(userId: string): QuestCompletion[] { return (this.questCompletionsByUser.get(userId) ?? []).map((v) => structuredClone(v)); }

  getExplorationProgress(userId: string): ExplorationProgress | null { return this.exploration.has(userId) ? structuredClone(this.exploration.get(userId)!) : null; }
  saveExplorationProgress(progress: ExplorationProgress): void { this.exploration.set(progress.userId, structuredClone(progress)); }

  saveCollection(definition: CollectionDefinition): void { this.collections.set(definition.id, structuredClone(definition)); }
  listCollections(): CollectionDefinition[] { return [...this.collections.values()].map((v) => structuredClone(v)); }
  getCollection(collectionId: string): CollectionDefinition | null { return this.collections.has(collectionId) ? structuredClone(this.collections.get(collectionId)!) : null; }
  getCollectionProgress(collectionId: string, userId: string): CollectionProgress | null {
    const value = this.collectionProgress.get(collectionProgressKey(collectionId, userId));
    return value ? structuredClone(value) : null;
  }
  saveCollectionProgress(progress: CollectionProgress): void { this.collectionProgress.set(collectionProgressKey(progress.collectionId, progress.userId), structuredClone(progress)); }

  saveCreatorReward(record: CreatorRewardRecord): void {
    const userRewards = (this.creatorRewardsByUser.get(record.userId) ?? []).filter((item) => item.id !== record.id);
    userRewards.unshift(structuredClone(record));
    this.creatorRewardsByUser.set(record.userId, userRewards);
    this.creatorRewardsById.set(record.id, structuredClone(record));
  }
  listCreatorRewards(userId: string): CreatorRewardRecord[] { return (this.creatorRewardsByUser.get(userId) ?? []).map((v) => structuredClone(v)); }
  getCreatorReward(recordId: string): CreatorRewardRecord | null { return this.creatorRewardsById.has(recordId) ? structuredClone(this.creatorRewardsById.get(recordId)!) : null; }

  saveGuide(guide: CuratorGuide): void { this.guides.set(guide.id, structuredClone(guide)); }
  listGuides(curatorUserId?: string): CuratorGuide[] {
    return [...this.guides.values()].filter((guide) => !curatorUserId || guide.curatorUserId === curatorUserId).map((guide) => structuredClone(guide));
  }
  getGuide(guideId: string): CuratorGuide | null { return this.guides.has(guideId) ? structuredClone(this.guides.get(guideId)!) : null; }
  saveGuideAnalytics(analytics: CuratorGuideAnalytics): void { this.guideAnalytics.set(analytics.guideId, structuredClone(analytics)); }
  getGuideAnalytics(guideId: string): CuratorGuideAnalytics | null { return this.guideAnalytics.has(guideId) ? structuredClone(this.guideAnalytics.get(guideId)!) : null; }

  saveMembership(membership: PremiumMembership): void { this.memberships.set(membership.userId, structuredClone(membership)); }
  getMembership(userId: string): PremiumMembership | null { return this.memberships.has(userId) ? structuredClone(this.memberships.get(userId)!) : null; }

  saveOffer(offer: Offer): void { this.offers.set(offer.id, structuredClone(offer)); }
  getOffer(offerId: string): Offer | null { return this.offers.has(offerId) ? structuredClone(this.offers.get(offerId)!) : null; }
  listOffers(placeId?: string): Offer[] { return [...this.offers.values()].filter((offer) => !placeId || offer.placeId === placeId).map((offer) => structuredClone(offer)); }
  saveRedemption(redemption: Redemption): void { this.redemptionsByUser.set(redemption.userId, [...(this.redemptionsByUser.get(redemption.userId) ?? []), structuredClone(redemption)]); }
  listRedemptions(userId: string): Redemption[] { return (this.redemptionsByUser.get(userId) ?? []).map((redemption) => structuredClone(redemption)); }

  addFraudFlag(flag: EconomyFraudFlag): void { this.fraudFlags.unshift(structuredClone(flag)); }
  listFraudFlags(): EconomyFraudFlag[] { return this.fraudFlags.map((f) => structuredClone(f)); }

  savePayoutProfile(profile: UserPayoutProfile): void {
    this.payoutProfiles.set(profile.userId, structuredClone(profile));
  }
  getPayoutProfile(userId: string): UserPayoutProfile | null {
    return this.payoutProfiles.has(userId) ? structuredClone(this.payoutProfiles.get(userId)!) : null;
  }

  saveWithdrawal(record: WithdrawalRecord): void {
    this.withdrawals.set(record.id, structuredClone(record));
    const existing = (this.withdrawalsByUser.get(record.userId) ?? []).filter((item) => item.id !== record.id);
    this.withdrawalsByUser.set(record.userId, [structuredClone(record), ...existing]);
    this.withdrawalsByIdempotency.set(`${record.userId}:${record.idempotencyKey}`, record.id);
  }
  getWithdrawal(withdrawalId: string): WithdrawalRecord | null {
    return this.withdrawals.has(withdrawalId) ? structuredClone(this.withdrawals.get(withdrawalId)!) : null;
  }
  getWithdrawalByIdempotency(userId: string, idempotencyKey: string): WithdrawalRecord | null {
    const key = `${userId}:${idempotencyKey}`;
    const id = this.withdrawalsByIdempotency.get(key);
    if (!id) return null;
    return this.getWithdrawal(id);
  }
  listWithdrawalsByUser(userId: string): WithdrawalRecord[] {
    return (this.withdrawalsByUser.get(userId) ?? []).map((item) => structuredClone(item));
  }
}
