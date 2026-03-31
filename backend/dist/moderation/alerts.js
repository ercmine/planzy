import { randomUUID } from "node:crypto";
export class MemoryModerationAlertDispatcher {
    sent = [];
    async sendCaseAlert(input) {
        const record = {
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
export class WebhookModerationAlertDispatcher {
    cfg;
    fallback;
    constructor(cfg, fallback = new MemoryModerationAlertDispatcher()) {
        this.cfg = cfg;
        this.fallback = fallback;
    }
    async sendCaseAlert(input) {
        const reviewUrl = `${this.cfg.reviewBaseUrl.replace(/\/$/, "")}/moderation/targets/${encodeURIComponent(input.snapshot.target.targetType)}/${encodeURIComponent(input.snapshot.target.targetId)}`;
        const subject = `Perbug moderation case: ${input.snapshot.target.targetId}`;
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
            if (!response.ok)
                throw new Error(`email_http_${response.status}`);
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
        }
        catch {
            return this.fallback.sendCaseAlert(input);
        }
    }
}
