export type ModerationTargetType =
  | "review"
  | "review_media"
  | "place_media"
  | "business_reply"
  | "business_review_response"
  | "review_caption"
  | "review_title"
  | "media_caption"
  | "media_title"
  | "media_thumbnail";

export type ModerationState =
  | "active"
  | "pending_review"
  | "auto_limited"
  | "hidden"
  | "removed"
  | "rejected"
  | "restored"
  | "escalated";

export type ModerationSource = "user_report" | "automated_rule" | "admin_manual";

export type ModerationSeverity = "low" | "medium" | "high" | "critical";

export type ReportReasonCode =
  | "spam"
  | "harassment_bullying"
  | "hate_abusive_language"
  | "sexual_explicit"
  | "graphic_violent"
  | "dangerous_illegal"
  | "misleading_fake_review"
  | "off_topic_irrelevant"
  | "impersonation_stolen_content"
  | "privacy_violation"
  | "self_harm_concern"
  | "scam_fraud"
  | "other";

export interface ModerationTargetRef {
  targetType: ModerationTargetType;
  targetId: string;
  subjectUserId?: string;
  placeId?: string;
  reviewId?: string;
  mediaId?: string;
}

export interface ContentReport {
  id: string;
  target: ModerationTargetRef;
  reporterUserId: string;
  reasonCode: ReportReasonCode;
  note?: string;
  source: "user";
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ModerationSignal {
  id: string;
  target: ModerationTargetRef;
  source: ModerationSource;
  category:
    | "spam"
    | "toxicity"
    | "abuse"
    | "duplicate"
    | "suspicious_activity"
    | "scam_fraud"
    | "low_quality"
    | "unsafe_media"
    | "policy_keyword";
  ruleId: string;
  severity: ModerationSeverity;
  confidence: number;
  score: number;
  reasonCode: string;
  explanation: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ModerationDecisionType =
  | "keep"
  | "warn"
  | "limit_visibility"
  | "hide"
  | "remove"
  | "reject"
  | "restore"
  | "escalate_user_review"
  | "lock_edits";

export interface ModerationDecision {
  id: string;
  target: ModerationTargetRef;
  decisionType: ModerationDecisionType;
  reasonCode: string;
  notes?: string;
  actorUserId: string;
  source: ModerationSource;
  previousState: ModerationState;
  newState: ModerationState;
  reversible: boolean;
  createdAt: string;
}

export interface ModerationAuditEvent {
  id: string;
  target: ModerationTargetRef;
  eventType:
    | "report_created"
    | "signal_generated"
    | "state_transition"
    | "decision_recorded"
    | "report_resolved"
    | "content_restored";
  actorUserId?: string;
  source: ModerationSource;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ModerationAggregate {
  state: ModerationState;
  reportCount: number;
  uniqueReporterCount: number;
  scoreSummary: {
    spamScore: number;
    toxicityScore: number;
    abuseScore: number;
    fraudScore: number;
    duplicateScore: number;
    suspiciousActivityScore: number;
    maxSeverity: ModerationSeverity;
  };
  lastReviewedAt?: string;
  reviewerUserId?: string;
}

export interface ModerationQueueItem {
  id: string;
  target: ModerationTargetRef;
  queueType: "pending_reports" | "high_risk_auto" | "escalated_repeat_offender" | "hidden_pending_verification";
  severity: ModerationSeverity;
  source: ModerationSource;
  state: ModerationState;
  unresolvedReports: number;
  signalCount: number;
  aggregateScore: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueFilter {
  targetType?: ModerationTargetType;
  state?: ModerationState;
  severity?: ModerationSeverity;
  source?: ModerationSource;
  subjectUserId?: string;
  placeId?: string;
  unresolvedOnly?: boolean;
  limit?: number;
}

export interface ModerationContentInput {
  target: ModerationTargetRef;
  text?: string;
  title?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
  createdAt?: Date;
}
