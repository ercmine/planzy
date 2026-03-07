import type { Category, PriceLevel } from "../../plans/types.js";

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  category?: Category;
  priceLevel?: PriceLevel;
  websiteLink?: string;
  callLink?: string;
}

export interface CreateIdeaResponse {
  ideaId: string;
  createdAtISO: string;
}

export interface ListIdeasResponse {
  sessionId: string;
  ideas: Array<{
    ideaId: string;
    title: string;
    description?: string;
    category?: Category;
    priceLevel?: PriceLevel;
    websiteLink?: string;
    callLink?: string;
    createdAtISO: string;
    createdByUserId?: string;
  }>;
  nextCursor: string | null;
}
