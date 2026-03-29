import { PolicyViolationError } from "./noScrapePolicy.js";
function toUrlString(input) {
    if (typeof input === "string") {
        return input;
    }
    if (input instanceof URL) {
        return input.toString();
    }
    return input.url;
}
export function createPolicyFetch(opts) {
    const baseFetch = opts.fetchFn ?? fetch;
    return (async (input, init) => {
        const url = toUrlString(input);
        try {
            opts.policy.assertUrlAllowed(url, opts.kind);
        }
        catch (error) {
            if (error instanceof PolicyViolationError) {
                throw error;
            }
            throw new PolicyViolationError("Request blocked by no-scrape policy", { kind: `domain_${opts.kind}`, value: url });
        }
        return baseFetch(input, init);
    });
}
