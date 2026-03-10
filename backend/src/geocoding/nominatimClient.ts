import { GeocodingError } from "./errors.js";
import type { GeocodeRequest, ReverseGeocodeRequest } from "./types.js";
import type { NominatimReverseItem, NominatimSearchItem } from "./normalization.js";

export interface NominatimClientOptions {
  baseUrl: string;
  timeoutMs: number;
  userAgent: string;
}

export class NominatimClient {
  constructor(private readonly options: NominatimClientOptions) {}

  async search(input: GeocodeRequest): Promise<NominatimSearchItem[]> {
    const url = new URL("/search", this.options.baseUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("q", input.query);
    url.searchParams.set("limit", String(input.limit ?? 5));
    if (input.language) url.searchParams.set("accept-language", input.language);
    if (input.countryCodes?.length) url.searchParams.set("countrycodes", input.countryCodes.join(","));
    if (input.viewbox) {
      url.searchParams.set("viewbox", input.viewbox.join(","));
      url.searchParams.set("bounded", "1");
    }
    return this.fetchJson<NominatimSearchItem[]>(url);
  }

  async reverse(input: ReverseGeocodeRequest): Promise<NominatimReverseItem> {
    const url = new URL("/reverse", this.options.baseUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(input.lat));
    url.searchParams.set("lon", String(input.lng));
    if (input.language) url.searchParams.set("accept-language", input.language);
    if (input.zoom !== undefined) url.searchParams.set("zoom", String(input.zoom));
    return this.fetchJson<NominatimReverseItem>(url);
  }

  async health(): Promise<void> {
    const url = new URL("/status", this.options.baseUrl);
    await this.fetchText(url);
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const text = await this.fetchText(url);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GeocodingError("malformed_response", "Nominatim response was not valid JSON", 502);
    }
  }

  private async fetchText(url: URL): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.options.userAgent
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new GeocodingError("provider_unavailable", `Nominatim request failed (${response.status})`, 503);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof GeocodingError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GeocodingError("timeout", "Nominatim request timed out", 504);
      }
      throw new GeocodingError("provider_unavailable", "Nominatim was unreachable", 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}
