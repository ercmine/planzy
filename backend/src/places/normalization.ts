import { createHash } from "node:crypto";

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeDisplayName(value: string): string {
  return normalizeWhitespace(value.normalize("NFKC"));
}

export function normalizeComparisonName(value: string): string {
  return normalizeDisplayName(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(st|street)\b/g, "street")
    .replace(/\b(ave|avenue)\b/g, "avenue")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length >= 8 && value.startsWith("+")) {
    return `+${digits}`;
  }
  return undefined;
}

export function normalizeUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith("http")) {
      return undefined;
    }
    parsed.hash = "";
    if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
      parsed.port = "";
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function extractWebsiteDomain(value?: string): string | undefined {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return undefined;
  }
  try {
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

export function normalizeAddressComparison(input: {
  formattedAddress?: string;
  address1?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
}): string {
  return normalizeWhitespace(
    `${input.formattedAddress ?? ""} ${input.address1 ?? ""} ${input.locality ?? ""} ${input.region ?? ""} ${input.postalCode ?? ""}`
  )
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(st|street)\b/g, "street")
    .replace(/\b(ave|avenue)\b/g, "avenue");
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortDeep(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortDeep(entry)])
    );
  }
  return value;
}

export function stableHash(value: unknown): string {
  const serialized = JSON.stringify(sortDeep(value));
  return createHash("sha256").update(serialized).digest("hex");
}

export function buildSlug(name: string, idSuffix: string): string {
  const base = normalizeComparisonName(name).replace(/\s+/g, "-").slice(0, 56);
  return `${base || "place"}-${idSuffix.slice(0, 8)}`;
}

export function geohashLite(lat: number, lng: number): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export function jaccardSimilarity(a: string, b: string): number {
  const aSet = new Set(a.split(/\s+/).filter(Boolean));
  const bSet = new Set(b.split(/\s+/).filter(Boolean));
  if (aSet.size === 0 || bSet.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }
  const union = aSet.size + bSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
