import type { GeoGeocodeRequest, GeoHealthResponse, GeoReverseGeocodeRequest, GeoReverseResult, GeoResult } from "./contracts.js";
import type { GeoClientConfig } from "./config.js";

export class GeoServiceClient {
  constructor(private readonly config: GeoClientConfig) {}

  async geocode(input: GeoGeocodeRequest): Promise<GeoResult[]> {
    const payload = await this.request<{ results: GeoResult[] }>("/v1/geocode", input);
    return payload.results;
  }

  async reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult> {
    const payload = await this.request<{ result: GeoReverseResult }>("/v1/reverse-geocode", input);
    return payload.result;
  }

  async health(): Promise<GeoHealthResponse> {
    return this.request<GeoHealthResponse>("/health", undefined, "GET");
  }

  private async request<T>(path: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
    let attempts = 0;
    const maxAttempts = Math.max(1, this.config.retries + 1);
    let lastError: unknown;

    while (attempts < maxAttempts) {
      attempts += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await fetch(new URL(path, this.config.baseUrl), {
          method,
          headers: {
            "content-type": "application/json",
            ...(this.config.authSecret ? { "x-perbug-geo-service": this.config.authSecret } : {})
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error(`geo_service_http_${res.status}`);
        }

        return (await res.json()) as T;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("geo_service_request_failed");
  }
}
