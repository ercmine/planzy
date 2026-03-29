import type { PriceLevel } from "../plan.js";
export declare function priceHintToLevel(hint?: string | null): PriceLevel | undefined;
export declare function normalizePriceLevel(input: unknown): PriceLevel | undefined;
