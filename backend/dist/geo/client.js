export class GeoServiceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async geocode(input) {
        const payload = await this.request("/v1/geocode", input);
        return payload.results;
    }
    async reverseGeocode(input) {
        const payload = await this.request("/v1/reverse-geocode", input);
        return payload.result;
    }
    async autocomplete(input) {
        const payload = await this.request("/v1/autocomplete", input);
        return payload.suggestions;
    }
    async placeLookup(input) {
        const payload = await this.request("/v1/place-lookup", input);
        return payload.candidates;
    }
    async areaContext(input) {
        const payload = await this.request("/v1/area-context", input);
        return payload.context;
    }
    async health() {
        return this.request("/health", undefined, "GET");
    }
    async request(path, body, method = "POST") {
        let attempts = 0;
        const maxAttempts = Math.max(1, this.config.retries + 1);
        let lastError;
        while (attempts < maxAttempts) {
            attempts += 1;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
            try {
                const res = await fetch(new URL(path, this.config.baseUrl), {
                    method,
                    headers: {
                        "content-type": "application/json",
                        ...(this.config.authSecret ? { "x-dryad-geo-service": this.config.authSecret } : {})
                    },
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal
                });
                if (!res.ok) {
                    throw new Error(`geo_service_http_${res.status}`);
                }
                return (await res.json());
            }
            catch (error) {
                lastError = error;
            }
            finally {
                clearTimeout(timeout);
            }
        }
        throw lastError instanceof Error ? lastError : new Error("geo_service_request_failed");
    }
}
