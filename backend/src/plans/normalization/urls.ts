const MAX_URL_LENGTH = 1000;

function asTrimmedString(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeHttpUrl(url: unknown): string | undefined {
  const value = asTrimmedString(url);
  if (!value || value.length > MAX_URL_LENGTH) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function normalizeTelUrl(url: unknown): string | undefined {
  const value = asTrimmedString(url);
  if (!value) {
    return undefined;
  }

  if (value.startsWith("tel:")) {
    const normalized = value.slice(4).replace(/[^+\d]/g, "");
    if (!normalized) {
      return undefined;
    }
    return `tel:${normalized}`;
  }

  const digits = value.replace(/[^+\d]/g, "");
  if (!digits) {
    return undefined;
  }

  return `tel:${digits}`;
}

export function buildMapsLink(lat: number, lng: number, label?: string): string {
  const query = label ? `${label} @ ${lat},${lng}` : `${lat},${lng}`;
  const params = new URLSearchParams({
    api: "1",
    query
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
