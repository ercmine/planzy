// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'telemetry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$DeckLoadedEventInputImpl _$$DeckLoadedEventInputImplFromJson(
        Map<String, dynamic> json) =>
    _$DeckLoadedEventInputImpl(
      event: json['event'] as String? ?? 'deck_loaded',
      batchSize: (json['batchSize'] as num).toInt(),
      returned: (json['returned'] as num).toInt(),
      nextCursorPresent: json['nextCursorPresent'] as bool,
      planSourceCounts:
          (json['planSourceCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ),
      clientAtISO: json['clientAtISO'] as String?,
      deckKey: json['deckKey'] as String?,
      cursor: json['cursor'] as String?,
      position: (json['position'] as num?)?.toInt(),
      source: json['source'] as String?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$DeckLoadedEventInputImplToJson(
        _$DeckLoadedEventInputImpl instance) =>
    <String, dynamic>{
      'event': instance.event,
      'batchSize': instance.batchSize,
      'returned': instance.returned,
      'nextCursorPresent': instance.nextCursorPresent,
      'planSourceCounts': instance.planSourceCounts,
      'clientAtISO': instance.clientAtISO,
      'deckKey': instance.deckKey,
      'cursor': instance.cursor,
      'position': instance.position,
      'source': instance.source,
      'runtimeType': instance.$type,
    };

_$CardViewedEventInputImpl _$$CardViewedEventInputImplFromJson(
        Map<String, dynamic> json) =>
    _$CardViewedEventInputImpl(
      event: json['event'] as String? ?? 'card_viewed',
      planId: json['planId'] as String,
      viewMs: (json['viewMs'] as num?)?.toInt(),
      clientAtISO: json['clientAtISO'] as String?,
      deckKey: json['deckKey'] as String?,
      cursor: json['cursor'] as String?,
      position: (json['position'] as num?)?.toInt(),
      source: json['source'] as String?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$CardViewedEventInputImplToJson(
        _$CardViewedEventInputImpl instance) =>
    <String, dynamic>{
      'event': instance.event,
      'planId': instance.planId,
      'viewMs': instance.viewMs,
      'clientAtISO': instance.clientAtISO,
      'deckKey': instance.deckKey,
      'cursor': instance.cursor,
      'position': instance.position,
      'source': instance.source,
      'runtimeType': instance.$type,
    };

_$CardOpenedEventInputImpl _$$CardOpenedEventInputImplFromJson(
        Map<String, dynamic> json) =>
    _$CardOpenedEventInputImpl(
      event: json['event'] as String? ?? 'card_opened',
      planId: json['planId'] as String,
      section: json['section'] as String?,
      clientAtISO: json['clientAtISO'] as String?,
      deckKey: json['deckKey'] as String?,
      cursor: json['cursor'] as String?,
      position: (json['position'] as num?)?.toInt(),
      source: json['source'] as String?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$CardOpenedEventInputImplToJson(
        _$CardOpenedEventInputImpl instance) =>
    <String, dynamic>{
      'event': instance.event,
      'planId': instance.planId,
      'section': instance.section,
      'clientAtISO': instance.clientAtISO,
      'deckKey': instance.deckKey,
      'cursor': instance.cursor,
      'position': instance.position,
      'source': instance.source,
      'runtimeType': instance.$type,
    };

_$SwipeEventInputImpl _$$SwipeEventInputImplFromJson(
        Map<String, dynamic> json) =>
    _$SwipeEventInputImpl(
      event: json['event'] as String? ?? 'swipe',
      planId: json['planId'] as String,
      action: json['action'] as String,
      clientAtISO: json['clientAtISO'] as String?,
      deckKey: json['deckKey'] as String?,
      cursor: json['cursor'] as String?,
      position: (json['position'] as num?)?.toInt(),
      source: json['source'] as String?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$SwipeEventInputImplToJson(
        _$SwipeEventInputImpl instance) =>
    <String, dynamic>{
      'event': instance.event,
      'planId': instance.planId,
      'action': instance.action,
      'clientAtISO': instance.clientAtISO,
      'deckKey': instance.deckKey,
      'cursor': instance.cursor,
      'position': instance.position,
      'source': instance.source,
      'runtimeType': instance.$type,
    };

_$OutboundLinkClickedEventInputImpl
    _$$OutboundLinkClickedEventInputImplFromJson(Map<String, dynamic> json) =>
        _$OutboundLinkClickedEventInputImpl(
          event: json['event'] as String? ?? 'outbound_link_clicked',
          planId: json['planId'] as String,
          linkType: json['linkType'] as String,
          affiliate: json['affiliate'] as bool?,
          clientAtISO: json['clientAtISO'] as String?,
          deckKey: json['deckKey'] as String?,
          cursor: json['cursor'] as String?,
          position: (json['position'] as num?)?.toInt(),
          source: json['source'] as String?,
          $type: json['runtimeType'] as String?,
        );

Map<String, dynamic> _$$OutboundLinkClickedEventInputImplToJson(
        _$OutboundLinkClickedEventInputImpl instance) =>
    <String, dynamic>{
      'event': instance.event,
      'planId': instance.planId,
      'linkType': instance.linkType,
      'affiliate': instance.affiliate,
      'clientAtISO': instance.clientAtISO,
      'deckKey': instance.deckKey,
      'cursor': instance.cursor,
      'position': instance.position,
      'source': instance.source,
      'runtimeType': instance.$type,
    };

_$TelemetryBatchRequestImpl _$$TelemetryBatchRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$TelemetryBatchRequestImpl(
      events: (json['events'] as List<dynamic>)
          .map((e) => TelemetryEventInput.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$TelemetryBatchRequestImplToJson(
        _$TelemetryBatchRequestImpl instance) =>
    <String, dynamic>{
      'events': instance.events,
    };
