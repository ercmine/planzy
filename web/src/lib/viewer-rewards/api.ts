import type {
  ViewerRewardSummary,
  ViewerRewardFeedResponse,
  ViewerRewardHistoryResponse,
  ViewerRewardNotificationsResponse,
  RewardActionType,
  VideoRewardEligibility
} from './types';

const apiBaseUrl = (import.meta.env.PERBUG_API_BASE_URL as string | undefined) ?? '';

interface RequestOptions {
  userId: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-user-id': options.userId
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

export const viewerRewardsApi = {
  getFeed(userId: string) {
    return request<ViewerRewardFeedResponse>('/v1/viewer/rewards/feed', { userId });
  },
  getVideoRewardState(videoId: string, userId: string) {
    return request<VideoRewardEligibility>(`/v1/viewer/rewards/videos/${videoId}/state`, { userId });
  },
  updateWatchProgress(videoId: string, watchPercent: number, userId: string) {
    return request<VideoRewardEligibility>(`/v1/viewer/rewards/videos/${videoId}/watch-progress`, {
      userId,
      method: 'POST',
      body: { watchPercent }
    });
  },
  submitEngagement(videoId: string, actionType: RewardActionType, payload: Record<string, unknown>, userId: string) {
    return request<VideoRewardEligibility>(`/v1/viewer/rewards/videos/${videoId}/engagement-actions`, {
      userId,
      method: 'POST',
      body: { actionType, payload }
    });
  },
  getSummary(userId: string) {
    return request<ViewerRewardSummary>('/v1/viewer/rewards/summary', { userId });
  },
  getHistory(userId: string) {
    return request<ViewerRewardHistoryResponse>('/v1/viewer/rewards/history', { userId });
  },
  getNotifications(userId: string) {
    return request<ViewerRewardNotificationsResponse>('/v1/viewer/rewards/notifications', { userId });
  }
};
