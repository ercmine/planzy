import type { GeocodeResult, ReverseGeocodeResult } from "./types.js";

export interface NominatimSearchItem {
  display_name?: string;
  osm_id?: number;
  osm_type?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  importance?: number;
  boundingbox?: string[];
  address?: Record<string, string>;
}

export interface NominatimReverseItem {
  display_name?: string;
  osm_id?: number;
  osm_type?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
}

function readFloat(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveCity(address: Record<string, string> | undefined): string | undefined {
  if (!address) return undefined;
  return address.city ?? address.town ?? address.village ?? address.municipality ?? address.hamlet;
}

function resolveNeighborhood(address: Record<string, string> | undefined): string | undefined {
  if (!address) return undefined;
  return address.neighbourhood ?? address.suburb ?? address.city_district ?? address.quarter;
}

function parseBoundingBox(values: string[] | undefined): [number, number, number, number] | undefined {
  if (!values || values.length !== 4) return undefined;
  const parsed = values.map((entry) => Number(entry));
  if (parsed.some((entry) => !Number.isFinite(entry))) {
    return undefined;
  }
  return [parsed[0]!, parsed[1]!, parsed[2]!, parsed[3]!];
}

export function normalizeSearchItem(item: NominatimSearchItem): GeocodeResult | null {
  const lat = readFloat(item.lat);
  const lng = readFloat(item.lon);
  const displayName = item.display_name?.trim();
  if (lat === undefined || lng === undefined || !displayName) return null;

  return {
    displayName,
    lat,
    lng,
    osmId: item.osm_id,
    osmType: item.osm_type,
    city: resolveCity(item.address),
    county: item.address?.county,
    state: item.address?.state,
    postalCode: item.address?.postcode,
    country: item.address?.country,
    countryCode: item.address?.country_code?.toUpperCase(),
    neighborhood: resolveNeighborhood(item.address),
    boundingBox: parseBoundingBox(item.boundingbox),
    class: item.class,
    type: item.type,
    importance: item.importance,
    source: "nominatim"
  };
}

export function normalizeReverseItem(item: NominatimReverseItem): ReverseGeocodeResult | null {
  const lat = readFloat(item.lat);
  const lng = readFloat(item.lon);
  const displayName = item.display_name?.trim();
  if (lat === undefined || lng === undefined || !displayName) return null;

  return {
    displayName,
    lat,
    lng,
    osmId: item.osm_id,
    osmType: item.osm_type,
    city: resolveCity(item.address),
    county: item.address?.county,
    state: item.address?.state,
    postalCode: item.address?.postcode,
    country: item.address?.country,
    countryCode: item.address?.country_code?.toUpperCase(),
    neighborhood: resolveNeighborhood(item.address),
    source: "nominatim"
  };
}
