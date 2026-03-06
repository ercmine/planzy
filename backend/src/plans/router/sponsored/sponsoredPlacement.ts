import type { Plan } from "../../plan.js";
import type { SearchPlansInput } from "../../types.js";
import type {
  SponsoredPlacementDebug,
  SponsoredPlacementOptions,
  SponsoredPlacementResult
} from "./sponsoredTypes.js";

const DEFAULT_OPTIONS: Required<Omit<SponsoredPlacementOptions, "labelText">> & {
  labelText: NonNullable<SponsoredPlacementOptions["labelText"]>;
} = {
  enabled: true,
  ratioN: 10,
  maxSponsoredTotal: 3,
  windowSize: 50,
  minGap: 10,
  sponsoredSources: ["promoted"],
  labelText: "sponsored",
  respectExplicitCategoryFilter: true,
  placeFirstSponsoredAfter: 3,
  requireLabelInMetadata: true,
  includeDebug: false
};

function normalizeOptions(opts?: SponsoredPlacementOptions): Required<SponsoredPlacementOptions> {
  const ratioN = Math.max(1, opts?.ratioN ?? DEFAULT_OPTIONS.ratioN);
  const maxSponsoredTotal = Math.max(0, opts?.maxSponsoredTotal ?? DEFAULT_OPTIONS.maxSponsoredTotal);
  const windowSize = Math.max(1, opts?.windowSize ?? DEFAULT_OPTIONS.windowSize);
  const minGap = Math.max(1, opts?.minGap ?? ratioN);
  const placeFirstSponsoredAfter = Math.max(0, opts?.placeFirstSponsoredAfter ?? DEFAULT_OPTIONS.placeFirstSponsoredAfter);

  return {
    enabled: opts?.enabled ?? DEFAULT_OPTIONS.enabled,
    ratioN,
    maxSponsoredTotal,
    windowSize,
    minGap,
    sponsoredSources: opts?.sponsoredSources ?? DEFAULT_OPTIONS.sponsoredSources,
    labelText: opts?.labelText ?? DEFAULT_OPTIONS.labelText,
    respectExplicitCategoryFilter: opts?.respectExplicitCategoryFilter ?? DEFAULT_OPTIONS.respectExplicitCategoryFilter,
    placeFirstSponsoredAfter,
    requireLabelInMetadata: opts?.requireLabelInMetadata ?? DEFAULT_OPTIONS.requireLabelInMetadata,
    includeDebug: opts?.includeDebug ?? DEFAULT_OPTIONS.includeDebug
  };
}

export function isSponsoredPlan(plan: Plan, opts: SponsoredPlacementOptions): boolean {
  const sponsoredSources = opts.sponsoredSources ?? DEFAULT_OPTIONS.sponsoredSources;
  const kind = typeof plan.metadata?.kind === "string" ? plan.metadata.kind : undefined;
  return sponsoredSources.includes(plan.source) || kind === "promoted";
}

export function ensureSponsoredLabel(plan: Plan, opts: SponsoredPlacementOptions): Plan {
  const metadata = { ...(plan.metadata ?? {}) };
  metadata.sponsored = true;
  metadata.sponsoredLabel = opts.labelText ?? DEFAULT_OPTIONS.labelText;
  metadata.sponsoredSource = plan.source;

  return {
    ...plan,
    metadata
  };
}

function computeMaxRunSponsored(plans: Plan[], opts: SponsoredPlacementOptions): number {
  let maxRun = 0;
  let run = 0;

  for (const plan of plans) {
    if (isSponsoredPlan(plan, opts)) {
      run += 1;
      if (run > maxRun) {
        maxRun = run;
      }
    } else {
      run = 0;
    }
  }

  return maxRun;
}

function buildDebug(debug: SponsoredPlacementDebug | undefined, includeDebug: boolean): SponsoredPlacementDebug | undefined {
  if (!includeDebug) {
    return undefined;
  }

  return debug;
}

export function applySponsoredPlacement(
  plans: Plan[],
  ctx: { input: SearchPlansInput },
  opts?: SponsoredPlacementOptions
): SponsoredPlacementResult {
  const resolvedOpts = normalizeOptions(opts);

  if (!resolvedOpts.enabled) {
    return {
      plans,
      debug: buildDebug(
        {
          applied: false,
          ratioN: resolvedOpts.ratioN,
          windowSize: resolvedOpts.windowSize,
          organicCountBefore: plans.length,
          sponsoredCountBefore: 0,
          sponsoredInserted: 0,
          sponsoredDroppedByCap: 0,
          sponsoredDroppedByCategory: 0,
          maxRunSponsoredAfter: computeMaxRunSponsored(plans, resolvedOpts)
        },
        resolvedOpts.includeDebug
      )
    };
  }

  const head = plans.slice(0, resolvedOpts.windowSize);
  const tail = plans.slice(resolvedOpts.windowSize);

  const sponsoredHead: Plan[] = [];
  const organicHead: Plan[] = [];

  for (const plan of head) {
    if (isSponsoredPlan(plan, resolvedOpts)) {
      sponsoredHead.push(plan);
    } else {
      organicHead.push(plan);
    }
  }

  const explicitCategory =
    resolvedOpts.respectExplicitCategoryFilter &&
    ctx.input.categories !== undefined &&
    ctx.input.categories.length === 1
      ? ctx.input.categories[0]
      : undefined;

  const categoryAllowedSponsored: Plan[] = [];
  let sponsoredDroppedByCategory = 0;

  for (const plan of sponsoredHead) {
    if (explicitCategory && plan.category !== explicitCategory) {
      sponsoredDroppedByCategory += 1;
      continue;
    }

    categoryAllowedSponsored.push(plan);
  }

  const maxSponsoredByRatio = Math.floor(organicHead.length / resolvedOpts.ratioN) + 1;
  const maxSponsored = Math.min(maxSponsoredByRatio, resolvedOpts.maxSponsoredTotal);
  const sponsoredInserted = categoryAllowedSponsored.slice(0, maxSponsored);
  const sponsoredDroppedByCap = Math.max(0, categoryAllowedSponsored.length - sponsoredInserted.length);

  const interleaved = [...organicHead];
  let insertionIndex = Math.min(resolvedOpts.placeFirstSponsoredAfter, interleaved.length);

  for (const sponsoredPlan of sponsoredInserted) {
    const labeledPlan = ensureSponsoredLabel(sponsoredPlan, resolvedOpts);

    const clampedIndex = Math.max(0, Math.min(insertionIndex, interleaved.length));
    interleaved.splice(clampedIndex, 0, labeledPlan);
    insertionIndex = clampedIndex + resolvedOpts.minGap + 1;
  }

  const finalPlans = [...interleaved, ...tail];

  const debug: SponsoredPlacementDebug = {
    applied: true,
    ratioN: resolvedOpts.ratioN,
    windowSize: resolvedOpts.windowSize,
    organicCountBefore: organicHead.length,
    sponsoredCountBefore: sponsoredHead.length,
    sponsoredInserted: sponsoredInserted.length,
    sponsoredDroppedByCap,
    sponsoredDroppedByCategory,
    maxRunSponsoredAfter: computeMaxRunSponsored(interleaved, resolvedOpts)
  };

  return {
    plans: finalPlans,
    debug: buildDebug(debug, resolvedOpts.includeDebug)
  };
}
