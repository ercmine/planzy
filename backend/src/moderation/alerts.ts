import { randomUUID } from "node:crypto";

import type { ModerationAlertRecord, ModerationCaseSnapshot } from "./types.js";

export interface ModerationAlertDispatcher {
  sendCaseAlert(input: { recipient: string; snapshot: ModerationCaseSnapshot; dedupeKey: string }): Promise<ModerationAlertRecord>;
}

export class MemoryModerationAlertDispatcher implements ModerationAlertDispatcher {
  readonly sent: ModerationAlertRecord[] = [];

  async sendCaseAlert(input: { recipient: string; snapshot: ModerationCaseSnapshot; dedupeKey: string }): Promise<ModerationAlertRecord> {
    const record: ModerationAlertRecord = {
      id: randomUUID(),
      target: input.snapshot.target,
      channel: "email",
      recipient: input.recipient,
      subject: `Moderation alert: ${input.snapshot.target.targetType} ${input.snapshot.target.targetId}`,
      dedupeKey: input.dedupeKey,
      status: "sent",
      createdAt: new Date().toISOString(),
      metadata: { reportCount: input.snapshot.aggregate.reportCount, state: input.snapshot.aggregate.state }
    };
    this.sent.push(record);
    return record;
  }
}

export class WebhookModerationAlertDispatcher implements ModerationAlertDispatcher {
  constructor(
    private readonly cfg: { endpoint: string; apiKey?: string; fromEmail: string; reviewBaseUrl: string },
    private readonly fallback: ModerationAlertDispatcher = new MemoryModerationAlertDispatcher()
  ) {}

  async sendCaseAlert(input: { recipient: string; snapshot: ModerationCaseSnapshot; dedupeKey: string }): Promise<ModerationAlertRecord> {
    const reviewUrl = `${this.cfg.reviewBaseUrl.replace(/\/$/, "")}/moderation/targets/${encodeURIComponent(input.snapshot.target.targetType)}/${encodeURIComponent(input.snapshot.target.targetId)}`;
    const subject = `Dryad moderation case: ${input.snapshot.target.targetId}`;
    const body = {
      from: this.cfg.fromEmail,
      to: [input.recipient],
      subject,
      text: [
        `Moderation case for ${input.snapshot.target.targetType}:${input.snapshot.target.targetId}`,
        `State: ${input.snapshot.aggregate.state}`,
        `Reports: ${input.snapshot.aggregate.reportCount}`,
        `Risk scores: nudity=${input.snapshot.aggregate.scoreSummary.nudityScore.toFixed(2)}, sexual=${input.snapshot.aggregate.scoreSummary.sexualContentScore.toFixed(2)}, violence=${input.snapshot.aggregate.scoreSummary.violenceScore.toFixed(2)}`,
        `Review link: ${reviewUrl}`
      ].join("\n")
    };
    try {
      const response = await fetch(this.cfg.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {})
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`email_http_${response.status}`);
      const payload = await response.json().catch(() => ({}));
      return {
        id: randomUUID(),
        target: input.snapshot.target,
        channel: "email",
        recipient: input.recipient,
        subject,
        dedupeKey: input.dedupeKey,
        status: "sent",
        providerMessageId: typeof payload?.id === "string" ? payload.id : undefined,
        createdAt: new Date().toISOString(),
        metadata: { reviewUrl }
      };
    } catch {
      return this.fallback.sendCaseAlert(input);
    }
  }
}
