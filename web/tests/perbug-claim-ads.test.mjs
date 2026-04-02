import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  attemptClaimAdTrigger,
  __resetClaimAdTriggerForTests,
  PERBUG_CLAIM_AD_SCRIPT_SRC,
  PERBUG_CLAIM_AD_ZONE
} from '../src/lib/perbugClaimAds.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('global layout includes the claim ad script exactly once', async () => {
  const layoutPath = path.join(rootDir, 'src/layouts/BaseLayout.astro');
  const layoutContents = await fs.readFile(layoutPath, 'utf8');
  const expectedScript = '<script src="https://quge5.com/88/tag.min.js" data-zone="225825" async data-cfasync="false"></script>';
  const occurrences = layoutContents.split(expectedScript).length - 1;

  assert.equal(occurrences, 1);
});

test('claim click attempts ad trigger via direct trigger function', () => {
  __resetClaimAdTriggerForTests();
  let triggerCount = 0;
  const logs = [];

  const globalScope = {
    show_225825: (zone) => {
      triggerCount += 1;
      assert.equal(zone, PERBUG_CLAIM_AD_ZONE);
    },
    document: {
      querySelector: (selector) => selector.includes(PERBUG_CLAIM_AD_SCRIPT_SRC)
    }
  };

  const result = attemptClaimAdTrigger({
    claimKey: 'review-1',
    logger: { info: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    globalScope
  });

  assert.equal(result, true);
  assert.equal(triggerCount, 1);
});

test('claim still proceeds safely when ad script/api is unavailable', () => {
  __resetClaimAdTriggerForTests();

  const result = attemptClaimAdTrigger({
    claimKey: 'review-2',
    logger: { info: () => {}, warn: () => {} },
    globalScope: {
      document: {
        querySelector: () => false
      }
    }
  });

  assert.equal(result, false);
});

test('duplicate ad trigger protection prevents rapid repeat firing', () => {
  __resetClaimAdTriggerForTests();
  let triggerCount = 0;
  const globalScope = {
    show_225825: () => {
      triggerCount += 1;
    },
    document: {
      querySelector: () => true
    }
  };

  const first = attemptClaimAdTrigger({ claimKey: 'review-3', logger: { info: () => {}, warn: () => {} }, globalScope });
  const second = attemptClaimAdTrigger({ claimKey: 'review-3', logger: { info: () => {}, warn: () => {} }, globalScope });

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(triggerCount, 1);
});

test('claim component wires ad trigger and duplicate claim submission guard', async () => {
  const componentPath = path.join(rootDir, 'src/components/rewards/RewardsClaimConsole.tsx');
  const componentContents = await fs.readFile(componentPath, 'utf8');

  assert.match(componentContents, /attemptClaimAdTrigger\(\{ claimKey: reviewId, logger: console \}\)/);
  assert.match(componentContents, /if \(!wallet\.publicKey \|\| claimingReviewId\) return;/);
  assert.match(componentContents, /disabled=\{claimingReviewId !== null \|\| !wallet\.publicKey\}/);
});
