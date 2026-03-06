import { NoScrapePolicy, PolicyViolationError } from "./noScrapePolicy.js";

export interface PolicyFetchOptions {
  policy: NoScrapePolicy;
  kind: "api" | "image" | "redirect";
  fetchFn?: typeof fetch;
}

function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

export function createPolicyFetch(opts: PolicyFetchOptions): typeof fetch {
  const baseFetch = opts.fetchFn ?? fetch;

  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = toUrlString(input);
    try {
      opts.policy.assertUrlAllowed(url, opts.kind);
    } catch (error) {
      if (error instanceof PolicyViolationError) {
        throw error;
      }
      throw new PolicyViolationError("Request blocked by no-scrape policy", { kind: `domain_${opts.kind}`, value: url });
    }

    return baseFetch(input as RequestInfo, init);
  }) as typeof fetch;
}
