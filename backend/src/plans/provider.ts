import type { SearchPlansInput, SearchPlansResult } from "./types.js";

export interface ProviderContext {
  requestId?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface PlanProvider {
  readonly name: string;
  /**
   * Search for plans using normalized constraints.
   * Cursor is opaque and provider-specific; callers must not inspect or mutate it.
   */
  searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}

export function makePlanId(source: string, sourceId: string): string {
  return `${source}:${sourceId}`;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return false;
}
