// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swipe.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SwipeRecordImpl _$$SwipeRecordImplFromJson(Map<String, dynamic> json) =>
    _$SwipeRecordImpl(
      sessionId: json['sessionId'] as String,
      planId: json['planId'] as String,
      action: $enumDecode(_$SwipeActionEnumMap, json['action']),
      atISO: json['atISO'] as String,
      planSnapshot: json['planSnapshot'] == null
          ? null
          : Plan.fromJson(json['planSnapshot'] as Map<String, dynamic>),
      position: (json['position'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$SwipeRecordImplToJson(_$SwipeRecordImpl instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'planId': instance.planId,
      'action': _$SwipeActionEnumMap[instance.action]!,
      'atISO': instance.atISO,
      'planSnapshot': instance.planSnapshot,
      'position': instance.position,
    };

const _$SwipeActionEnumMap = {
  SwipeAction.yes: 'yes',
  SwipeAction.no: 'no',
  SwipeAction.maybe: 'maybe',
};
