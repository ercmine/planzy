import type { PlanProvider } from "../../provider.js";
import { DeterministicStubProvider } from "./deterministicProvider.js";

export function createDevStubProviders(): PlanProvider[] {
  return [
    new DeterministicStubProvider({
      provider: "google_stub",
      source: "google",
      count: 80,
      overlapKey: "overlap-v1",
      overlapRate: 0.3,
      kind: "places"
    }),
    new DeterministicStubProvider({
      provider: "yelp_stub",
      source: "yelp",
      count: 80,
      overlapKey: "overlap-v1",
      overlapRate: 0.3,
      kind: "places"
    }),
    new DeterministicStubProvider({
      provider: "ticketmaster_stub",
      source: "ticketmaster",
      count: 60,
      kind: "events"
    }),
    new DeterministicStubProvider({
      provider: "tmdb_stub",
      source: "tmdb",
      count: 60,
      kind: "movies"
    })
  ];
}
