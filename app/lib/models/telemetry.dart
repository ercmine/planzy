import 'package:freezed_annotation/freezed_annotation.dart';

part 'telemetry.freezed.dart';
part 'telemetry.g.dart';

@freezed
class TelemetryEventInput with _$TelemetryEventInput {
  const factory TelemetryEventInput.deckLoaded({
    @Default('deck_loaded') String event,
    required int batchSize,
    required int returned,
    required bool nextCursorPresent,
    Map<String, int>? planSourceCounts,
    String? clientAtISO,
    String? deckKey,
    String? cursor,
    int? position,
    String? source,
  }) = DeckLoadedEventInput;

  const factory TelemetryEventInput.cardViewed({
    @Default('card_viewed') String event,
    required String planId,
    int? viewMs,
    String? clientAtISO,
    String? deckKey,
    String? cursor,
    int? position,
    String? source,
  }) = CardViewedEventInput;

  const factory TelemetryEventInput.cardOpened({
    @Default('card_opened') String event,
    required String planId,
    String? section,
    String? clientAtISO,
    String? deckKey,
    String? cursor,
    int? position,
    String? source,
  }) = CardOpenedEventInput;

  const factory TelemetryEventInput.swipe({
    @Default('swipe') String event,
    required String planId,
    required String action,
    String? clientAtISO,
    String? deckKey,
    String? cursor,
    int? position,
    String? source,
  }) = SwipeEventInput;

  const factory TelemetryEventInput.outboundLinkClicked({
    @Default('outbound_link_clicked') String event,
    required String planId,
    required String linkType,
    bool? affiliate,
    String? clientAtISO,
    String? deckKey,
    String? cursor,
    int? position,
    String? source,
  }) = OutboundLinkClickedEventInput;

  factory TelemetryEventInput.fromJson(Map<String, dynamic> json) =>
      _$TelemetryEventInputFromJson(json);
}

@freezed
class TelemetryBatchRequest with _$TelemetryBatchRequest {
  const factory TelemetryBatchRequest({
    required List<TelemetryEventInput> events,
  }) = _TelemetryBatchRequest;

  factory TelemetryBatchRequest.fromJson(Map<String, dynamic> json) =>
      _$TelemetryBatchRequestFromJson(json);
}
