import { describe, expect, it } from 'vitest';

import { MemoryCompetitionStore } from '../memoryStore.js';
import { CompetitionService } from '../service.js';

function createService(now = '2026-03-22T12:00:00.000Z') {
  return new CompetitionService(new MemoryCompetitionStore(), undefined, () => new Date(now));
}

describe('CompetitionService', () => {
  it('counts only valid deduped likes within the first 48 hours', () => {
    const service = createService('2026-03-24T13:00:00.000Z');
    service.recordVideoPublished({ videoId: 'video-1', userId: 'creator-1', publishedAt: '2026-03-22T12:00:00.000Z' });
    service.recordLike({ id: 'l1', videoId: 'video-1', userId: 'fan-1', createdAt: '2026-03-22T13:00:00.000Z', valid: true, bannedUser: false, blockedUser: false, fraudFlagged: false });
    service.recordLike({ id: 'l2', videoId: 'video-1', userId: 'fan-1', createdAt: '2026-03-22T14:00:00.000Z', valid: true, bannedUser: false, blockedUser: false, fraudFlagged: false });
    service.recordLike({ id: 'l3', videoId: 'video-1', userId: 'fan-2', createdAt: '2026-03-24T13:01:00.000Z', valid: true, bannedUser: false, blockedUser: false, fraudFlagged: false });
    service.recordLike({ id: 'l4', videoId: 'video-1', userId: 'fan-3', createdAt: '2026-03-22T15:00:00.000Z', valid: true, bannedUser: true, blockedUser: false, fraudFlagged: false });

    const quality = service.getVideoQuality('video-1');
    expect(quality?.earlyLikeCount).toBe(1);
    expect(quality?.finalized).toBe(true);
  });

  it('assigns quality bands and completes the 10-like mission', () => {
    const service = createService('2026-03-24T12:00:00.000Z');
    service.recordVideoPublished({ videoId: 'video-10', userId: 'u1', publishedAt: '2026-03-24T12:00:00.000Z', city: 'Bloomington', category: 'coffee' });
    for (var i = 0; i < 10; i += 1) {
      service.recordLike({ id: 'like-' + i.toString(), videoId: 'video-10', userId: 'fan-' + i.toString(), createdAt: '2026-03-24T13:00:00.000Z', valid: true, bannedUser: false, blockedUser: false, fraudFlagged: false });
    }
    const quality = service.getVideoQuality('video-10');
    const progress = service.getHome('u1').missions.find((mission) => mission.id === 'quality_likes_10')?.progress;
    expect(quality?.qualityBand).toBe('STANDARD');
    expect(progress?.progressValue).toBe(10);
    expect(progress?.completed).toBe(true);
  });

  it('computes discovery and leaderboard score deterministically', () => {
    const service = createService('2026-03-22T12:00:00.000Z');
    service.recordVideoPublished({ videoId: 'v1', userId: 'u1', publishedAt: '2026-03-22T09:00:00.000Z', city: 'Bloomington', category: 'coffee', canonicalPlaceId: 'place-1' });
    service.recordApprovedReview({ id: 'r1', reviewId: 'review-1', videoId: 'v1', userId: 'u1', canonicalPlaceId: 'place-1', approvedAt: '2026-03-22T10:00:00.000Z', city: 'Bloomington', category: 'coffee', discoveryType: 'first_review', approved: true, blocked: false });
    service.updateStreak('u1', 3);
    service.recordTip({ id: 't1', userId: 'u1', amountAtomic: 2_000_000_000n, createdAt: '2026-03-22T11:00:00.000Z' });
    const home = service.getHome('u1');
    const city = home.leaderboards.find((board) => board.type === 'weekly_city');
    expect(home.score).toBeGreaterThan(0);
    expect(city?.myEntry?.rank).toBe(1);
  });

  it('claims rewards idempotently', () => {
    const service = createService('2026-03-24T12:00:00.000Z');
    service.recordApprovedReview({ id: 'r1', reviewId: 'review-1', videoId: 'v1', userId: 'u1', canonicalPlaceId: 'place-1', approvedAt: '2026-03-24T10:00:00.000Z', city: 'Bloomington', category: 'coffee', discoveryType: 'first_review', approved: true, blocked: false });
    service.getHome('u1');
    const reward = service.claimMission('daily_approved_review', 'u1');
    const first = service.claimReward(reward.id, 'u1');
    const second = service.claimReward(reward.id, 'u1');
    expect(first.claimTransactionSignature).toBe(second.claimTransactionSignature);
  });

  it('blocks removed videos from quality competition', () => {
    const service = createService('2026-03-24T13:00:00.000Z');
    service.recordVideoPublished({ videoId: 'blocked-video', userId: 'u1', publishedAt: '2026-03-22T12:00:00.000Z' });
    const snapshot = service.getVideoQuality('blocked-video');
    snapshot!.blocked = true;
    snapshot!.removed = true;
    // force recompute through admin path
    const quality = service.recomputeVideoQuality('blocked-video');
    expect(quality?.earlyLikeCount).toBe(0);
    expect(quality?.qualityPoints).toBe(0);
  });
});
