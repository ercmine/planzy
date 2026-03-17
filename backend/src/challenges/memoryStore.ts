import type { ChallengesStore } from "./store.js";
import type { ChallengeDefinition, UserChallengeState } from "./types.js";

const now = Date.now();
const iso = (offsetDays: number) => new Date(now + offsetDays * 24 * 60 * 60 * 1000).toISOString();

function seedDefinitions(): ChallengeDefinition[] {
  const base = new Date(now).toISOString();
  return [
    {
      id: "weekly-coffee-explorer",
      slug: "weekly-coffee-explorer",
      name: "This Week: Coffee Cartographer",
      description: "Save 5 distinct coffee places in Minneapolis this week.",
      cadence: "weekly",
      cityLabel: "Minneapolis",
      categoryLabels: ["coffee"],
      scopeType: "mixed",
      scope: { cityIds: ["city-minneapolis"], categoryIds: ["coffee"] },
      track: "explorer",
      status: "active",
      startsAt: iso(-2),
      endsAt: iso(5),
      timezone: "UTC",
      criteria: [{ id: "save-coffee", eventType: "place_saved", target: 5, distinctPlacesOnly: true, scope: { cityIds: ["city-minneapolis"], categoryIds: ["coffee"] } }],
      reward: { xp: 200, badgeId: "coffee-cartographer" },
      visibility: "public",
      liveOps: { owner: "local-discovery", tags: ["weekly", "explorer"] },
      rotation: { poolKey: "weekly-minneapolis-explorer", priority: 1, maxAppearancesPerWindow: 2 },
      createdAt: base,
      updatedAt: base
    },
    {
      id: "weekly-north-loop-creator",
      slug: "weekly-north-loop-creator",
      name: "This Week: North Loop Hidden Gems",
      description: "Publish 2 trusted hidden gem videos from North Loop.",
      cadence: "weekly",
      cityLabel: "Minneapolis",
      neighborhoodLabel: "North Loop",
      categoryLabels: ["hidden_gems"],
      scopeType: "mixed",
      scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-north-loop"], categoryIds: ["hidden_gems"] },
      track: "creator",
      status: "active",
      startsAt: iso(-1),
      endsAt: iso(5),
      timezone: "UTC",
      criteria: [{ id: "hidden-gem-videos", eventType: "video_published", target: 2, distinctPlacesOnly: true, allowedContentStates: ["published", "approved"], minTrustScore: 40, scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-north-loop"], categoryIds: ["hidden_gems"] } }],
      reward: { xp: 320, profileShowcaseItem: "north-loop-spotlighter", achievementProgress: [{ id: "creator-momentum", amount: 1 }] },
      visibility: "public",
      liveOps: { owner: "creator-studio", tags: ["weekly", "creator"] },
      rotation: { poolKey: "weekly-minneapolis-creator", priority: 2 },
      createdAt: base,
      updatedAt: base
    },
    {
      id: "seasonal-nightlife-hotspots",
      slug: "seasonal-nightlife-hotspots",
      name: "Spring City Quest: Downtown Nightlife Run",
      description: "Review 3 nightlife hotspots downtown before the seasonal event ends.",
      cadence: "seasonal",
      seasonKey: "spring-2026",
      eventTheme: "Spring City Quest",
      cityLabel: "Minneapolis",
      neighborhoodLabel: "Downtown",
      categoryLabels: ["nightlife"],
      hotspotLabel: "Downtown nightlife hotspots",
      scopeType: "hotspot",
      scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-downtown"], categoryIds: ["nightlife"], hotspotIds: ["hotspot-downtown-nightlife"] },
      track: "mixed",
      status: "active",
      startsAt: iso(-10),
      endsAt: iso(18),
      timezone: "UTC",
      criteria: [{ id: "nightlife-reviews", eventType: "review_created", target: 3, distinctPlacesOnly: true, allowedContentStates: ["published", "approved"], scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-downtown"], categoryIds: ["nightlife"], hotspotIds: ["hotspot-downtown-nightlife"] } }],
      reward: { xp: 280, bonusXp: 120, badgeId: "night-owl", profileShowcaseItem: "spring-city-finisher" },
      visibility: "public",
      liveOps: { owner: "city-curation", tags: ["seasonal", "hotspot"] },
      createdAt: base,
      updatedAt: base
    },
    {
      id: "event-waterfront-sprint",
      slug: "event-waterfront-sprint",
      name: "Upcoming: Waterfront Discovery Week",
      description: "Explore 8 waterfront spots in your region.",
      cadence: "event",
      eventTheme: "Summer Discovery Week",
      scopeType: "category",
      scope: { categoryIds: ["waterfront"] },
      track: "explorer",
      status: "scheduled",
      startsAt: iso(7),
      endsAt: iso(14),
      timezone: "UTC",
      criteria: [{ id: "waterfront-opens", eventType: "place_opened", target: 8, distinctPlacesOnly: true, scope: { categoryIds: ["waterfront"] } }],
      reward: { xp: 350, bonusXp: 200, badgeId: "waterfront-runner" },
      visibility: "public",
      liveOps: { owner: "seasonal-programming", notes: "Promote via city hub banner" },
      createdAt: base,
      updatedAt: base
    }
  ];
}

export class MemoryChallengesStore implements ChallengesStore {
  private definitions = seedDefinitions();
  private readonly userStates = new Map<string, UserChallengeState>();
  private readonly processedEvents = new Set<string>();

  listDefinitions(): ChallengeDefinition[] {
    return this.definitions.slice();
  }

  getDefinition(challengeId: string): ChallengeDefinition | null {
    return this.definitions.find((row) => row.id === challengeId) ?? null;
  }

  upsertDefinition(definition: ChallengeDefinition): void {
    const index = this.definitions.findIndex((row) => row.id === definition.id);
    if (index >= 0) this.definitions[index] = definition;
    else this.definitions.push(definition);
  }

  getUserState(userId: string): UserChallengeState | null {
    return this.userStates.get(userId) ?? null;
  }

  saveUserState(state: UserChallengeState): void {
    this.userStates.set(state.userId, state);
  }

  hasProcessedEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markProcessedEvent(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}
