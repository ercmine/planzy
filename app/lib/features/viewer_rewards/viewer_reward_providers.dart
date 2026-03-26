import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'viewer_reward_models.dart';
import 'viewer_reward_repository.dart';

final viewerRewardRepositoryProvider = FutureProvider<ViewerRewardRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return ViewerRewardRepository(apiClient: apiClient);
});

final viewerRewardVideoStatusProvider = FutureProvider.family<ViewerRewardVideoStatus, String>((ref, videoId) async {
  final repo = await ref.watch(viewerRewardRepositoryProvider.future);
  return repo.fetchVideoStatus(videoId);
});

final viewerRewardSummaryProvider = FutureProvider<ViewerRewardSummary>((ref) async {
  final repo = await ref.watch(viewerRewardRepositoryProvider.future);
  return repo.fetchSummary();
});

final viewerRewardHistoryProvider = FutureProvider<List<ViewerRewardHistoryItem>>((ref) async {
  final repo = await ref.watch(viewerRewardRepositoryProvider.future);
  return repo.fetchHistory();
});
