import type { CollaborativeGoalDefinition, FriendChallengeDefinition, FriendChallengeInstance, ShareableMoment, SocialActionEvent, SocialPrivacySettings } from "./types.js";
export interface SocialGamificationStore {
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
    listActionAudit(): Array<{
        event: SocialActionEvent;
        reason: string;
    }>;
}
