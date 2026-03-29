// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_member.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SessionMemberImpl _$$SessionMemberImplFromJson(Map<String, dynamic> json) =>
    _$SessionMemberImpl(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      phonesE164: (json['phonesE164'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
    );

Map<String, dynamic> _$$SessionMemberImplToJson(_$SessionMemberImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'phonesE164': instance.phonesE164,
    };
