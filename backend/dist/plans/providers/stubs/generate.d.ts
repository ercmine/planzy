import { type Category, type Plan } from "../../plan.js";
import type { SearchPlansInputNormalized } from "../../validation.js";
export interface StubGenOptions {
    provider: string;
    source: string;
    count: number;
    overlapKey?: string;
    overlapRate?: number;
    latencyMs?: number;
    failureRate?: number;
    categoriesBias?: Partial<Record<Category, number>>;
    kind?: "places" | "events" | "movies";
    signal?: AbortSignal;
}
export declare function generatePlans(input: SearchPlansInputNormalized, opts: StubGenOptions): Promise<Plan[]>;
