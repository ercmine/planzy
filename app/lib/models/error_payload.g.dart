// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'error_payload.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ValidationErrorPayloadImpl _$$ValidationErrorPayloadImplFromJson(
        Map<String, dynamic> json) =>
    _$ValidationErrorPayloadImpl(
      error: json['error'] as String? ?? 'validation_error',
      details: (json['details'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ValidationErrorPayloadImplToJson(
        _$ValidationErrorPayloadImpl instance) =>
    <String, dynamic>{
      'error': instance.error,
      'details': instance.details,
      'runtimeType': instance.$type,
    };

_$ProviderErrorPayloadImpl _$$ProviderErrorPayloadImplFromJson(
        Map<String, dynamic> json) =>
    _$ProviderErrorPayloadImpl(
      error: json['error'] as String? ?? 'provider_error',
      code: json['code'] as String?,
      retryable: json['retryable'] as bool?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$ProviderErrorPayloadImplToJson(
        _$ProviderErrorPayloadImpl instance) =>
    <String, dynamic>{
      'error': instance.error,
      'code': instance.code,
      'retryable': instance.retryable,
      'runtimeType': instance.$type,
    };

_$PolicyViolationPayloadImpl _$$PolicyViolationPayloadImplFromJson(
        Map<String, dynamic> json) =>
    _$PolicyViolationPayloadImpl(
      error: json['error'] as String? ?? 'policy_violation',
      message: json['message'] as String?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$PolicyViolationPayloadImplToJson(
        _$PolicyViolationPayloadImpl instance) =>
    <String, dynamic>{
      'error': instance.error,
      'message': instance.message,
      'runtimeType': instance.$type,
    };

_$UnknownErrorPayloadImpl _$$UnknownErrorPayloadImplFromJson(
        Map<String, dynamic> json) =>
    _$UnknownErrorPayloadImpl(
      error: json['error'] as String? ?? 'unknown',
      message: json['message'] as String?,
      raw: json['raw'] as Map<String, dynamic>?,
      $type: json['runtimeType'] as String?,
    );

Map<String, dynamic> _$$UnknownErrorPayloadImplToJson(
        _$UnknownErrorPayloadImpl instance) =>
    <String, dynamic>{
      'error': instance.error,
      'message': instance.message,
      'raw': instance.raw,
      'runtimeType': instance.$type,
    };
