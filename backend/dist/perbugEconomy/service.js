import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
const DECIMALS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const atomic = (v) => BigInt(Math.round(v * (10 ** DECIMALS)));
const nowIso = () => new Date().toISOString();
const toDateKey = (iso) => iso.slice(0, 10);
const ALL_FEATURES = ["business_sponsorship", "business_quest", "premium_membership", "ad_marketplace", "offer_redemption", "creator_reward", "curator_reward", "exploration_reward", "collection_reward"];
export class DryadEconomyService {
    store;
    constructor(store) {
        this.store = store;
        this.seedSplitConfig("system");
        this.getOrCreateAccount("platform", "treasury");
        this.getOrCreateAccount("platform", "burn");
        this.getOrCreateAccount("pool", "global_rewards");
    }
    seedSplitConfig(actor) {
        const existing = this.store.listSplitConfigs();
        if (existing.length > 0)
            return;
        for (const feature of ALL_FEATURES) {
            this.store.saveSplitConfig({
                feature,
                rewardPoolBps: feature === "premium_membership" ? 1000 : 5500,
                creatorPoolBps: ["creator_reward", "curator_reward"].includes(feature) ? 6500 : 1500,
                treasuryBps: 2200,
                burnBps: 500,
                partnerBps: 300,
                updatedAt: nowIso(),
                updatedBy: actor
            });
        }
    }
    creditUser(userId, amountDryad, actor = "system") {
        if (amountDryad <= 0)
            throw new ValidationError(["amountDryad must be positive"]);
        const amountAtomic = atomic(amountDryad);
        this.adjustBalance({ ownerType: "user", ownerId: userId, delta: amountAtomic, actor, feature: "exploration_reward", type: "admin_adjustment", referenceType: "credit", referenceId: userId });
        return this.getOrCreateAccount("user", userId);
    }
    creditBusiness(businessId, amountDryad, actor = "system") {
        if (amountDryad <= 0)
            throw new ValidationError(["amountDryad must be positive"]);
        const amountAtomic = atomic(amountDryad);
        this.adjustBalance({ ownerType: "business", ownerId: businessId, delta: amountAtomic, actor, feature: "business_quest", type: "admin_adjustment", referenceType: "credit_business", referenceId: businessId });
        return this.getOrCreateAccount("business", businessId);
    }
    createBusinessQuest(input) {
        if (input.rewardDryad <= 0 || input.budgetDryad <= 0)
            throw new ValidationError(["reward and budget must be positive"]);
        const quest = {
            id: `quest_${randomUUID()}`,
            businessId: input.businessId,
            placeId: input.placeId,
            title: input.title,
            status: "draft",
            actionType: input.actionType,
            rewardAtomic: atomic(input.rewardDryad),
            budgetAtomic: atomic(input.budgetDryad),
            paidAtomic: 0n,
            dailyCap: input.dailyCap,
            totalCap: input.totalCap,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            createdBy: input.createdBy,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        this.store.saveQuest(quest);
        this.adjustBalance({ ownerType: "business", ownerId: input.businessId, delta: -quest.budgetAtomic, actor: input.createdBy, feature: "business_quest", type: "spend", referenceType: "quest", referenceId: quest.id });
        this.allocateSplit("business_quest", quest.budgetAtomic, input.createdBy, "quest", quest.id);
        quest.status = "active";
        this.store.saveQuest(quest);
        return quest;
    }
    completeQuest(input) {
        const quest = this.requireQuest(input.questId);
        if (quest.status !== "active")
            throw new ValidationError(["quest not active"]);
        const completedAt = input.completedAt ?? nowIso();
        if (Date.parse(completedAt) < Date.parse(quest.startsAt) || Date.parse(completedAt) > Date.parse(quest.endsAt))
            throw new ValidationError(["quest completion outside quest window"]);
        const completions = this.store.listQuestCompletions(quest.id);
        const today = toDateKey(completedAt);
        if (completions.filter((item) => toDateKey(item.completedAt) === today).length >= quest.dailyCap)
            throw new ValidationError(["quest daily cap reached"]);
        if (completions.length >= quest.totalCap)
            throw new ValidationError(["quest total cap reached"]);
        if (completions.some((item) => item.userId === input.userId))
            throw new ValidationError(["quest already completed by user"]);
        const fraudReasons = [];
        if (input.deviceTrustScore < 0.35)
            fraudReasons.push("low_device_trust");
        const completion = {
            id: `qc_${randomUUID()}`,
            questId: quest.id,
            userId: input.userId,
            completedAt,
            rewardAtomic: quest.rewardAtomic,
            status: fraudReasons.length ? "manual_review" : "approved",
            fraudReasons
        };
        this.store.saveQuestCompletion(completion);
        if (completion.status === "manual_review") {
            this.flagFraud({ referenceType: "quest_completion", referenceId: completion.id, userId: input.userId, severity: "medium", reason: fraudReasons.join(",") });
            return completion;
        }
        quest.paidAtomic += quest.rewardAtomic;
        if (quest.paidAtomic >= quest.budgetAtomic)
            quest.status = "ended";
        quest.updatedAt = nowIso();
        this.store.saveQuest(quest);
        this.adjustBalance({ ownerType: "user", ownerId: input.userId, delta: quest.rewardAtomic, actor: "system", feature: "business_quest", type: "reward_payout", referenceType: "quest_completion", referenceId: completion.id });
        return completion;
    }
    recordExplorationCheckIn(input) {
        if (!input.verified || input.dwellSeconds < 90)
            throw new ValidationError(["check-in not eligible"]);
        const today = toDateKey(nowIso());
        const progress = this.store.getExplorationProgress(input.userId) ?? { userId: input.userId, streakDays: 0, uniquePlaces: [], uniqueNeighborhoods: [], totalPaidAtomic: 0n, updatedAt: nowIso() };
        const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
        if (progress.lastCheckInDate === today)
            throw new ValidationError(["daily exploration reward already claimed"]);
        progress.streakDays = progress.lastCheckInDate === yesterday ? progress.streakDays + 1 : 1;
        progress.lastCheckInDate = today;
        if (!progress.uniquePlaces.includes(input.placeId))
            progress.uniquePlaces.push(input.placeId);
        if (!progress.uniqueNeighborhoods.includes(input.neighborhoodId))
            progress.uniqueNeighborhoods.push(input.neighborhoodId);
        let payout = atomic(1.5);
        if (progress.streakDays >= 7)
            payout += atomic(2);
        if (progress.uniqueNeighborhoods.length % 5 === 0)
            payout += atomic(3);
        if (input.fromGuideId)
            payout += atomic(0.5);
        progress.totalPaidAtomic += payout;
        progress.updatedAt = nowIso();
        this.store.saveExplorationProgress(progress);
        this.adjustBalance({ ownerType: "user", ownerId: input.userId, delta: payout, actor: "system", feature: "exploration_reward", type: "reward_payout", referenceType: "exploration", referenceId: input.placeId });
        return { progress, payoutAtomic: payout };
    }
    upsertCollection(input, actor) {
        const previous = this.store.getCollection(input.id);
        const now = nowIso();
        const definition = { ...input, createdAt: previous?.createdAt ?? now, updatedAt: now };
        this.store.saveCollection(definition);
        this.addLedger("collection_reward", "admin_adjustment", 0n, actor, "collection", input.id, { op: previous ? "update" : "create" });
        return definition;
    }
    progressCollection(input) {
        const collection = this.requireCollection(input.collectionId);
        if (!collection.active)
            throw new ValidationError(["collection inactive"]);
        if (!collection.placeIds.includes(input.placeId))
            throw new ValidationError(["place not in collection"]);
        const progress = this.store.getCollectionProgress(collection.id, input.userId) ?? { collectionId: collection.id, userId: input.userId, visitedPlaceIds: [], claimedMilestones: [], totalPaidAtomic: 0n, updatedAt: nowIso() };
        if (!progress.visitedPlaceIds.includes(input.placeId))
            progress.visitedPlaceIds.push(input.placeId);
        let payout = 0n;
        const completedCount = progress.visitedPlaceIds.length;
        collection.milestoneRewardsAtomic.forEach((milestoneReward, index) => {
            const milestone = index + 1;
            if (completedCount >= milestone && !progress.claimedMilestones.includes(milestone)) {
                progress.claimedMilestones.push(milestone);
                payout += milestoneReward;
            }
        });
        if (completedCount >= collection.placeIds.length && !progress.completedAt) {
            progress.completedAt = nowIso();
            payout += collection.completionRewardAtomic;
        }
        progress.totalPaidAtomic += payout;
        progress.updatedAt = nowIso();
        this.store.saveCollectionProgress(progress);
        if (payout > 0n)
            this.adjustBalance({ ownerType: "user", ownerId: input.userId, delta: payout, actor: "system", feature: "collection_reward", type: "reward_payout", referenceType: "collection_progress", referenceId: `${collection.id}:${input.userId}` });
        return { progress, payoutAtomic: payout };
    }
    recordCreatorEngagement(input) {
        const score = input.qualitySignals.saves * 0.2 + input.qualitySignals.shares * 0.4 + input.qualitySignals.completionRate * 20 + input.qualitySignals.helpfulVotes * 0.3 + input.qualitySignals.visitsDriven * 1.1 + input.qualitySignals.redemptionsDriven * 2;
        const tierMultiplier = { bronze: 1, silver: 1.2, gold: 1.5, platinum: 1.8 }[input.trustTier];
        const base = Math.max(0, Math.round(score * tierMultiplier));
        const pendingAtomic = atomic(base / 10);
        const riskScore = input.selfDealDetected ? 0.85 : score < 5 ? 0.5 : 0.2;
        const reasons = [];
        if (input.selfDealDetected)
            reasons.push("self_dealing_detected");
        if (input.moderationState === "rejected")
            reasons.push("moderation_rejected");
        const status = reasons.length ? "rejected" : input.moderationState === "approved" ? "claimable" : "pending";
        const reward = {
            id: `cr_${randomUUID()}`,
            userId: input.userId,
            contentId: input.contentId,
            contentType: input.contentType,
            qualityScore: Number(score.toFixed(2)),
            trustTier: input.trustTier,
            pendingAtomic: status === "pending" ? pendingAtomic : 0n,
            claimableAtomic: status === "claimable" ? pendingAtomic : 0n,
            paidAtomic: 0n,
            status,
            moderationState: input.moderationState,
            riskScore,
            reasons,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        this.store.saveCreatorReward(reward);
        if (status === "rejected")
            this.flagFraud({ referenceType: "creator_reward", referenceId: reward.id, userId: input.userId, severity: "medium", reason: reasons.join(",") });
        return reward;
    }
    claimCreatorReward(input) {
        const reward = this.store.getCreatorReward(input.rewardId);
        if (!reward || reward.userId !== input.userId)
            throw new ValidationError(["creator reward not found"]);
        if (reward.status !== "claimable" || reward.claimableAtomic <= 0n)
            throw new ValidationError(["creator reward not claimable"]);
        reward.status = "paid";
        reward.paidAtomic += reward.claimableAtomic;
        const payout = reward.claimableAtomic;
        reward.claimableAtomic = 0n;
        reward.updatedAt = nowIso();
        this.store.saveCreatorReward(reward);
        this.adjustBalance({ ownerType: "user", ownerId: reward.userId, delta: payout, actor: "system", feature: reward.contentType === "guide" || reward.contentType === "route" || reward.contentType === "list" ? "curator_reward" : "creator_reward", type: "reward_payout", referenceType: "creator_reward", referenceId: reward.id });
        return reward;
    }
    createGuide(input) {
        const guide = { ...input, id: `guide_${randomUUID()}`, status: input.status ?? "draft", createdAt: nowIso(), updatedAt: nowIso() };
        this.store.saveGuide(guide);
        return guide;
    }
    recordGuidePerformance(input) {
        const guide = this.store.getGuide(input.guideId);
        if (!guide || guide.status !== "published")
            throw new ValidationError(["guide not published"]);
        const existing = this.store.getGuideAnalytics(guide.id) ?? { guideId: guide.id, saves: 0, follows: 0, drivenVisits: 0, completedRoutes: 0, downstreamReviews: 0, rewardAtomic: 0n, updatedAt: nowIso() };
        existing.saves += input.saves;
        existing.follows += input.follows;
        existing.drivenVisits += input.drivenVisits;
        existing.completedRoutes += input.completedRoutes;
        existing.downstreamReviews += input.downstreamReviews;
        const payout = atomic(input.saves * 0.05 + input.follows * 0.08 + input.drivenVisits * 0.25 + input.completedRoutes * 0.6 + input.downstreamReviews * 0.35);
        existing.rewardAtomic += payout;
        existing.updatedAt = nowIso();
        this.store.saveGuideAnalytics(existing);
        this.adjustBalance({ ownerType: "user", ownerId: guide.curatorUserId, delta: payout, actor: "system", feature: "curator_reward", type: "reward_payout", referenceType: "guide", referenceId: guide.id });
        return existing;
    }
    purchaseMembership(input) {
        const monthlyCost = input.tier === "elite" ? 39 : 19;
        const spendAtomic = atomic(monthlyCost * input.months);
        this.adjustBalance({ ownerType: "user", ownerId: input.userId, delta: -spendAtomic, actor: input.actor, feature: "premium_membership", type: "membership_purchase", referenceType: "membership", referenceId: input.userId });
        this.allocateSplit("premium_membership", spendAtomic, input.actor, "membership", input.userId);
        const existing = this.store.getMembership(input.userId);
        const startDate = existing && existing.active && Date.parse(existing.expiresAt) > Date.now() ? new Date(existing.expiresAt) : new Date();
        const expiresAt = new Date(startDate.getTime() + input.months * 30 * DAY_MS).toISOString();
        const membership = {
            userId: input.userId,
            tier: input.tier,
            startedAt: nowIso(),
            expiresAt,
            autoRenew: input.autoRenew,
            paidAtomic: (existing?.paidAtomic ?? 0n) + spendAtomic,
            active: true,
            createdAt: existing?.createdAt ?? nowIso(),
            updatedAt: nowIso()
        };
        this.store.saveMembership(membership);
        return membership;
    }
    createOffer(input) {
        const offer = {
            id: `offer_${randomUUID()}`,
            businessId: input.businessId,
            placeId: input.placeId,
            title: input.title,
            costAtomic: atomic(input.costDryad),
            inventory: input.inventory,
            redeemed: 0,
            status: "active",
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            createdBy: input.createdBy,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        this.store.saveOffer(offer);
        return offer;
    }
    redeemOffer(input) {
        const offer = this.requireOffer(input.offerId);
        if (offer.status !== "active")
            throw new ValidationError(["offer inactive"]);
        if (Date.parse(offer.endsAt) < Date.now())
            throw new ValidationError(["offer expired"]);
        if (offer.redeemed >= offer.inventory)
            throw new ValidationError(["offer inventory exhausted"]);
        if (input.deviceTrustScore < 0.3) {
            this.flagFraud({ referenceType: "offer", referenceId: offer.id, userId: input.userId, severity: "high", reason: "low_device_trust_redemption" });
            throw new ValidationError(["redemption requires manual review"]);
        }
        this.adjustBalance({ ownerType: "user", ownerId: input.userId, delta: -offer.costAtomic, actor: input.userId, feature: "offer_redemption", type: "offer_redemption", referenceType: "offer", referenceId: offer.id });
        this.allocateSplit("offer_redemption", offer.costAtomic, input.userId, "offer", offer.id);
        offer.redeemed += 1;
        offer.updatedAt = nowIso();
        if (offer.redeemed >= offer.inventory)
            offer.status = "ended";
        this.store.saveOffer(offer);
        const redemption = { id: `red_${randomUUID()}`, offerId: offer.id, userId: input.userId, redeemedAt: nowIso(), costAtomic: offer.costAtomic, status: "approved" };
        this.store.saveRedemption(redemption);
        return redemption;
    }
    updateTokenSplitConfig(input) {
        const total = input.rewardPoolBps + input.creatorPoolBps + input.treasuryBps + input.burnBps + input.partnerBps;
        if (total !== 10_000)
            throw new ValidationError(["split bps must total 10,000"]);
        const config = { ...input, updatedAt: nowIso(), updatedBy: input.actor };
        this.store.saveSplitConfig(config);
        this.addLedger(input.feature, "admin_adjustment", 0n, input.actor, "split_config", input.feature, { totalBps: total });
        return config;
    }
    adminDashboard() {
        const treasury = this.getOrCreateAccount("platform", "treasury").balanceAtomic;
        const burn = this.getOrCreateAccount("platform", "burn").balanceAtomic;
        const quests = this.store.listQuests();
        const activeQuests = quests.filter((quest) => quest.status === "active").length;
        const offers = this.store.listOffers();
        const memberships = this.store.listTokenAccounts("user").length;
        return {
            splits: this.store.listSplitConfigs(),
            treasuryAtomic: treasury,
            burnedAtomic: burn,
            activeQuests,
            activeOffers: offers.filter((offer) => offer.status === "active").length,
            trackedUserWallets: memberships,
            fraudFlags: this.store.listFraudFlags().slice(0, 50),
            recentLedger: this.store.listLedger().slice(0, 100)
        };
    }
    creatorDashboard(userId) {
        const rewards = this.store.listCreatorRewards(userId);
        const guideStats = this.store.listGuides(userId).map((guide) => ({ guide, analytics: this.store.getGuideAnalytics(guide.id) }));
        const wallet = this.getOrCreateAccount("user", userId);
        return {
            wallet,
            pendingAtomic: rewards.reduce((acc, item) => acc + item.pendingAtomic, 0n),
            claimableAtomic: rewards.reduce((acc, item) => acc + item.claimableAtomic, 0n),
            paidAtomic: rewards.reduce((acc, item) => acc + item.paidAtomic, 0n),
            rewards,
            guideStats
        };
    }
    consumerDashboard(userId) {
        return {
            wallet: this.getOrCreateAccount("user", userId),
            exploration: this.store.getExplorationProgress(userId),
            questCompletions: this.store.listQuestCompletionsForUser(userId),
            memberships: this.store.getMembership(userId),
            redemptions: this.store.listRedemptions(userId),
            activeQuests: this.store.listQuests().filter((quest) => quest.status === "active"),
            collections: this.store.listCollections().filter((collection) => collection.active)
        };
    }
    businessDashboard(businessId) {
        const quests = this.store.listQuests().filter((quest) => quest.businessId === businessId);
        const offers = this.store.listOffers().filter((offer) => offer.businessId === businessId);
        const questSpendAtomic = quests.reduce((acc, item) => acc + item.budgetAtomic, 0n);
        const questPaidAtomic = quests.reduce((acc, item) => acc + item.paidAtomic, 0n);
        return {
            wallet: this.getOrCreateAccount("business", businessId),
            quests,
            offers,
            questSpendAtomic,
            questPaidAtomic,
            offerRedemptions: offers.reduce((acc, item) => acc + item.redeemed, 0)
        };
    }
    allocateSplit(feature, grossAmount, actor, referenceType, referenceId) {
        const split = this.requireSplit(feature);
        const creatorAtomic = (grossAmount * BigInt(split.creatorPoolBps)) / 10000n;
        const rewardAtomic = (grossAmount * BigInt(split.rewardPoolBps)) / 10000n;
        const treasuryAtomic = (grossAmount * BigInt(split.treasuryBps)) / 10000n;
        const burnAtomic = (grossAmount * BigInt(split.burnBps)) / 10000n;
        const partnerAtomic = grossAmount - creatorAtomic - rewardAtomic - treasuryAtomic - burnAtomic;
        this.adjustBalance({ ownerType: "pool", ownerId: "creator", delta: creatorAtomic, actor, feature, type: "reward_reservation", referenceType, referenceId });
        this.adjustBalance({ ownerType: "pool", ownerId: "global_rewards", delta: rewardAtomic, actor, feature, type: "reward_reservation", referenceType, referenceId });
        this.adjustBalance({ ownerType: "platform", ownerId: "treasury", delta: treasuryAtomic + partnerAtomic, actor, feature, type: "treasury_allocation", referenceType, referenceId });
        this.adjustBalance({ ownerType: "platform", ownerId: "burn", delta: burnAtomic, actor, feature, type: "burn", referenceType, referenceId });
    }
    adjustBalance(input) {
        const account = this.getOrCreateAccount(input.ownerType, input.ownerId);
        const nextBalance = account.balanceAtomic + input.delta;
        if (nextBalance < 0n)
            throw new ValidationError([`insufficient balance for ${input.ownerType}:${input.ownerId}`]);
        account.balanceAtomic = nextBalance;
        account.updatedAt = nowIso();
        this.store.saveTokenAccount(account);
        this.addLedger(input.feature, input.type, input.delta < 0n ? -input.delta : input.delta, input.actor, input.referenceType, input.referenceId, { account: `${input.ownerType}:${input.ownerId}`, direction: input.delta < 0n ? "debit" : "credit" });
    }
    addLedger(feature, type, amountAtomic, actor, referenceType, referenceId, metadata) {
        this.store.addLedgerEntry({ id: `econ_led_${randomUUID()}`, feature, type, amountAtomic, referenceType, referenceId, metadata, createdAt: nowIso(), createdBy: actor });
    }
    requireSplit(feature) {
        const config = this.store.listSplitConfigs().find((item) => item.feature === feature);
        if (!config)
            throw new ValidationError([`missing split config for ${feature}`]);
        return config;
    }
    requireQuest(questId) {
        const quest = this.store.getQuest(questId);
        if (!quest)
            throw new ValidationError(["quest not found"]);
        return quest;
    }
    requireCollection(collectionId) {
        const collection = this.store.getCollection(collectionId);
        if (!collection)
            throw new ValidationError(["collection not found"]);
        return collection;
    }
    requireOffer(offerId) {
        const offer = this.store.getOffer(offerId);
        if (!offer)
            throw new ValidationError(["offer not found"]);
        return offer;
    }
    getOrCreateAccount(ownerType, ownerId) {
        const existing = this.store.getTokenAccount(ownerType, ownerId);
        if (existing)
            return existing;
        const account = { ownerType, ownerId, balanceAtomic: 0n, updatedAt: nowIso() };
        this.store.saveTokenAccount(account);
        return account;
    }
    flagFraud(input) {
        this.store.addFraudFlag({ id: `econ_ff_${randomUUID()}`, createdAt: nowIso(), ...input });
    }
}
