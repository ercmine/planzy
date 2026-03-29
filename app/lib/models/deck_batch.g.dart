// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deck_batch.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$DeckSourceMixImpl _$$DeckSourceMixImplFromJson(Map<String, dynamic> json) =>
    _$DeckSourceMixImpl(
      providersUsed: (json['providersUsed'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      planSourceCounts:
          (json['planSourceCounts'] as Map<String, dynamic>?)?.map(
                (k, e) => MapEntry(k, (e as num).toInt()),
              ) ??
              const <String, int>{},
      categoryCounts: (json['categoryCounts'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, (e as num).toInt()),
          ) ??
          const <String, int>{},
      sponsoredCount: (json['sponsoredCount'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$$DeckSourceMixImplToJson(_$DeckSourceMixImpl instance) =>
    <String, dynamic>{
      'providersUsed': instance.providersUsed,
      'planSourceCounts': instance.planSourceCounts,
      'categoryCounts': instance.categoryCounts,
      'sponsoredCount': instance.sponsoredCount,
    };

_$DeckDebugImpl _$$DeckDebugImplFromJson(Map<String, dynamic> json) =>
    _$DeckDebugImpl(
      requestId: json['requestId'] as String,
      cacheHit: json['cacheHit'] as bool?,
    );

Map<String, dynamic> _$$DeckDebugImplToJson(_$DeckDebugImpl instance) =>
    <String, dynamic>{
      'requestId': instance.requestId,
      'cacheHit': instance.cacheHit,
    };

_$DeckBatchResponseImpl _$$DeckBatchResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$DeckBatchResponseImpl(
      sessionId: json['sessionId'] as String,
      plans: (json['plans'] as List<dynamic>?)
              ?.map((e) => Plan.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <Plan>[],
      nextCursor: json['nextCursor'] as String?,
      mix: DeckSourceMix.fromJson(json['mix'] as Map<String, dynamic>),
      debug: json['debug'] == null
          ? null
          : DeckDebug.fromJson(json['debug'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$DeckBatchResponseImplToJson(
        _$DeckBatchResponseImpl instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'plans': instance.plans,
      'nextCursor': instance.nextCursor,
      'mix': instance.mix,
      'debug': instance.debug,
    };
