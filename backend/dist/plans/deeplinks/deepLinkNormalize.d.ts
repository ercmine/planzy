import type { PlanDeepLinksAny, PlanDeepLinksV2 } from "./deepLinkTypes.js";
export declare function normalizeDeepLinks(input: PlanDeepLinksAny | undefined): PlanDeepLinksV2 | undefined;
export declare function pickPreferredLinks(a?: PlanDeepLinksV2, b?: PlanDeepLinksV2): PlanDeepLinksV2 | undefined;
