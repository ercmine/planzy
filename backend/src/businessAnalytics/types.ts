export type BusinessAnalyticsEventType =
  | "place_view"
  | "business_profile_view"
  | "place_save"
  | "place_list_add"
  | "outbound_click"
  | "review_created"
  | "review_response"
  | "creator_content_exposure"
  | "creator_content_clickthrough";

export type OutboundClickTarget = "website" | "phone" | "booking" | "menu" | "directions" | "other";

export interface BusinessAnalyticsEvent {
  id: string;
  eventType: BusinessAnalyticsEventType;
  placeId: string;
  businessProfileId: string;
  occurredAt: string;
  sessionId?: string;
  userId?: string;
  creatorProfileId?: string;
  contentId?: string;
  sourceSurface?: string;
  outboundTarget?: OutboundClickTarget;
  rating?: number;
}

export interface BusinessDailyMetric {
  businessProfileId: string;
  placeId: string;
  date: string;
  views: number;
  uniqueViewersApprox: number;
  saves: number;
  listAdds: number;
  outboundClicks: number;
  clicksWebsite: number;
  clicksPhone: number;
  clicksBooking: number;
  clicksMenu: number;
  clicksDirections: number;
  reviewCount: number;
  ratingSum: number;
  ratingCount: number;
  reviewResponses: number;
  creatorExposure: number;
  creatorClickthrough: number;
}

export interface AnalyticsQuery {
  businessProfileId: string;
  placeIds: string[];
  from: string;
  to: string;
  compareFrom?: string;
  compareTo?: string;
  includeCreatorImpact?: boolean;
}

export interface KpiSummary {
  views: number;
  uniqueViewersApprox: number;
  saves: number;
  listAdds: number;
  outboundClicks: number;
  engagementScore: number;
  ctr: number;
  saveRate: number;
  newReviews: number;
  averageRating: number | null;
  reviewResponseRate: number | null;
  creatorDrivenEngagement: number;
}

export interface KpiDelta {
  metric: keyof KpiSummary;
  current: number | null;
  previous: number | null;
  delta: number | null;
  pctDelta: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  saves: number;
  outboundClicks: number;
  reviews: number;
  averageRating: number | null;
  creatorImpact: number;
}

export interface PlaceBreakdownRow {
  placeId: string;
  views: number;
  saves: number;
  outboundClicks: number;
  engagementScore: number;
  newReviews: number;
  averageRating: number | null;
  creatorImpact: number;
}

export interface CreatorImpactRow {
  creatorProfileId: string;
  exposure: number;
  clickthrough: number;
  savesAfterExposure: number;
  attribution: "direct" | "inferred";
}

export interface EntitlementState {
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  creatorImpactAnalytics: boolean;
  multiLocationAnalytics: boolean;
  exportAnalytics: boolean;
  extendedHistoryDays: number;
  lockedModules: Array<"timeseries" | "creator_impact" | "multi_location" | "export" | "advanced_breakdowns">;
}

export interface UpsellTrigger {
  code: string;
  message: string;
  recommendedPlan: "business-plus" | "business-elite";
}

export interface BusinessAnalyticsDashboard {
  scope: { businessProfileId: string; placeIds: string[]; from: string; to: string };
  kpis: KpiSummary;
  comparison?: KpiDelta[];
  timeSeries: TimeSeriesPoint[];
  placeBreakdown: PlaceBreakdownRow[];
  creatorImpact: CreatorImpactRow[];
  ratingDistribution: Array<{ stars: number; count: number }>;
  entitlements: EntitlementState;
  upsell: UpsellTrigger[];
}
