import type { ChallengesStore } from "./store.js";
import type { ChallengeDefinition, UserChallengeState } from "./types.js";

const nowIso = () => new Date().toISOString();

function seedDefinitions(): ChallengeDefinition[] {
  const base = nowIso();
  return [
    {
      id: "city-coffee-explorer",
      slug: "city-coffee-explorer",
      name: "Coffee Cartographer",
      description: "Save 5 distinct coffee places in Minneapolis.",
      cityLabel: "Minneapolis",
      categoryLabels: ["coffee"],
      scopeType: "mixed",
      track: "explorer",
      status: "active",
      criteria: [{ id: "save-coffee", eventType: "place_saved", target: 5, distinctPlacesOnly: true, scope: { cityIds: ["city-minneapolis"], categoryIds: ["coffee"] } }],
      reward: { xp: 200, badgeId: "coffee-cartographer" },
      visibility: "public",
      curation: { owner: "local-discovery" },
      createdAt: base,
      updatedAt: base
    },
    {
      id: "north-loop-hidden-gems-creator",
      slug: "north-loop-hidden-gems-creator",
      name: "North Loop Hidden Gems",
      description: "Publish 2 approved videos from hidden gems in North Loop.",
      cityLabel: "Minneapolis",
      neighborhoodLabel: "North Loop",
      categoryLabels: ["hidden_gems"],
      scopeType: "mixed",
      track: "creator",
      status: "active",
      criteria: [{ id: "hidden-gem-videos", eventType: "video_published", target: 2, distinctPlacesOnly: true, allowedContentStates: ["published", "approved"], minTrustScore: 40, scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-north-loop"], categoryIds: ["hidden_gems"] } }],
      reward: { xp: 320, profileShowcaseItem: "north-loop-spotlighter" },
      visibility: "public",
      curation: { owner: "creator-studio" },
      createdAt: base,
      updatedAt: base
    },
    {
      id: "downtown-nightlife-hotspots",
      slug: "downtown-nightlife-hotspots",
      name: "Downtown Nightlife Run",
      description: "Review 3 nightlife hotspots downtown.",
      cityLabel: "Minneapolis",
      neighborhoodLabel: "Downtown",
      categoryLabels: ["nightlife"],
      hotspotLabel: "Downtown nightlife hotspots",
      scopeType: "hotspot",
      track: "mixed",
      status: "active",
      criteria: [{ id: "nightlife-reviews", eventType: "review_created", target: 3, distinctPlacesOnly: true, allowedContentStates: ["published", "approved"], scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-downtown"], categoryIds: ["nightlife"], hotspotIds: ["hotspot-downtown-nightlife"] } }],
      reward: { xp: 280, badgeId: "night-owl" },
      visibility: "public",
      curation: { owner: "city-curation", tags: ["weekend", "hotspot"] },
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
