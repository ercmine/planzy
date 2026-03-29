import type { CollaborativeGoalDefinition, FriendChallengeDefinition, FriendChallengeInstance, ShareableMoment, SocialActionEvent, SocialPrivacySettings } from "./types.js";
import type { SocialGamificationStore } from "./store.js";
export declare class MemorySocialGamificationStore implements SocialGamificationStore {
    private readonly challengeDefinitions;
    private readonly challengeInstances;
    private readonly goalDefinitions;
    private readonly processedEvents;
    private readonly moments;
    private readonly privacy;
    private readonly goalContributions;
    private readonly actionAudit;
    constructor();
    listChallengeDefinitions(): FriendChallengeDefinition[];
    getChallengeDefinition(id: string): FriendChallengeDefinition | undefined;
    listChallengeInstances(userId: string): FriendChallengeInstance[];
    getChallengeInstance(instanceId: string): FriendChallengeInstance | undefined;
    saveChallengeInstance(instance: FriendChallengeInstance): void;
    listGoalDefinitions(): CollaborativeGoalDefinition[];
    saveGoalDefinition(goal: CollaborativeGoalDefinition): void;
    markProcessedEvent(eventId: string): void;
    hasProcessedEvent(eventId: string): boolean;
    listMoments(userId: string): ShareableMoment[];
    createMoment(moment: ShareableMoment): void;
    getPrivacy(userId: string): SocialPrivacySettings | undefined;
    savePrivacy(settings: SocialPrivacySettings): void;
    incrementGoalContribution(goalId: string, userId: string, points: number): void;
    getGoalContribution(goalId: string): Record<string, number>;
    saveActionAudit(event: SocialActionEvent, reason: string): void;
    listActionAudit(): {
        event: SocialActionEvent;
        reason: string;
    }[];
}
