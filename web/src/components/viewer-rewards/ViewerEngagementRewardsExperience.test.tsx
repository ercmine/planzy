import React from "react";
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

afterEach(() => cleanup());
import ViewerEngagementRewardsExperience from './ViewerEngagementRewardsExperience';
import type { VideoRewardEligibility } from '../../lib/viewer-rewards/types';

const feedVideo: VideoRewardEligibility = {
  videoId: 'vid_1',
  title: 'Coffee Crawl Downtown',
  creatorId: 'c1',
  creatorName: 'Ana',
  placeId: 'p1',
  placeName: 'Downtown Cafe',
  rewardStatus: 'eligible_soon',
  watchPercent: 40,
  requiredWatchPercent: 60,
  rewardAmountHint: 3,
  actionRequirements: [
    { action: 'watch', label: 'Watch to earn', unlocked: true, status: 'eligible_soon' },
    { action: 'rating', label: 'Rate after 60%', unlocked: false, status: 'eligible_soon', message: 'Watch more to unlock rating reward' },
    { action: 'comment', label: 'Thoughtful comment bonus available', unlocked: true, status: 'pending', message: 'Comment bonus may be pending review' }
  ],
  campaign: { id: 'cmp_1', name: 'Local Spring', fundingType: 'sponsored', sponsorName: 'Downtown BID' },
  eligibilityMessage: 'Watch 60% to unlock rating bonus.',
  antiAbuseMessage: 'Low-effort repeats may be denied.'
};

const apiMock = vi.hoisted(() => ({
  getFeed: vi.fn(),
  getSummary: vi.fn(),
  getHistory: vi.fn(),
  getNotifications: vi.fn(),
  updateWatchProgress: vi.fn(),
  getVideoRewardState: vi.fn(),
  submitEngagement: vi.fn()
}));

vi.mock('../../lib/viewer-rewards/api', () => ({ viewerRewardsApi: apiMock }));

describe('ViewerEngagementRewardsExperience', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    apiMock.getFeed.mockResolvedValue({ videos: [feedVideo] });
    apiMock.getSummary.mockResolvedValue({
      lifetimeEarned: 12,
      watchEarned: 5,
      ratingEarned: 3,
      commentEarned: 2,
      sponsoredEarned: 4,
      pending: 1,
      denied: 1,
      alreadyRewarded: 1,
      dailyCap: 10,
      dailyRemaining: 2,
      currentStreakDays: 4
    });
    apiMock.getHistory.mockResolvedValue({
      items: [
        {
          id: 'h1',
          videoId: 'vid_1',
          videoTitle: 'Coffee Crawl Downtown',
          actionType: 'watch',
          rewardAmount: 2,
          status: 'earned',
          createdAt: '2026-03-26T00:00:00.000Z',
          denialReason: 'repeated low-value engagement'
        }
      ]
    });
    apiMock.getNotifications.mockResolvedValue({ notifications: [{ id: 'n1', type: 'pending_approved', title: 'Comment approved', message: 'Your thoughtful comment earned 1 PERBUG.', createdAt: '2026-03-26T00:00:00.000Z', read: false }] });
    apiMock.updateWatchProgress.mockResolvedValue({ ...feedVideo, watchPercent: 55 });
    apiMock.getVideoRewardState.mockResolvedValue({ ...feedVideo, rewardStatus: 'pending' });
    apiMock.submitEngagement.mockResolvedValue({ ...feedVideo, rewardStatus: 'pending' });
  });

  it('renders reward chips, watch progress, sponsored label, and anti-abuse message', async () => {
    render(<ViewerEngagementRewardsExperience userId="user_1" />);

    await waitFor(() => expect(screen.getByText('Reward-eligible feed')).toBeInTheDocument());
    expect(screen.getAllByText('eligible soon')[0]).toBeInTheDocument();
    expect(screen.getByText(/Watch 20% more to qualify/)).toBeInTheDocument();
    expect(screen.getByText(/Sponsored reward/)).toBeInTheDocument();
    expect(screen.getByText(/Low-effort repeats may be denied/)).toBeInTheDocument();
  });

  it('keeps rating disabled until watch threshold unlocks and supports comment messaging', async () => {
    render(<ViewerEngagementRewardsExperience userId="user_1" />);
    await waitFor(() => expect(screen.getByText('Rating reward')).toBeInTheDocument());

    const rateButton = screen.getAllByRole('button', { name: 'Rate video for reward' })[0];
    expect(rateButton).toBeDisabled();
    expect(screen.getByText(/Watch more to unlock rating reward/)).toBeInTheDocument();
    expect(screen.getByText(/Comment bonus may be pending review/)).toBeInTheDocument();
  });

  it('renders dashboard and history with denied messaging', async () => {
    render(<ViewerEngagementRewardsExperience userId="user_1" />);
    await waitFor(() => expect(screen.getByText('Viewer earnings dashboard')).toBeInTheDocument());

    expect(screen.getByText('12 PERBUG')).toBeInTheDocument();
    expect(screen.getByText(/Denied: repeated low-value engagement/)).toBeInTheDocument();
  });

  it('handles engagement and watch state transitions', async () => {
    const user = userEvent.setup();
    render(<ViewerEngagementRewardsExperience userId="user_1" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Simulate +15% watch' })[0]).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Simulate +15% watch' })[0]);
    await waitFor(() => expect(apiMock.updateWatchProgress).toHaveBeenCalled());
  });
});
