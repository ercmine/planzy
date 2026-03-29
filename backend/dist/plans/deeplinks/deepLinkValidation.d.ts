import type { PlanDeepLinksV2 } from "./deepLinkTypes.js";
export declare function isSafeHttpUrl(url: string): boolean;
export declare function isSafeCallUrl(url: string): boolean;
export declare function validatePlanDeepLinks(input: unknown): PlanDeepLinksV2 | undefined;
