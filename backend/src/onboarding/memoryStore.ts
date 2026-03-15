import type { OnboardingPreferences, OnboardingStore } from "./types.js";

export class MemoryOnboardingStore implements OnboardingStore {
  private readonly rows = new Map<string, OnboardingPreferences>();

  async get(userId: string): Promise<OnboardingPreferences | undefined> {
    return this.rows.get(userId);
  }

  async save(pref: OnboardingPreferences): Promise<OnboardingPreferences> {
    this.rows.set(pref.userId, pref);
    return pref;
  }
}
