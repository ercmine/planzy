import type { Plan } from "../plan.js";
import { dedupeAndMergePlans } from "./dedupeEngine.js";

export function dedupePlans(plans: Plan[]): Plan[] {
  return dedupeAndMergePlans(plans).plans;
}
