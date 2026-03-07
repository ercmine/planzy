import 'package:freezed_annotation/freezed_annotation.dart';

import 'plan.dart';

part 'deck_batch.freezed.dart';
part 'deck_batch.g.dart';

@freezed
class DeckSourceMix with _$DeckSourceMix {
  const factory DeckSourceMix({
    @Default(<String>[]) List<String> providersUsed,
    @Default(<String, int>{}) Map<String, int> planSourceCounts,
    @Default(<String, int>{}) Map<String, int> categoryCounts,
    @Default(0) int sponsoredCount,
  }) = _DeckSourceMix;

  factory DeckSourceMix.fromJson(Map<String, dynamic> json) =>
      _$DeckSourceMixFromJson(json);
}

@freezed
class DeckDebug with _$DeckDebug {
  const factory DeckDebug({
    required String requestId,
    bool? cacheHit,
  }) = _DeckDebug;

  factory DeckDebug.fromJson(Map<String, dynamic> json) =>
      _$DeckDebugFromJson(json);
}

@freezed
class DeckBatchResponse with _$DeckBatchResponse {
  const factory DeckBatchResponse({
    required String sessionId,
    @Default(<Plan>[]) List<Plan> plans,
    String? nextCursor,
    required DeckSourceMix mix,
    DeckDebug? debug,
  }) = _DeckBatchResponse;

  factory DeckBatchResponse.fromJson(Map<String, dynamic> json) =>
      _$DeckBatchResponseFromJson(json);
}
