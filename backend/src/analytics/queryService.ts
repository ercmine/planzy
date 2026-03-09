import type { ActorProfileType } from "./types.js";
import type { AnalyticsService } from "./service.js";
import type { AnalyticsEventName, AnalyticsEventCategory } from "./events.js";

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueActors: number;
  byEventName: Partial<Record<AnalyticsEventName, number>>;
  byCategory: Partial<Record<AnalyticsEventCategory, number>>;
  conversionRate?: number;
}

export class AnalyticsQueryService {
  constructor(private readonly analytics: AnalyticsService) {}

  async adminOverview(from: Date, to: Date): Promise<AnalyticsSummary> {
    return this.summarize({ from, to });
  }

  async creatorOverview(creatorId: string, from: Date, to: Date): Promise<AnalyticsSummary> {
    return this.summarize({ from, to, creatorId });
  }

  async businessOverview(businessId: string, from: Date, to: Date): Promise<AnalyticsSummary> {
    return this.summarize({ from, to, businessId });
  }

  private async summarize(filters: { from: Date; to: Date; creatorId?: string; businessId?: string; actorProfileType?: ActorProfileType }): Promise<AnalyticsSummary> {
    const events = (await this.analytics.listAll()).filter((event) => {
      const ts = new Date(event.occurredAt).getTime();
      if (ts < filters.from.getTime() || ts > filters.to.getTime()) return false;
      if (filters.creatorId && event.creatorId !== filters.creatorId) return false;
      if (filters.businessId && event.businessId !== filters.businessId) return false;
      if (filters.actorProfileType && event.actorProfileType !== filters.actorProfileType) return false;
      return true;
    });

    const byEventName: AnalyticsSummary["byEventName"] = {};
    const byCategory: AnalyticsSummary["byCategory"] = {};
    const users = new Set<string>();
    for (const event of events) {
      byEventName[event.eventName] = (byEventName[event.eventName] ?? 0) + 1;
      byCategory[event.eventCategory] = (byCategory[event.eventCategory] ?? 0) + 1;
      if (event.actorUserId) users.add(event.actorUserId);
    }

    const recommendation = byEventName.recommendation_impression ?? 0;
    const recommendationOpen = byEventName.recommendation_opened ?? 0;

    return {
      totalEvents: events.length,
      uniqueActors: users.size,
      byEventName,
      byCategory,
      conversionRate: recommendation > 0 ? recommendationOpen / recommendation : undefined
    };
  }
}
