import type { ReviewsStore } from "../reviews/store.js";
import type { ModerationEnforcementPort } from "./service.js";
import type { ModerationState, ModerationTargetRef } from "./types.js";
export declare class ReviewsModerationEnforcementAdapter implements ModerationEnforcementPort {
    private readonly reviewsStore;
    constructor(reviewsStore: ReviewsStore);
    applyState(target: ModerationTargetRef, state: ModerationState, reasonCode: string): Promise<void>;
}
