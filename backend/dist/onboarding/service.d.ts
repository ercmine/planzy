import type { VideoPlatformService } from "../videoPlatform/service.js";
import type { OnboardingPreferences, OnboardingStore } from "./types.js";
export declare class OnboardingService {
    private readonly store;
    private readonly videos;
    private readonly now;
    constructor(store: OnboardingStore, videos: VideoPlatformService, now?: () => Date);
    getPreferences(userId: string): Promise<OnboardingPreferences>;
    updatePreferences(userId: string, patch: Partial<OnboardingPreferences>): Promise<OnboardingPreferences>;
    feedBootstrap(userId: string): Promise<Record<string, unknown>>;
    private defaultPreferences;
    private defaultScope;
}
