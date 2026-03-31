import type { CanonicalPlace, NormalizedProviderPlace, PlaceDescriptionCandidate, PlaceSourceRecord } from "./types.js";

const DESCRIPTION_VERSION = 1;

interface EnrichmentInput {
  existingPlace?: CanonicalPlace;
  normalized: NormalizedProviderPlace;
  sourceRecord: PlaceSourceRecord;
  canonicalCategory: string;
}

export interface DescriptionEnrichmentResult {
  shortDescription?: string;
  longDescription?: string;
  descriptionStatus: CanonicalPlace["descriptionStatus"];
  descriptionSourceType?: CanonicalPlace["descriptionSourceType"];
  descriptionSourceProvider?: string;
  descriptionSourceAttribution?: string;
  descriptionConfidence: number;
  descriptionGeneratedAt?: string;
  descriptionVersion: number;
  descriptionLanguage?: string;
  descriptionGenerationMethod?: CanonicalPlace["descriptionGenerationMethod"];
  selectedCandidate?: PlaceDescriptionCandidate;
  candidates: PlaceDescriptionCandidate[];
  alternates: PlaceDescriptionCandidate[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length < 20) return undefined;
  if (/^(no description available|n\/a|none)$/i.test(text)) return undefined;
  return text;
}

function buildCategoryLabel(category: string): string {
  const token = category.replace(/[_.-]+/g, " ").trim().toLowerCase();
  if (token.includes("restaurant") || token.includes("food")) return "restaurant";
  if (token.includes("cafe") || token.includes("coffee") || token.includes("bakery")) return "cafe";
  if (token.includes("bar") || token.includes("night")) return "bar";
  if (token.includes("hotel") || token.includes("lodging")) return "hotel";
  if (token.includes("retail") || token.includes("store") || token.includes("shop")) return "store";
  if (token.includes("salon") || token.includes("spa")) return "salon";
  if (token.includes("gym") || token.includes("fitness")) return "gym";
  if (token.includes("park") || token.includes("outdoor")) return "park";
  if (token.includes("museum") || token.includes("entertainment") || token.includes("attraction")) return "venue";
  if (token.includes("medical") || token.includes("dental") || token.includes("health")) return "clinic";
  if (token.includes("government") || token.includes("education") || token.includes("religious")) return "institution";
  if (token.includes("service")) return "service provider";
  return "place";
}

function buildLocationPhrase(normalized: NormalizedProviderPlace): string | undefined {
  return [normalized.neighborhood, normalized.locality, normalized.region].filter(Boolean).join(", ") || normalized.formattedAddress;
}

function buildStructuredSummary(normalized: NormalizedProviderPlace, canonicalCategory: string): { short: string; long: string } {
  const label = buildCategoryLabel(canonicalCategory);
  const location = buildLocationPhrase(normalized);
  const features: string[] = [];
  if (normalized.openNow !== undefined) features.push(normalized.openNow ? "currently marked open" : "hours available");
  if (normalized.rawHoursText.length > 0) features.push("hours listed");
  if (normalized.phone || normalized.websiteUrl) features.push("contact details");
  if (normalized.photos.length > 0) features.push("visitor photos");

  const lead = location ? `${label} in ${location}` : `${label} on Perbug`;
  const short = `${lead} with ${features.slice(0, 2).join(" and ") || "map location and business details"}.`;
  const long = `${lead} with ${features.join(", ") || "map location and basic business details"}. Categories and source records are merged from trusted providers to keep details current.`;
  return { short, long };
}

function makeCandidate(args: {
  text: string;
  sourceType: PlaceDescriptionCandidate["sourceType"];
  provider?: string;
  sourceRecordId?: string;
  attribution?: string;
  confidence: number;
  generationMethod: PlaceDescriptionCandidate["generationMethod"];
}): PlaceDescriptionCandidate {
  return {
    id: `${args.sourceType}:${Math.abs(hashCode(args.text)).toString(36)}`,
    text: args.text,
    sourceType: args.sourceType,
    provider: args.provider,
    sourceRecordId: args.sourceRecordId,
    attribution: args.attribution,
    confidence: args.confidence,
    generationMethod: args.generationMethod,
    freshnessTimestamp: nowIso(),
    createdAt: nowIso()
  };
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function compareCandidate(a: PlaceDescriptionCandidate, b: PlaceDescriptionCandidate): number {
  const priority = (candidate: PlaceDescriptionCandidate): number => {
    if (candidate.sourceType === "provider_editorial") return 4;
    if (candidate.sourceType === "provider") return 3;
    if (candidate.sourceType === "structured_synthesis") return 2;
    return 1;
  };

  return priority(b) - priority(a) || b.confidence - a.confidence || b.text.length - a.text.length;
}

function statusFromCandidate(candidate: PlaceDescriptionCandidate | undefined): CanonicalPlace["descriptionStatus"] {
  if (!candidate) return "empty";
  if (candidate.sourceType === "provider_editorial" || candidate.sourceType === "provider") return "provider";
  if (candidate.sourceType === "structured_synthesis") return "synthesized";
  return "fallback";
}

export function enrichPlaceDescriptions(input: EnrichmentInput): DescriptionEnrichmentResult {
  const providerText = cleanText(input.normalized.descriptionSnippet);
  const candidates: PlaceDescriptionCandidate[] = [];

  if (providerText) {
    candidates.push(makeCandidate({
      text: providerText,
      sourceType: input.normalized.provider === "google_places" ? "provider_editorial" : "provider",
      provider: input.normalized.provider,
      sourceRecordId: input.sourceRecord.sourceRecordId,
      attribution: input.normalized.provider,
      confidence: input.normalized.provider === "google_places" ? 0.94 : 0.88,
      generationMethod: "provider_text"
    }));
  }

  const structured = buildStructuredSummary(input.normalized, input.canonicalCategory);
  candidates.push(makeCandidate({
    text: structured.long,
    sourceType: "structured_synthesis",
    provider: input.normalized.provider,
    sourceRecordId: input.sourceRecord.sourceRecordId,
    attribution: "Perbug structured enrichment",
    confidence: 0.7,
    generationMethod: "structured_summary"
  }));

  candidates.push(makeCandidate({
    text: structured.short,
    sourceType: "minimal_fallback",
    provider: input.normalized.provider,
    sourceRecordId: input.sourceRecord.sourceRecordId,
    attribution: "Perbug fallback enrichment",
    confidence: 0.45,
    generationMethod: "minimal_summary"
  }));

  const deduped = [...new Map(candidates.map((candidate) => [candidate.text.toLowerCase(), candidate])).values()];
  deduped.sort(compareCandidate);
  const selected = deduped[0];

  const existing = input.existingPlace;
  const keepExisting = Boolean(
    existing?.descriptionConfidence &&
    existing.descriptionConfidence >= 0.9 &&
    selected &&
    selected.confidence < existing.descriptionConfidence
  );

  if (keepExisting) {
    return {
      shortDescription: existing?.shortDescription,
      longDescription: existing?.longDescription,
      descriptionStatus: existing?.descriptionStatus ?? "empty",
      descriptionSourceType: existing?.descriptionSourceType,
      descriptionSourceProvider: existing?.descriptionSourceProvider,
      descriptionSourceAttribution: existing?.descriptionSourceAttribution,
      descriptionConfidence: existing?.descriptionConfidence ?? 0,
      descriptionGeneratedAt: existing?.descriptionGeneratedAt,
      descriptionVersion: existing?.descriptionVersion ?? DESCRIPTION_VERSION,
      descriptionLanguage: existing?.descriptionLanguage,
      descriptionGenerationMethod: existing?.descriptionGenerationMethod,
      selectedCandidate: existing?.descriptionCandidates[0],
      candidates: deduped,
      alternates: deduped
    };
  }

  return {
    shortDescription: selected?.text ? selected.text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ") : undefined,
    longDescription: selected?.text,
    descriptionStatus: statusFromCandidate(selected),
    descriptionSourceType: selected?.sourceType,
    descriptionSourceProvider: selected?.provider,
    descriptionSourceAttribution: selected?.attribution,
    descriptionConfidence: selected?.confidence ?? 0,
    descriptionGeneratedAt: nowIso(),
    descriptionVersion: DESCRIPTION_VERSION,
    descriptionLanguage: "en",
    descriptionGenerationMethod: selected?.generationMethod,
    selectedCandidate: selected,
    candidates: deduped,
    alternates: deduped.slice(1)
  };
}
