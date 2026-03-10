import { randomUUID } from "node:crypto";

import type { ContentEngagementRecord, CreatorVideoRecord, FirstPartyPlaceMetrics, GuideItemRecord, GuideRecord, PlaceSaveRecord, ReviewRecord } from "./types.js";

export interface PlaceContentStore {
  createReview(input: Omit<ReviewRecord, "id" | "createdAt" | "updatedAt" | "helpfulCount" | "reportCount">): Promise<ReviewRecord>;
  listReviewsByPlace(canonicalPlaceId: string): Promise<ReviewRecord[]>;
  createVideo(input: Omit<CreatorVideoRecord, "id" | "createdAt" | "updatedAt" | "viewCount" | "likeCount">): Promise<CreatorVideoRecord>;
  listVideosByPlace(canonicalPlaceId: string): Promise<CreatorVideoRecord[]>;
  upsertSave(input: Omit<PlaceSaveRecord, "id" | "createdAt">): Promise<PlaceSaveRecord>;
  deleteSave(userId: string, canonicalPlaceId: string): Promise<void>;
  listSavesByPlace(canonicalPlaceId: string): Promise<PlaceSaveRecord[]>;
  createGuide(input: Omit<GuideRecord, "id" | "createdAt" | "updatedAt">): Promise<GuideRecord>;
  getGuide(guideId: string): Promise<GuideRecord | undefined>;
  addGuideItem(input: Omit<GuideItemRecord, "position" | "addedAt">): Promise<GuideItemRecord>;
  listGuideItems(guideId: string): Promise<GuideItemRecord[]>;
  listGuidesByPlace(canonicalPlaceId: string): Promise<GuideRecord[]>;
  appendEngagement(input: Omit<ContentEngagementRecord, "id">): Promise<ContentEngagementRecord>;
  listEngagementByPlace(canonicalPlaceId: string): Promise<ContentEngagementRecord[]>;
  listAllReviews(): Promise<ReviewRecord[]>;
  listAllVideos(): Promise<CreatorVideoRecord[]>;
  listAllGuides(): Promise<GuideRecord[]>;
  upsertPlaceMetrics(metrics: FirstPartyPlaceMetrics): Promise<FirstPartyPlaceMetrics>;
  getPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics | undefined>;
}

export class MemoryPlaceContentStore implements PlaceContentStore {
  private readonly reviews = new Map<string, ReviewRecord>();
  private readonly videos = new Map<string, CreatorVideoRecord>();
  private readonly saves = new Map<string, PlaceSaveRecord>();
  private readonly guides = new Map<string, GuideRecord>();
  private readonly guideItems = new Map<string, GuideItemRecord>();
  private readonly engagement = new Map<string, ContentEngagementRecord>();
  private readonly metrics = new Map<string, FirstPartyPlaceMetrics>();

  async createReview(input: Omit<ReviewRecord, "id" | "createdAt" | "updatedAt" | "helpfulCount" | "reportCount">): Promise<ReviewRecord> {
    const now = new Date().toISOString();
    const row: ReviewRecord = { ...input, id: `rvw_${randomUUID()}`, helpfulCount: 0, reportCount: 0, createdAt: now, updatedAt: now };
    this.reviews.set(row.id, row);
    return row;
  }

  async listReviewsByPlace(canonicalPlaceId: string): Promise<ReviewRecord[]> {
    return [...this.reviews.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  async createVideo(input: Omit<CreatorVideoRecord, "id" | "createdAt" | "updatedAt" | "viewCount" | "likeCount">): Promise<CreatorVideoRecord> {
    const now = new Date().toISOString();
    const row: CreatorVideoRecord = { ...input, id: `vid_${randomUUID()}`, viewCount: 0, likeCount: 0, createdAt: now, updatedAt: now };
    this.videos.set(row.id, row);
    return row;
  }

  async listVideosByPlace(canonicalPlaceId: string): Promise<CreatorVideoRecord[]> {
    return [...this.videos.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  async upsertSave(input: Omit<PlaceSaveRecord, "id" | "createdAt">): Promise<PlaceSaveRecord> {
    const key = `${input.userId}:${input.canonicalPlaceId}`;
    const existing = this.saves.get(key);
    if (existing) return existing;
    const row: PlaceSaveRecord = { ...input, id: `sav_${randomUUID()}`, createdAt: new Date().toISOString() };
    this.saves.set(key, row);
    return row;
  }

  async deleteSave(userId: string, canonicalPlaceId: string): Promise<void> {
    this.saves.delete(`${userId}:${canonicalPlaceId}`);
  }

  async listSavesByPlace(canonicalPlaceId: string): Promise<PlaceSaveRecord[]> {
    return [...this.saves.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  async createGuide(input: Omit<GuideRecord, "id" | "createdAt" | "updatedAt">): Promise<GuideRecord> {
    const now = new Date().toISOString();
    const row: GuideRecord = { ...input, id: `gde_${randomUUID()}`, createdAt: now, updatedAt: now };
    this.guides.set(row.id, row);
    return row;
  }

  async getGuide(guideId: string): Promise<GuideRecord | undefined> {
    return this.guides.get(guideId);
  }

  async addGuideItem(input: Omit<GuideItemRecord, "position" | "addedAt">): Promise<GuideItemRecord> {
    const key = `${input.guideId}:${input.canonicalPlaceId}`;
    const existing = this.guideItems.get(key);
    if (existing) return existing;
    const position = (await this.listGuideItems(input.guideId)).length;
    const row: GuideItemRecord = { ...input, position, addedAt: new Date().toISOString() };
    this.guideItems.set(key, row);
    return row;
  }

  async listGuideItems(guideId: string): Promise<GuideItemRecord[]> {
    return [...this.guideItems.values()].filter((item) => item.guideId === guideId).sort((a, b) => a.position - b.position);
  }

  async listGuidesByPlace(canonicalPlaceId: string): Promise<GuideRecord[]> {
    const guideIds = [...this.guideItems.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId).map((item) => item.guideId);
    return guideIds.map((id) => this.guides.get(id)).filter((item): item is GuideRecord => Boolean(item));
  }

  async appendEngagement(input: Omit<ContentEngagementRecord, "id">): Promise<ContentEngagementRecord> {
    const row: ContentEngagementRecord = { ...input, id: `eng_${randomUUID()}` };
    this.engagement.set(row.id, row);
    return row;
  }

  async listEngagementByPlace(canonicalPlaceId: string): Promise<ContentEngagementRecord[]> {
    return [...this.engagement.values()].filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  async listAllReviews(): Promise<ReviewRecord[]> {
    return [...this.reviews.values()];
  }

  async listAllVideos(): Promise<CreatorVideoRecord[]> {
    return [...this.videos.values()];
  }

  async listAllGuides(): Promise<GuideRecord[]> {
    return [...this.guides.values()];
  }

  async upsertPlaceMetrics(metrics: FirstPartyPlaceMetrics): Promise<FirstPartyPlaceMetrics> {
    this.metrics.set(metrics.canonicalPlaceId, metrics);
    return metrics;
  }

  async getPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics | undefined> {
    return this.metrics.get(canonicalPlaceId);
  }
}
