const VENUE_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "llc",
  "inc",
  "co",
  "company",
  "restaurant",
  "bar",
  "cafe",
  "coffee",
  "grill",
  "kitchen",
  "theater",
  "theaters",
  "theatre",
  "theatres"
]);


const ADDRESS_STOP_WORDS = new Set(["san", "francisco", "ca", "california", "usa", "us"]);

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  street: "st",
  st: "st",
  avenue: "ave",
  ave: "ave",
  road: "rd",
  rd: "rd",
  boulevard: "blvd",
  blvd: "blvd",
  drive: "dr",
  dr: "dr",
  lane: "ln",
  ln: "ln",
  north: "n",
  n: "n",
  south: "s",
  s: "s",
  east: "e",
  e: "e",
  west: "w",
  w: "w"
};

function normalizeCommon(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(s: string): string {
  try {
    const normalized = normalizeCommon(typeof s === "string" ? s : "");
    if (!normalized) {
      return "";
    }

    const tokens = normalized.split(" ").filter((token) => token.length > 0 && !VENUE_STOP_WORDS.has(token));
    return tokens.join(" ");
  } catch {
    return "";
  }
}

export function tokenize(s: string): string[] {
  try {
    if (typeof s !== "string" || s.trim().length === 0) {
      return [];
    }

    return s
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
  } catch {
    return [];
  }
}

export function jaccardSimilarity(aTokens: string[], bTokens: string[]): number {
  try {
    const aSet = new Set((Array.isArray(aTokens) ? aTokens : []).filter((token) => typeof token === "string" && token));
    const bSet = new Set((Array.isArray(bTokens) ? bTokens : []).filter((token) => typeof token === "string" && token));

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
  } catch {
    return 0;
  }
}

export function nameSimilarity(a: string, b: string): number {
  try {
    const aNorm = normalizeName(a);
    const bNorm = normalizeName(b);
    return jaccardSimilarity(tokenize(aNorm), tokenize(bNorm));
  } catch {
    return 0;
  }
}

function isUnitMarker(token: string): boolean {
  return token === "#" || token === "apt" || token === "suite";
}

export function normalizeAddress(s?: string): string {
  try {
    const normalized = normalizeCommon(typeof s === "string" ? s : "");
    if (!normalized) {
      return "";
    }

    const rawTokens = normalized.split(" ").filter(Boolean);
    const tokens: string[] = [];

    for (let index = 0; index < rawTokens.length; index += 1) {
      const token = rawTokens[index] ?? "";
      if (!token) {
        continue;
      }

      if (isUnitMarker(token)) {
        index += 1;
        continue;
      }

      if (token.startsWith("#")) {
        continue;
      }

      const standardized = ADDRESS_ABBREVIATIONS[token] ?? token;
      if (ADDRESS_STOP_WORDS.has(standardized)) {
        continue;
      }
      tokens.push(standardized);
    }

    return tokens.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export function addressSimilarity(a?: string, b?: string): number {
  try {
    if (!a || !b) {
      return 0;
    }

    const aNorm = normalizeAddress(a);
    const bNorm = normalizeAddress(b);
    return jaccardSimilarity(tokenize(aNorm), tokenize(bNorm));
  } catch {
    return 0;
  }
}
