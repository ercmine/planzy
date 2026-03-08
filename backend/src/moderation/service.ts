import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import type {
  ContentReport,
  ModerationAggregate,
  ModerationAuditEvent,
  ModerationContentInput,
  ModerationDecision,
  ModerationDecisionType,
  ModerationQueueFilter,
  ModerationQueueItem,
  ModerationSeverity,
  ModerationSignal,
  ModerationSource,
  ModerationState,
  ModerationTargetRef,
  ReportReasonCode
} from "./types.js";

const REPORT_RATE_LIMIT_WINDOW_MS = 60_000;
const REPORT_RATE_LIMIT_MAX = 12;
const AUTO_HIDE_THRESHOLD = 0.92;
const AUTO_LIMIT_THRESHOLD = 0.7;

function keyForTarget(target: ModerationTargetRef): string {
  return `${target.targetType}:${target.targetId}`;
}

function severityFromScore(score: number): ModerationSeverity {
  if (score >= 0.92) return "critical";
  if (score >= 0.78) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreTextSpam(text: string): number {
  const normalized = text.toLowerCase();
  const linkCount = (normalized.match(/https?:\/\//g) ?? []).length;
  const promoHits = (normalized.match(/promo|discount|dm me|telegram|whatsapp|visit my profile|code/gi) ?? []).length;
  const phoneEmailHits = (normalized.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d/gi) ?? []).length;
  const repeatedPunct = /!{4,}|\?{4,}/.test(normalized) ? 0.1 : 0;
  return clamp01((linkCount * 0.2) + (promoHits * 0.22) + (phoneEmailHits * 0.2) + repeatedPunct);
}

function scoreToxicity(text: string): number {
  const normalized = text.toLowerCase();
  const abuseHits = (normalized.match(/idiot|moron|trash|stupid|kill yourself|shut up/gi) ?? []).length;
  const slurHits = (normalized.match(/nazi|slur|hate you people/gi) ?? []).length;
  return clamp01((abuseHits * 0.15) + (slurHits * 0.45));
}

function scoreLowQuality(text: string): number {
  if (!text.trim()) return 0;
  const compact = text.replace(/\s+/g, " ").trim();
  const uniqueChars = new Set(compact.toLowerCase()).size;
  const entropyPenalty = compact.length >= 20 ? clamp01((6 - uniqueChars) / 6) : 0;
  const repetitivePenalty = /(.)\1{6,}/.test(compact) ? 0.6 : 0;
  return clamp01(Math.max(entropyPenalty, repetitivePenalty));
}

export interface ModerationEnforcementPort {
  applyState(target: ModerationTargetRef, state: ModerationState, reasonCode: string): Promise<void>;
}

export class ModerationService {
  private readonly reports = new Map<string, ContentReport[]>();
  private readonly reporterRateWindow = new Map<string, number[]>();
  private readonly signals = new Map<string, ModerationSignal[]>();
  private readonly decisions = new Map<string, ModerationDecision[]>();
  private readonly audits = new Map<string, ModerationAuditEvent[]>();
  private readonly states = new Map<string, ModerationState>();
  private readonly contentFingerprints = new Map<string, Array<{ userId?: string; normalizedText: string; createdAt: number; placeId?: string }>>();
  private readonly submissionTimesByUser = new Map<string, number[]>();

  constructor(private readonly enforcement?: ModerationEnforcementPort) {}

  async submitReport(input: {
    target: ModerationTargetRef;
    reporterUserId: string;
    reasonCode: ReportReasonCode;
    note?: string;
    now?: Date;
  }): Promise<{ accepted: true; reportId: string; aggregate: ModerationAggregate }> {
    const now = input.now ?? new Date();
    const targetKey = keyForTarget(input.target);
    const list = this.reports.get(targetKey) ?? [];
    const duplicate = list.find((report) => report.reporterUserId === input.reporterUserId && report.status === "open");
    if (duplicate) throw new ValidationError(["duplicate report for this target"]);

    const window = (this.reporterRateWindow.get(input.reporterUserId) ?? []).filter((ts) => now.getTime() - ts < REPORT_RATE_LIMIT_WINDOW_MS);
    if (window.length >= REPORT_RATE_LIMIT_MAX) throw new ValidationError(["report rate limit exceeded"]);
    window.push(now.getTime());
    this.reporterRateWindow.set(input.reporterUserId, window);

    const report: ContentReport = {
      id: randomUUID(),
      target: input.target,
      reporterUserId: input.reporterUserId,
      reasonCode: input.reasonCode,
      note: input.note,
      source: "user",
      status: "open",
      createdAt: now.toISOString()
    };
    list.push(report);
    this.reports.set(targetKey, list);
    this.pushAudit(input.target, {
      eventType: "report_created",
      source: "user_report",
      details: { reasonCode: input.reasonCode, note: input.note, reporterUserId: input.reporterUserId },
      actorUserId: input.reporterUserId,
      createdAt: now.toISOString()
    });

    const aggregate = this.getAggregate(input.target);
    if (aggregate.uniqueReporterCount >= 3 && this.currentState(input.target) === "active") {
      await this.transitionState({ target: input.target, newState: "pending_review", source: "user_report", actorUserId: input.reporterUserId, reasonCode: "report_threshold_reached", now });
    }
    return { accepted: true, reportId: report.id, aggregate: this.getAggregate(input.target) };
  }

  async analyzeContent(input: ModerationContentInput): Promise<{ signals: ModerationSignal[]; state: ModerationState }> {
    const now = input.createdAt ?? new Date();
    const textChunks = [input.text, input.title, input.caption].map((v) => String(v ?? "").trim()).filter(Boolean);
    const fullText = textChunks.join(" ").trim();
    const targetKey = keyForTarget(input.target);
    const existing = this.signals.get(targetKey) ?? [];
    const generated: ModerationSignal[] = [];

    if (fullText) {
      const spamScore = scoreTextSpam(fullText);
      const toxScore = scoreToxicity(fullText);
      const lowQualityScore = scoreLowQuality(fullText);
      const duplicateScore = this.calculateDuplicateScore(input.target, fullText, input.actorUserId, now);

      generated.push(...[
        { category: "spam", score: spamScore, ruleId: "spam.links_promotions", reasonCode: "spam_pattern_detected", explanation: "Detected link-heavy promotional pattern." },
        { category: "toxicity", score: toxScore, ruleId: "toxicity.abusive_language", reasonCode: "abusive_language_detected", explanation: "Detected abusive or harassing language indicators." },
        { category: "low_quality", score: lowQualityScore, ruleId: "quality.low_entropy", reasonCode: "low_quality_text", explanation: "Detected low-information or repetitive content." },
        { category: "duplicate", score: duplicateScore, ruleId: "duplicate.near_exact", reasonCode: "duplicate_content_suspected", explanation: "Text closely matches recent submissions." }
      ]
        .filter((item) => item.score >= 0.2)
        .map((item) => this.createSignal(input.target, "automated_rule", item.category as never, item.ruleId, item.score, item.reasonCode, item.explanation, now)));
    }

    if (input.actorUserId) {
      const activityScore = this.trackSubmissionBurst(input.actorUserId, now);
      if (activityScore >= 0.2) {
        generated.push(this.createSignal(input.target, "automated_rule", "suspicious_activity", "activity.burst_submission", activityScore, "bursty_activity_detected", "Account posted content rapidly compared with safe defaults.", now));
      }
    }

    const updated = [...existing, ...generated];
    if (updated.length) this.signals.set(targetKey, updated);
    for (const signal of generated) {
      this.pushAudit(input.target, { eventType: "signal_generated", source: "automated_rule", details: { signalId: signal.id, category: signal.category, ruleId: signal.ruleId, score: signal.score, severity: signal.severity, reasonCode: signal.reasonCode, confidence: signal.confidence }, createdAt: signal.createdAt });
    }

    const aggregateScore = generated.length ? Math.max(...generated.map((item) => item.score)) : 0;
    if (aggregateScore >= AUTO_HIDE_THRESHOLD) {
      await this.transitionState({ target: input.target, newState: "hidden", source: "automated_rule", actorUserId: input.actorUserId, reasonCode: "auto_hidden_high_confidence", now });
    } else if (aggregateScore >= AUTO_LIMIT_THRESHOLD) {
      await this.transitionState({ target: input.target, newState: "auto_limited", source: "automated_rule", actorUserId: input.actorUserId, reasonCode: "auto_limited_medium_confidence", now });
    } else if (generated.some((item) => item.severity === "high")) {
      await this.transitionState({ target: input.target, newState: "pending_review", source: "automated_rule", actorUserId: input.actorUserId, reasonCode: "high_risk_signal", now });
    }

    return { signals: generated, state: this.currentState(input.target) };
  }

  async adminDecision(input: {
    target: ModerationTargetRef;
    decisionType: ModerationDecisionType;
    reasonCode: string;
    notes?: string;
    actorUserId: string;
    now?: Date;
  }): Promise<ModerationDecision> {
    const now = input.now ?? new Date();
    const previousState = this.currentState(input.target);
    const newState = this.mapDecisionToState(input.decisionType, previousState);
    const decision: ModerationDecision = {
      id: randomUUID(),
      target: input.target,
      decisionType: input.decisionType,
      reasonCode: input.reasonCode,
      notes: input.notes,
      actorUserId: input.actorUserId,
      source: "admin_manual",
      previousState,
      newState,
      reversible: input.decisionType !== "remove",
      createdAt: now.toISOString()
    };
    const key = keyForTarget(input.target);
    this.decisions.set(key, [...(this.decisions.get(key) ?? []), decision]);
    await this.transitionState({ target: input.target, newState, source: "admin_manual", actorUserId: input.actorUserId, reasonCode: input.reasonCode, now });
    this.pushAudit(input.target, { eventType: decision.decisionType === "restore" ? "content_restored" : "decision_recorded", source: "admin_manual", actorUserId: input.actorUserId, details: { decisionId: decision.id, decisionType: decision.decisionType, previousState: decision.previousState, newState: decision.newState, reasonCode: decision.reasonCode, reversible: decision.reversible }, createdAt: decision.createdAt });

    const reports = this.reports.get(key);
    if (reports && ["keep", "restore", "remove", "hide", "reject"].includes(input.decisionType)) {
      for (const report of reports.filter((item) => item.status === "open")) {
        report.status = "resolved";
        report.resolvedAt = now.toISOString();
        report.resolvedBy = input.actorUserId;
      }
    }
    return decision;
  }

  getAggregate(target: ModerationTargetRef): ModerationAggregate {
    const key = keyForTarget(target);
    const reports = this.reports.get(key) ?? [];
    const openReports = reports.filter((item) => item.status === "open");
    const signals = this.signals.get(key) ?? [];
    const summary = {
      spamScore: Math.max(0, ...signals.filter((item) => item.category === "spam").map((item) => item.score)),
      toxicityScore: Math.max(0, ...signals.filter((item) => item.category === "toxicity").map((item) => item.score)),
      abuseScore: Math.max(0, ...signals.filter((item) => item.category === "abuse").map((item) => item.score)),
      fraudScore: Math.max(0, ...signals.filter((item) => item.category === "scam_fraud").map((item) => item.score)),
      duplicateScore: Math.max(0, ...signals.filter((item) => item.category === "duplicate").map((item) => item.score)),
      suspiciousActivityScore: Math.max(0, ...signals.filter((item) => item.category === "suspicious_activity").map((item) => item.score)),
      maxSeverity: signals.reduce<ModerationSeverity>((current, signal) => {
        const order: ModerationSeverity[] = ["low", "medium", "high", "critical"];
        return order.indexOf(signal.severity) > order.indexOf(current) ? signal.severity : current;
      }, "low")
    };
    const lastDecision = (this.decisions.get(key) ?? []).at(-1);
    return {
      state: this.currentState(target),
      reportCount: openReports.length,
      uniqueReporterCount: new Set(openReports.map((item) => item.reporterUserId)).size,
      scoreSummary: summary,
      reviewerUserId: lastDecision?.actorUserId,
      lastReviewedAt: lastDecision?.createdAt
    };
  }

  listQueue(filter: ModerationQueueFilter = {}): ModerationQueueItem[] {
    const queue: ModerationQueueItem[] = [];
    for (const key of new Set([...this.reports.keys(), ...this.signals.keys(), ...this.states.keys()])) {
      const [targetType, ...targetIdParts] = key.split(":");
      const target: ModerationTargetRef = { targetType: targetType as ModerationTargetRef["targetType"], targetId: targetIdParts.join(":") };
      const aggregate = this.getAggregate(target);
      const signals = this.signals.get(key) ?? [];
      if (filter.targetType && filter.targetType !== target.targetType) continue;
      if (filter.state && filter.state !== aggregate.state) continue;
      if (filter.severity && filter.severity !== aggregate.scoreSummary.maxSeverity) continue;
      if (filter.unresolvedOnly && aggregate.reportCount === 0 && ["active", "restored"].includes(aggregate.state)) continue;
      const queueType = this.resolveQueueType(aggregate, signals);
      if (!queueType) continue;
      queue.push({
        id: `queue_${key}`,
        target,
        queueType,
        severity: aggregate.scoreSummary.maxSeverity,
        source: signals.length ? "automated_rule" : "user_report",
        state: aggregate.state,
        unresolvedReports: aggregate.reportCount,
        signalCount: signals.length,
        aggregateScore: Math.max(aggregate.scoreSummary.spamScore, aggregate.scoreSummary.toxicityScore, aggregate.scoreSummary.duplicateScore, aggregate.scoreSummary.suspiciousActivityScore),
        summary: `${aggregate.reportCount} open reports, ${signals.length} signals`,
        createdAt: (this.audits.get(key) ?? [])[0]?.createdAt ?? new Date(0).toISOString(),
        updatedAt: (this.audits.get(key) ?? []).at(-1)?.createdAt ?? new Date(0).toISOString()
      });
    }
    return queue.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, Math.max(1, Math.min(filter.limit ?? 100, 200)));
  }

  getTargetDetails(target: ModerationTargetRef): { aggregate: ModerationAggregate; reports: ContentReport[]; signals: ModerationSignal[]; decisions: ModerationDecision[]; audits: ModerationAuditEvent[] } {
    const key = keyForTarget(target);
    return {
      aggregate: this.getAggregate(target),
      reports: [...(this.reports.get(key) ?? [])],
      signals: [...(this.signals.get(key) ?? [])],
      decisions: [...(this.decisions.get(key) ?? [])],
      audits: [...(this.audits.get(key) ?? [])]
    };
  }

  isPubliclyVisible(target: ModerationTargetRef): boolean {
    const state = this.currentState(target);
    return !["hidden", "removed", "rejected"].includes(state);
  }

  private async transitionState(input: { target: ModerationTargetRef; newState: ModerationState; source: ModerationSource; actorUserId?: string; reasonCode: string; now: Date }): Promise<void> {
    const previousState = this.currentState(input.target);
    if (previousState === input.newState) return;
    this.states.set(keyForTarget(input.target), input.newState);
    this.pushAudit(input.target, {
      eventType: "state_transition",
      source: input.source,
      actorUserId: input.actorUserId,
      details: { previousState, newState: input.newState, reasonCode: input.reasonCode },
      createdAt: input.now.toISOString()
    });
    if (this.enforcement) {
      await this.enforcement.applyState(input.target, input.newState, input.reasonCode);
    }
  }

  private currentState(target: ModerationTargetRef): ModerationState {
    return this.states.get(keyForTarget(target)) ?? "active";
  }

  private mapDecisionToState(decision: ModerationDecisionType, previousState: ModerationState): ModerationState {
    if (decision === "restore") return "restored";
    if (decision === "keep") return "active";
    if (decision === "limit_visibility") return "auto_limited";
    if (decision === "hide") return "hidden";
    if (decision === "remove") return "removed";
    if (decision === "reject") return "rejected";
    if (decision === "escalate_user_review") return "escalated";
    if (decision === "warn" || decision === "lock_edits") return previousState === "active" ? "pending_review" : previousState;
    return previousState;
  }

  private createSignal(target: ModerationTargetRef, source: ModerationSource, category: ModerationSignal["category"], ruleId: string, score: number, reasonCode: string, explanation: string, now: Date): ModerationSignal {
    return {
      id: randomUUID(),
      target,
      source,
      category,
      ruleId,
      severity: severityFromScore(score),
      confidence: clamp01(score + 0.05),
      score: clamp01(score),
      reasonCode,
      explanation,
      createdAt: now.toISOString()
    };
  }

  private pushAudit(target: ModerationTargetRef, event: Omit<ModerationAuditEvent, "id" | "target">): void {
    const key = keyForTarget(target);
    const next: ModerationAuditEvent = { id: randomUUID(), target, ...event };
    this.audits.set(key, [...(this.audits.get(key) ?? []), next]);
  }

  private calculateDuplicateScore(target: ModerationTargetRef, text: string, userId: string | undefined, now: Date): number {
    const normalized = text.toLowerCase().replace(/\W+/g, " ").trim();
    const row = this.contentFingerprints.get(target.targetType) ?? [];
    const recent = row.filter((item) => now.getTime() - item.createdAt < 24 * 60 * 60 * 1000);
    const same = recent.filter((item) => item.normalizedText === normalized);
    row.push({ userId, normalizedText: normalized, createdAt: now.getTime(), placeId: target.placeId });
    this.contentFingerprints.set(target.targetType, row.slice(-1000));
    if (!same.length) return 0;
    const acrossPlaces = same.some((item) => item.placeId && target.placeId && item.placeId !== target.placeId);
    return clamp01(0.35 + (same.length * 0.2) + (acrossPlaces ? 0.2 : 0));
  }

  private trackSubmissionBurst(userId: string, now: Date): number {
    const timestamps = (this.submissionTimesByUser.get(userId) ?? []).filter((ts) => now.getTime() - ts < 10 * 60_000);
    timestamps.push(now.getTime());
    this.submissionTimesByUser.set(userId, timestamps);
    if (timestamps.length <= 3) return 0;
    return clamp01((timestamps.length - 3) / 8);
  }

  private resolveQueueType(aggregate: ModerationAggregate, signals: ModerationSignal[]): ModerationQueueItem["queueType"] | null {
    if (aggregate.state === "hidden") return "hidden_pending_verification";
    if (aggregate.reportCount > 0) return "pending_reports";
    if (signals.some((item) => item.severity === "high" || item.severity === "critical")) return "high_risk_auto";
    if (aggregate.state === "escalated") return "escalated_repeat_offender";
    return null;
  }
}
