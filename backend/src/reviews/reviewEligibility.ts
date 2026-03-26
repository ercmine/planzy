import type { CanonicalPlace } from "../places/types.js";
import type { PlaceReview } from "./store.js";

export type ReviewEligibilityReasonCode =
  | "allowed"
  | "location_permission_missing"
  | "location_unavailable"
  | "location_too_old"
  | "accuracy_too_low"
  | "too_far_from_place"
  | "place_location_unknown"
  | "suspicious_location"
  | "already_reviewed_recently"
  | "review_locked_by_policy";

export interface DeviceLocationProof {
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  isMocked?: boolean;
  speedMps?: number;
}

export interface ReviewEligibilityDecision {
  allowed: boolean;
  reasonCode: ReviewEligibilityReasonCode;
  distanceMeters?: number;
  thresholdMeters?: number;
  requiresFreshLocation: boolean;
  requiresPermission: boolean;
  requiresCheckIn: boolean;
  message: string;
  riskFlags: string[];
}

export interface ReviewEligibilityPolicy {
  version: string;
  defaultRadiusMeters: number;
  placeTypeRadiusMeters: Record<string, number>;
  largeVenueRadiusMeters: number;
  staleLocationMs: number;
  maxAccuracyMeters: number;
  graceMeters: number;
  suspiciousSpeedMps: number;
  recentReviewCooldownMs: number;
}

export interface ReviewEligibilityAuditRecord {
  userId: string;
  placeId: string;
  checkedAt: string;
  decision: ReviewEligibilityDecision;
  location: DeviceLocationProof;
}

const DEFAULT_POLICY: ReviewEligibilityPolicy = {
  version: "v1.0",
  defaultRadiusMeters: Number(process.env.REVIEW_ELIGIBILITY_DEFAULT_RADIUS_METERS ?? 180),
  placeTypeRadiusMeters: {
    restaurant: Number(process.env.REVIEW_ELIGIBILITY_RESTAURANT_RADIUS_METERS ?? 140),
    cafe: Number(process.env.REVIEW_ELIGIBILITY_CAFE_RADIUS_METERS ?? 120),
    bar: Number(process.env.REVIEW_ELIGIBILITY_BAR_RADIUS_METERS ?? 140),
    park: Number(process.env.REVIEW_ELIGIBILITY_PARK_RADIUS_METERS ?? 280),
    museum: Number(process.env.REVIEW_ELIGIBILITY_MUSEUM_RADIUS_METERS ?? 260),
    stadium: Number(process.env.REVIEW_ELIGIBILITY_STADIUM_RADIUS_METERS ?? 420)
  },
  largeVenueRadiusMeters: Number(process.env.REVIEW_ELIGIBILITY_LARGE_VENUE_RADIUS_METERS ?? 360),
  staleLocationMs: Number(process.env.REVIEW_ELIGIBILITY_STALE_LOCATION_MS ?? 120000),
  maxAccuracyMeters: Number(process.env.REVIEW_ELIGIBILITY_MAX_ACCURACY_METERS ?? 70),
  graceMeters: Number(process.env.REVIEW_ELIGIBILITY_GRACE_METERS ?? 30),
  suspiciousSpeedMps: Number(process.env.REVIEW_ELIGIBILITY_SUSPICIOUS_SPEED_MPS ?? 80),
  recentReviewCooldownMs: Number(process.env.REVIEW_ELIGIBILITY_REVIEW_COOLDOWN_MS ?? 600000)
};

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function normalizeCategoryToken(place: CanonicalPlace): string {
  const value = place.canonicalCategory || "";
  return value.trim().toLowerCase();
}

function computeThresholdMeters(policy: ReviewEligibilityPolicy, place: CanonicalPlace): number {
  const category = normalizeCategoryToken(place);
  const categoryHit = Object.entries(policy.placeTypeRadiusMeters).find(([token]) => category.includes(token));
  const base = categoryHit?.[1] ?? policy.defaultRadiusMeters;
  const largeVenueKeywords = ["stadium", "arena", "campus", "mall", "park"];
  if (largeVenueKeywords.some((token) => category.includes(token))) {
    return Math.max(base, policy.largeVenueRadiusMeters);
  }
  return base;
}

function staleLocation(capturedAt: string | undefined, staleLocationMs: number, now: Date): boolean {
  if (!capturedAt) return true;
  const ts = Date.parse(capturedAt);
  if (!Number.isFinite(ts)) return true;
  return now.getTime() - ts > staleLocationMs;
}

export class ReviewEligibilityService {
  private readonly policy: ReviewEligibilityPolicy;
  private readonly audit: ReviewEligibilityAuditRecord[] = [];

  constructor(policy?: Partial<ReviewEligibilityPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy, placeTypeRadiusMeters: { ...DEFAULT_POLICY.placeTypeRadiusMeters, ...(policy?.placeTypeRadiusMeters ?? {}) } };
  }

  getPolicy(): ReviewEligibilityPolicy {
    return { ...this.policy, placeTypeRadiusMeters: { ...this.policy.placeTypeRadiusMeters } };
  }

  listAudit(userId?: string): ReviewEligibilityAuditRecord[] {
    return this.audit.filter((item) => !userId || item.userId === userId).slice(-200);
  }

  evaluate(input: {
    userId: string;
    place: CanonicalPlace | null;
    location: DeviceLocationProof;
    now?: Date;
    recentReviews?: PlaceReview[];
  }): ReviewEligibilityDecision {
    const now = input.now ?? new Date();
    const location = input.location;
    const riskFlags: string[] = [];

    if (!location) {
      return this.record(input.userId, input.place?.canonicalPlaceId ?? "unknown", location, {
        allowed: false,
        reasonCode: "location_permission_missing",
        requiresFreshLocation: true,
        requiresPermission: true,
        requiresCheckIn: false,
        message: "Turn on location permissions to review nearby places.",
        riskFlags
      }, now);
    }

    if (location.isMocked) riskFlags.push("mock_location_detected");
    if ((location.speedMps ?? 0) > this.policy.suspiciousSpeedMps) riskFlags.push("impossible_travel_speed");

    if (location.lat == null || location.lng == null) {
      return this.record(input.userId, input.place?.canonicalPlaceId ?? "unknown", location, {
        allowed: false,
        reasonCode: "location_unavailable",
        requiresFreshLocation: true,
        requiresPermission: false,
        requiresCheckIn: false,
        message: "We could not verify your current location yet.",
        riskFlags
      }, now);
    }

    if (!input.place || !Number.isFinite(input.place.latitude) || !Number.isFinite(input.place.longitude)) {
      return this.record(input.userId, input.place?.canonicalPlaceId ?? "unknown", location, {
        allowed: true,
        reasonCode: "allowed",
        requiresFreshLocation: false,
        requiresPermission: false,
        requiresCheckIn: true,
        message: "Location checks are limited for this place. Review accepted with reduced trust.",
        riskFlags: [...riskFlags, "place_location_unknown"]
      }, now);
    }

    if (staleLocation(location.capturedAt, this.policy.staleLocationMs, now)) {
      return this.record(input.userId, input.place.canonicalPlaceId, location, {
        allowed: false,
        reasonCode: "location_too_old",
        requiresFreshLocation: true,
        requiresPermission: false,
        requiresCheckIn: false,
        message: "Your location fix is too old. Refresh location and try again.",
        riskFlags
      }, now);
    }

    if ((location.accuracyMeters ?? Number.MAX_SAFE_INTEGER) > this.policy.maxAccuracyMeters) {
      return this.record(input.userId, input.place.canonicalPlaceId, location, {
        allowed: false,
        reasonCode: "accuracy_too_low",
        requiresFreshLocation: true,
        requiresPermission: false,
        requiresCheckIn: false,
        message: "Location accuracy is too low. Move to open sky and retry.",
        riskFlags
      }, now);
    }

    const thresholdMeters = computeThresholdMeters(this.policy, input.place) + this.policy.graceMeters + Math.min(location.accuracyMeters ?? 0, 35);
    const distanceMeters = haversineMeters(location.lat, location.lng, input.place.latitude, input.place.longitude);

    const recent = (input.recentReviews ?? []).find((item) => item.placeId === input.place?.canonicalPlaceId || item.canonicalPlaceId === input.place?.canonicalPlaceId);
    if (recent && Date.parse(recent.createdAt) > now.getTime() - this.policy.recentReviewCooldownMs) {
      return this.record(input.userId, input.place.canonicalPlaceId, location, {
        allowed: false,
        reasonCode: "already_reviewed_recently",
        distanceMeters,
        thresholdMeters,
        requiresFreshLocation: false,
        requiresPermission: false,
        requiresCheckIn: false,
        message: "You recently reviewed this place. Please wait before posting again.",
        riskFlags
      }, now);
    }

    if (riskFlags.includes("mock_location_detected")) {
      return this.record(input.userId, input.place.canonicalPlaceId, location, {
        allowed: false,
        reasonCode: "suspicious_location",
        distanceMeters,
        thresholdMeters,
        requiresFreshLocation: true,
        requiresPermission: false,
        requiresCheckIn: true,
        message: "Suspicious location signal detected. Move closer and refresh location.",
        riskFlags
      }, now);
    }

    if (distanceMeters > thresholdMeters) {
      return this.record(input.userId, input.place.canonicalPlaceId, location, {
        allowed: false,
        reasonCode: "too_far_from_place",
        distanceMeters,
        thresholdMeters,
        requiresFreshLocation: false,
        requiresPermission: false,
        requiresCheckIn: false,
        message: "Move closer to this place to leave a review.",
        riskFlags
      }, now);
    }

    return this.record(input.userId, input.place.canonicalPlaceId, location, {
      allowed: true,
      reasonCode: "allowed",
      distanceMeters,
      thresholdMeters,
      requiresFreshLocation: false,
      requiresPermission: false,
      requiresCheckIn: false,
      message: "Location verified. You can review this place now.",
      riskFlags
    }, now);
  }

  private record(userId: string, placeId: string, location: DeviceLocationProof, decision: ReviewEligibilityDecision, now: Date): ReviewEligibilityDecision {
    this.audit.push({ userId, placeId, checkedAt: now.toISOString(), location, decision });
    if (this.audit.length > 5_000) this.audit.splice(0, this.audit.length - 5_000);
    return decision;
  }
}
