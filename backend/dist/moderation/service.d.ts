import type { ContentReport, ModerationAggregate, ModerationAuditEvent, ModerationContentInput, ModerationDecision, ModerationDecisionType, ModerationQueueFilter, ModerationQueueItem, ModerationSignal, ModerationSource, ModerationState, ModerationTargetRef, ModerationActorSummary, ModerationPlaceSummary, ModerationAlertRecord, ModerationCaseSnapshot, ReportReasonCode } from "./types.js";
import type { ModerationAlertDispatcher } from "./alerts.js";
export interface ModerationEnforcementPort {
    applyState(target: ModerationTargetRef, state: ModerationState, reasonCode: string): Promise<void>;
}
export interface ModerationServiceOptions {
    enforcement?: ModerationEnforcementPort;
    alertDispatcher?: ModerationAlertDispatcher;
    reportAlertRecipient?: string;
    targetContextLoader?: (target: ModerationTargetRef) => Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
}
export declare class ModerationService {
    private readonly reports;
    private readonly reporterRateWindow;
    private readonly signals;
    private readonly decisions;
    private readonly audits;
    private readonly states;
    private readonly alerts;
    private readonly contentFingerprints;
    private readonly submissionTimesByUser;
    private readonly enforcement?;
    private readonly alertDispatcher?;
    private readonly reportAlertRecipient;
    private readonly targetContextLoader?;
    constructor(options?: ModerationEnforcementPort | ModerationServiceOptions);
    submitReport(input: {
        target: ModerationTargetRef;
        reporterUserId: string;
        reasonCode: ReportReasonCode;
        note?: string;
        now?: Date;
    }): Promise<{
        accepted: true;
        reportId: string;
        aggregate: ModerationAggregate;
    }>;
    analyzeContent(input: ModerationContentInput): Promise<{
        signals: ModerationSignal[];
        state: ModerationState;
    }>;
    ingestSignals(input: {
        target: ModerationTargetRef;
        signals: Array<{
            category: ModerationSignal["category"];
            ruleId: string;
            score: number;
            reasonCode: string;
            explanation: string;
            metadata?: Record<string, unknown>;
        }>;
        actorUserId?: string;
        source?: ModerationSource;
        now?: Date;
    }): Promise<{
        signals: ModerationSignal[];
        state: ModerationState;
    }>;
    adminDecision(input: {
        target: ModerationTargetRef;
        decisionType: ModerationDecisionType;
        reasonCode: string;
        notes?: string;
        actorUserId: string;
        now?: Date;
    }): Promise<ModerationDecision>;
    getAggregate(target: ModerationTargetRef): ModerationAggregate;
    listQueue(filter?: ModerationQueueFilter): ModerationQueueItem[];
    getTargetDetails(target: ModerationTargetRef): {
        aggregate: ModerationAggregate;
        reports: ContentReport[];
        signals: ModerationSignal[];
        decisions: ModerationDecision[];
        audits: ModerationAuditEvent[];
        alerts: ModerationAlertRecord[];
    };
    isPubliclyVisible(target: ModerationTargetRef): boolean;
    getState(target: ModerationTargetRef): ModerationState;
    listActorSummaries(limit?: number): ModerationActorSummary[];
    listPlaceSummaries(limit?: number): ModerationPlaceSummary[];
    private transitionState;
    private currentState;
    private mapDecisionToState;
    private createSignal;
    private pushAudit;
    private calculateDuplicateScore;
    private trackSubmissionBurst;
    private resolveQueueType;
    getCaseSnapshot(target: ModerationTargetRef): Promise<ModerationCaseSnapshot>;
    private dispatchCaseAlertIfNeeded;
}
