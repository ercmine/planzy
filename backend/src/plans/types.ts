export type Category =
  | "food"
  | "drinks"
  | "coffee"
  | "outdoors"
  | "movies"
  | "music"
  | "shopping"
  | "wellness"
  | "sports"
  | "other";

export type PriceLevel = 0 | 1 | 2 | 3 | 4;

export interface TimeWindow {
  start: string;
  end: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SearchPlansInput {
  location: GeoPoint;
  radiusMeters: number;
  timeWindow?: TimeWindow;
  categories?: Category[];
  priceLevelMax?: PriceLevel;
  openNow?: boolean;
  limit?: number;
  cursor?: string | null;
  locale?: string;
}

export interface PlanDeepLinks {
  maps?: string;
  website?: string;
  call?: string;
  booking?: string;
  ticket?: string;
}

export interface NormalizedPlan {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  category: Category;
  description?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  distanceMeters?: number;
  priceLevel?: PriceLevel;
  rating?: number;
  reviewCount?: number;
  photos?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  hours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  deepLinks?: PlanDeepLinks;
  metadata?: Record<string, unknown>;
}

export interface SearchPlansResult {
  plans: NormalizedPlan[];
  nextCursor?: string | null;
  source: string;
  debug?: {
    tookMs: number;
    returned: number;
  };
}
