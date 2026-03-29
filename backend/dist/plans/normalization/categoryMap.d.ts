import type { Category } from "../plan.js";
/**
 * Priority is ordered from most broad / intentful to fallback categories.
 * This is intentionally deterministic for providers that emit many overlapping tags.
 */
export declare function mapProviderCategory(_provider: string, input: {
    categories?: string[];
    primary?: string | null;
}): Category;
