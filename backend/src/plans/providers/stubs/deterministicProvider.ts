import { ProviderError, ValidationError } from "../../errors.js";
import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { validateSearchPlansInput } from "../../validation.js";
import { generatePlans, type StubGenOptions } from "./generate.js";

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null): number {
  if (!cursor) {
    return 0;
  }

  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number.parseInt(decoded, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(["cursor is invalid"]);
  }

  return parsed;
}

export class DeterministicStubProvider implements PlanProvider {
  public readonly name: string;

  public constructor(private readonly opts: StubGenOptions) {
    this.name = opts.provider;
  }

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    if (ctx?.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "Provider request was aborted",
        retryable: true,
        cause: ctx.signal.reason
      });
    }

    const normalized = validateSearchPlansInput(input);
    const offset = decodeCursor(normalized.cursor);

    const plans = await generatePlans(normalized, {
      ...this.opts,
      signal: ctx?.signal
    });

    if (ctx?.signal?.aborted) {
      throw new ProviderError({
        provider: this.name,
        code: "ABORTED",
        message: "Provider request was aborted",
        retryable: true,
        cause: ctx.signal.reason
      });
    }

    const paged = plans.slice(offset, offset + normalized.limit);
    const nextOffset = offset + paged.length;
    const nextCursor = nextOffset < plans.length ? encodeCursor(nextOffset) : null;

    return {
      plans: paged,
      nextCursor,
      source: this.opts.provider
    };
  }
}
