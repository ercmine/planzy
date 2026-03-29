import type { AnalyticsEventContext, AnalyticsEventInput } from "./types.js";
import { type AnalyticsEventName } from "./events.js";
export declare function validateAnalyticsEventName(name: unknown): AnalyticsEventName;
export declare function validateAnalyticsEvent(input: unknown): AnalyticsEventInput;
export declare function sanitizeAnalyticsContext(input: AnalyticsEventContext): AnalyticsEventContext;
