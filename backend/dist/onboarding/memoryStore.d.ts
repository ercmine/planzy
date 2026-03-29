import type { OnboardingPreferences, OnboardingStore } from "./types.js";
export declare class MemoryOnboardingStore implements OnboardingStore {
    private readonly rows;
    get(userId: string): Promise<OnboardingPreferences | undefined>;
    save(pref: OnboardingPreferences): Promise<OnboardingPreferences>;
}
