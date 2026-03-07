import 'package:freezed_annotation/freezed_annotation.dart';

part 'error_payload.freezed.dart';
part 'error_payload.g.dart';

@freezed
class ErrorPayload with _$ErrorPayload {
  const factory ErrorPayload.validationError({
    @Default('validation_error') String error,
    @Default(<String>[]) List<String> details,
  }) = ValidationErrorPayload;

  const factory ErrorPayload.providerError({
    @Default('provider_error') String error,
    String? code,
    bool? retryable,
  }) = ProviderErrorPayload;

  const factory ErrorPayload.policyViolation({
    @Default('policy_violation') String error,
    String? message,
  }) = PolicyViolationPayload;

  const factory ErrorPayload.unknown({
    @Default('unknown') String error,
    String? message,
    Map<String, dynamic>? raw,
  }) = UnknownErrorPayload;

  factory ErrorPayload.fromJson(Map<String, dynamic> json) =>
      _$ErrorPayloadFromJson(json);

  static ErrorPayload? tryParse(Map<String, dynamic> json) {
    final type = json['error'];
    if (type is! String) {
      return null;
    }

    switch (type) {
      case 'validation_error':
        return ErrorPayload.validationError(
          details: (json['details'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<String>()
              .toList(),
        );
      case 'provider_error':
        return ErrorPayload.providerError(
          code: json['code'] as String?,
          retryable: json['retryable'] as bool?,
        );
      case 'policy_violation':
        return ErrorPayload.policyViolation(
          message: json['message'] as String?,
        );
      default:
        return ErrorPayload.unknown(
          error: type,
          message: json['message'] as String?,
          raw: json,
        );
    }
  }
}
