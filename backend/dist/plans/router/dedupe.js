import { dedupeAndMergePlans } from "./dedupeEngine.js";
export function dedupePlans(plans) {
    return dedupeAndMergePlans(plans).plans;
}
