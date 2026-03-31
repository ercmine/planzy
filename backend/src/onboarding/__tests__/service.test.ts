import { describe, expect, it } from 'vitest';

import { MemoryOnboardingStore } from '../memoryStore.js';
import { OnboardingService } from '../service.js';
import { MemoryVideoPlatformStore } from '../../videoPlatform/store.js';
import { VideoPlatformService } from '../../videoPlatform/service.js';

function videoService() {
  return new VideoPlatformService(
    new MemoryVideoPlatformStore(),
    {
      awsRegion: 'us-east-1',
      rawBucket: 'raw',
      processedBucket: 'processed',
      cloudFrontBaseUrl: 'https://cdn.perbug.dev',
      uploadTtlSeconds: 900,
      maxUploadBytes: 1024,
      multipartThresholdBytes: 100,
    },
  );
}

describe('OnboardingService', () => {
  it('persists preferences and maps discovery mode to default scope', async () => {
    const service = new OnboardingService(new MemoryOnboardingStore(), videoService());
    await service.updatePreferences('u1', {
      onboardingCompleted: true,
      discoveryMode: 'global_inspiration',
      interestCategoryIds: ['coffee', 'food'],
      preferredLocation: { city: 'Austin', region: 'TX', source: 'manual' },
    });

    const bootstrap = await service.feedBootstrap('u1');
    expect(bootstrap.defaultScope).toBe('global');
    expect((bootstrap.preferenceSummary as { categories: string[] }).categories).toContain('coffee');
  });

  it('returns truthful empty-state when no content exists', async () => {
    const service = new OnboardingService(new MemoryOnboardingStore(), videoService());
    const bootstrap = await service.feedBootstrap('u2');
    expect(bootstrap.emptyState).toBeTruthy();
  });
});
