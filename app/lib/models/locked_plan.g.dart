// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'locked_plan.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$LockedPlanImpl _$$LockedPlanImplFromJson(Map<String, dynamic> json) =>
    _$LockedPlanImpl(
      sessionId: json['sessionId'] as String,
      planId: json['planId'] as String,
      lockedAtISO: json['lockedAtISO'] as String,
      planSnapshot: json['planSnapshot'] == null
          ? null
          : Plan.fromJson(json['planSnapshot'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$LockedPlanImplToJson(_$LockedPlanImpl instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'planId': instance.planId,
      'lockedAtISO': instance.lockedAtISO,
      'planSnapshot': instance.planSnapshot,
    };
