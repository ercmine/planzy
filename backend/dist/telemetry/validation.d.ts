import type { TelemetryEventInput } from "./types.js";
export declare function validateTelemetryEventInput(x: unknown, sessionIdFromPath: string): TelemetryEventInput;
export declare function validateTelemetryBatch(x: unknown, sessionIdFromPath: string): TelemetryEventInput[];
