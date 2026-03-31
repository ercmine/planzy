import { amountToAtomicUnits } from "./solana/token.js";
export const DEFAULT_DISTINCT_SLOT = "base";
export const DEFAULT_RULE_VERSION = "perbug-rewards-v2";
export const PERBUG_DECIMALS = 9;
export const QUALITY_MULTIPLIERS = {
    low: 0.5,
    standard: 1,
    high: 1.25,
    featured: 1.5
};
export function defaultRewardTiers() {
    return [
        { id: "place-1", startPosition: 1, endPosition: 1, baseAmountAtomic: amountToAtomicUnits(200, PERBUG_DECIMALS), baseAmountDisplay: "200", active: true },
        { id: "place-2-5", startPosition: 2, endPosition: 5, baseAmountAtomic: amountToAtomicUnits(100, PERBUG_DECIMALS), baseAmountDisplay: "100", active: true },
        { id: "place-6-10", startPosition: 6, endPosition: 10, baseAmountAtomic: amountToAtomicUnits(50, PERBUG_DECIMALS), baseAmountDisplay: "50", active: true },
        { id: "place-11-20", startPosition: 11, endPosition: 20, baseAmountAtomic: amountToAtomicUnits(20, PERBUG_DECIMALS), baseAmountDisplay: "20", active: true },
        { id: "place-21-plus", startPosition: 21, endPosition: null, baseAmountAtomic: amountToAtomicUnits(5, PERBUG_DECIMALS), baseAmountDisplay: "5", active: true }
    ];
}
