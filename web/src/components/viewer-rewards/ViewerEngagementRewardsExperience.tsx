import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { viewerRewardsApi } from '../../lib/viewer-rewards/api';
import type {
  RewardActionRequirement,
  RewardHistoryItem,
  RewardStatus,
  VideoRewardEligibility,
  ViewerRewardNotification,
  ViewerRewardSummary
} from '../../lib/viewer-rewards/types';

interface Props {
  userId: string;
}

const statusStyles: Record<RewardStatus, string> = {
  rewardable: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
  eligible_soon: 'bg-blue-500/15 text-blue-200 border border-blue-300/40',
  earned: 'bg-cyan-500/15 text-cyan-200 border border-cyan-300/40',
  pending: 'bg-amber-500/15 text-amber-200 border border-amber-300/40',
  denied: 'bg-rose-500/15 text-rose-200 border border-rose-300/40',
  already_rewarded: 'bg-violet-500/15 text-violet-200 border border-violet-300/40',
  cap_reached: 'bg-orange-500/15 text-orange-200 border border-orange-300/40',
  ineligible: 'bg-slate-500/20 text-slate-300 border border-slate-300/40',
  suspicious: 'bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-300/40'
};

function formatStatus(status: RewardStatus) {
  return status.replaceAll('_', ' ');
}

function RewardStatusChip({ status }: { status: RewardStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>{formatStatus(status)}</span>;
}

function RewardProgress({ video }: { video: VideoRewardEligibility }) {
  const pct = Math.max(0, Math.min(100, video.watchPercent));
  const required = Math.max(1, video.requiredWatchPercent);
  const rewardProgress = Math.min(100, Math.round((pct / required) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>Playback: {pct}%</span>
        <span>Reward threshold: {required}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-slate-400" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-cyan-200">
        <span>Reward progress</span>
        <span>{rewardProgress}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700/80">
        <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${rewardProgress}%` }} />
      </div>
      {pct < required ? (
        <p className="text-xs text-slate-300">Watch {required - pct}% more to qualify for watch reward.</p>
      ) : (
        <p className="text-xs text-cyan-200">Watch milestone complete. Engagement bonuses are now unlocked.</p>
      )}
    </div>
  );
}

function RewardActionPanel({
  requirements,
  onRate,
  onComment
}: {
  requirements: RewardActionRequirement[];
  onRate: () => Promise<void>;
  onComment: (text: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');

  const rating = requirements.find((req) => req.action === 'rating');
  const commentReq = requirements.find((req) => req.action === 'comment');

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <h4 className="mb-1 text-sm font-semibold text-slate-100">Rating reward</h4>
        {rating ? <p className="mb-3 text-xs text-slate-300">{rating.message || rating.label}</p> : <p className="mb-3 text-xs text-slate-400">No rating reward for this video.</p>}
        <button
          onClick={() => void onRate()}
          disabled={!rating?.unlocked}
          className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rate video for reward
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <h4 className="mb-1 text-sm font-semibold text-slate-100">Comment reward</h4>
        {commentReq ? <p className="mb-3 text-xs text-slate-300">{commentReq.message || commentReq.label}</p> : <p className="mb-3 text-xs text-slate-400">No comment reward for this video.</p>}
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="mb-2 h-20 w-full rounded-xl border border-white/15 bg-slate-950/70 p-2 text-xs text-slate-100"
          placeholder="Share a specific, helpful takeaway to qualify."
        />
        <button
          onClick={() => void onComment(comment)}
          disabled={!commentReq?.unlocked || comment.trim().length < 10}
          className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit comment
        </button>
      </div>
    </div>
  );
}

function HistoryList({ items }: { items: RewardHistoryItem[] }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/50 p-6 text-sm text-slate-300">No reward history yet. Start engaging with reward-eligible videos.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((entry) => (
        <article key={entry.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-100">{entry.videoTitle}</p>
            <RewardStatusChip status={entry.status} />
          </div>
          <p className="text-xs text-slate-300">
            {entry.actionType} • {entry.rewardAmount > 0 ? `+${entry.rewardAmount}` : entry.rewardAmount} PERBUG • {new Date(entry.createdAt).toLocaleString()}
          </p>
          {entry.campaign?.fundingType === 'sponsored' ? <p className="mt-1 text-xs text-amber-200">Sponsored reward by {entry.campaign.sponsorName}</p> : null}
          {entry.denialReason ? <p className="mt-1 text-xs text-rose-200">Denied: {entry.denialReason}</p> : null}
        </article>
      ))}
    </div>
  );
}

function Dashboard({ summary }: { summary: ViewerRewardSummary | null }) {
  if (!summary) {
    return <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-300">Loading viewer earnings...</div>;
  }

  const stat = (label: string, value: number | undefined) => (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-cyan-200">{value ?? 0} PERBUG</p>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">{stat('Lifetime', summary.lifetimeEarned)}{stat('Watch', summary.watchEarned)}{stat('Ratings', summary.ratingEarned)}</div>
      <div className="grid gap-3 md:grid-cols-3">{stat('Comments', summary.commentEarned)}{stat('Sponsored', summary.sponsoredEarned)}{stat('Pending', summary.pending)}</div>
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
        Daily cap: {summary.dailyCap ?? 0} • Remaining: {summary.dailyRemaining ?? 0} • Current streak: {summary.currentStreakDays ?? 0} days
      </div>
    </section>
  );
}

function Notifications({ notifications }: { notifications: ViewerRewardNotification[] }) {
  if (!notifications.length) return null;

  return (
    <div className="space-y-2">
      {notifications.slice(0, 4).map((notification) => (
        <div key={notification.id} className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
          <p className="font-semibold">{notification.title}</p>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function ViewerEngagementRewardsExperience({ userId }: Props) {
  const [videos, setVideos] = useState<VideoRewardEligibility[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ViewerRewardSummary | null>(null);
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<ViewerRewardNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedVideo = useMemo(() => videos.find((video) => video.videoId === selectedVideoId) ?? videos[0], [videos, selectedVideoId]);

  const load = async () => {
    try {
      setError(null);
      const [feed, loadedSummary, loadedHistory, loadedNotifications] = await Promise.all([
        viewerRewardsApi.getFeed(userId),
        viewerRewardsApi.getSummary(userId),
        viewerRewardsApi.getHistory(userId),
        viewerRewardsApi.getNotifications(userId)
      ]);
      setVideos(feed.videos);
      setSelectedVideoId(feed.videos[0]?.videoId ?? null);
      setSummary(loadedSummary);
      setHistory(loadedHistory.items);
      setNotifications(loadedNotifications.notifications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load viewer rewards.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateSelected = async (next: Promise<VideoRewardEligibility>, successMessage: string) => {
    const result = await next;
    setVideos((current) => current.map((video) => (video.videoId === result.videoId ? result : video)));
    setToast(successMessage);
    await load();
  };

  return (
    <div className="space-y-8 text-slate-100">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 to-slate-900 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Viewer engagement rewards</p>
        <h2 className="mt-2 text-3xl font-semibold">Watch, rate, and comment for meaningful Perbug rewards.</h2>
        <p className="mt-2 max-w-4xl text-sm text-slate-300">Progress is validated by backend anti-abuse checks, clear eligibility rules, and campaign funding labels so earning feels fair and transparent.</p>
      </header>

      {toast ? <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <Notifications notifications={notifications} />

      <section className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <aside className="space-y-3">
          <h3 className="text-lg font-semibold">Reward-eligible feed</h3>
          {!videos.length ? (
            <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-slate-300">No rewardable videos available right now.</div>
          ) : (
            videos.map((video) => (
              <button
                key={video.videoId}
                onClick={() => setSelectedVideoId(video.videoId)}
                className={`w-full rounded-2xl border p-4 text-left ${selectedVideo?.videoId === video.videoId ? 'border-cyan-300/60 bg-cyan-500/10' : 'border-white/10 bg-slate-900/60'}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{video.title}</p>
                  <RewardStatusChip status={video.rewardStatus} />
                </div>
                <p className="text-xs text-slate-300">{video.placeName ? `${video.placeName} · ` : ''}{video.creatorName}</p>
                {video.campaign?.fundingType === 'sponsored' ? (
                  <p className="mt-2 text-xs text-amber-200">Sponsored reward · {video.campaign.sponsorName ?? video.campaign.name}</p>
                ) : (
                  <p className="mt-2 text-xs text-cyan-200">Platform-funded reward</p>
                )}
                {video.rewardAmountHint ? <p className="mt-1 text-xs text-cyan-100">Earn up to {video.rewardAmountHint} PERBUG</p> : null}
              </button>
            ))
          )}
        </aside>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          {!selectedVideo ? (
            <p className="text-sm text-slate-300">Select a video to track reward progress.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{selectedVideo.title}</h3>
                  <p className="text-xs text-slate-300">{selectedVideo.eligibilityMessage || 'Watch to unlock rating and thoughtful comment rewards.'}</p>
                </div>
                <RewardStatusChip status={selectedVideo.rewardStatus} />
              </div>
              <RewardProgress video={selectedVideo} />
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-white/20 px-3 py-1 text-xs"
                  onClick={() => void updateSelected(viewerRewardsApi.updateWatchProgress(selectedVideo.videoId, Math.min(100, selectedVideo.watchPercent + 15), userId), 'Watch progress synced.')}
                >
                  Simulate +15% watch
                </button>
                <button
                  className="rounded-full border border-white/20 px-3 py-1 text-xs"
                  onClick={() => void updateSelected(viewerRewardsApi.getVideoRewardState(selectedVideo.videoId, userId), 'Reward state refreshed.')}
                >
                  Refresh state
                </button>
              </div>
              {selectedVideo.antiAbuseMessage ? <p className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">{selectedVideo.antiAbuseMessage}</p> : null}
              <RewardActionPanel
                requirements={selectedVideo.actionRequirements}
                onRate={() => updateSelected(viewerRewardsApi.submitEngagement(selectedVideo.videoId, 'rating', { score: 5 }, userId), 'Rating submitted and checked for reward eligibility.')}
                onComment={(text) => updateSelected(viewerRewardsApi.submitEngagement(selectedVideo.videoId, 'comment', { text }, userId), 'Comment submitted. Reward may be pending moderation.')}
              />
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs text-slate-300">
                <p className="font-semibold text-slate-100">Player-to-discovery loop</p>
                <p>Open place page, creator profile, and saved videos from this player state to continue local discovery while tracking engagement rewards.</p>
              </div>
            </>
          )}
        </section>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Viewer earnings dashboard</h3>
        <Dashboard summary={summary} />
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Reward history</h3>
        <HistoryList items={history} />
      </section>
    </div>
  );
}
