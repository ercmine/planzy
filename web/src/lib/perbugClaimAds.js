export const PERBUG_CLAIM_AD_SCRIPT_SRC = 'https://quge5.com/88/tag.min.js';
export const PERBUG_CLAIM_AD_ZONE = '225825';

const RECENT_TRIGGER_MS = 1500;
const recentTriggerByClaimKey = new Map();

function isFunction(value) {
  return typeof value === 'function';
}

export function attemptClaimAdTrigger({ claimKey, logger = console, globalScope = globalThis }) {
  if (!claimKey) {
    logger.warn('[perbug-claim-ad] Missing claim key; skipping ad trigger.');
    return false;
  }

  const now = Date.now();
  const previousTriggerAt = recentTriggerByClaimKey.get(claimKey);
  if (typeof previousTriggerAt === 'number' && now - previousTriggerAt < RECENT_TRIGGER_MS) {
    logger.info('[perbug-claim-ad] Duplicate claim click ignored for ad trigger.', { claimKey });
    return false;
  }

  recentTriggerByClaimKey.set(claimKey, now);

  try {
    const scriptSelector = `script[src="${PERBUG_CLAIM_AD_SCRIPT_SRC}"][data-zone="${PERBUG_CLAIM_AD_ZONE}"]`;
    const scriptPresent = Boolean(globalScope?.document?.querySelector?.(scriptSelector));
    if (!scriptPresent) {
      logger.warn('[perbug-claim-ad] Ad script tag was not found in document when claim was clicked.');
    }

    const directTriggerCandidates = [
      globalScope?.show_225825,
      globalScope?.triggerAd,
      globalScope?.monetag?.show,
      globalScope?.Monetag?.show
    ];

    const triggerFn = directTriggerCandidates.find(isFunction);
    if (triggerFn) {
      triggerFn(PERBUG_CLAIM_AD_ZONE);
      logger.info('[perbug-claim-ad] Ad trigger function invoked.', { claimKey });
      return true;
    }

    if (isFunction(globalScope?.document?.dispatchEvent) && isFunction(globalScope?.CustomEvent)) {
      globalScope.document.dispatchEvent(new globalScope.CustomEvent('perbug:claim-ad-trigger', {
        detail: { claimKey, zone: PERBUG_CLAIM_AD_ZONE }
      }));
      logger.info('[perbug-claim-ad] No direct ad trigger found; dispatched fallback event.', { claimKey });
      return true;
    }

    logger.info('[perbug-claim-ad] No ad trigger API available; continuing claim flow.', { claimKey });
    return false;
  } catch (error) {
    logger.warn('[perbug-claim-ad] Ad trigger failed; continuing claim flow.', error);
    return false;
  }
}

export function __resetClaimAdTriggerForTests() {
  recentTriggerByClaimKey.clear();
}
