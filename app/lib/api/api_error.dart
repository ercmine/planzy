import '../models/error_payload.dart';

enum ApiErrorKind { network, timeout, http, decoding, unknown }

class ApiError implements Exception {
  const ApiError({
    required this.kind,
    required this.message,
    this.statusCode,
    this.details,
    this.serverPayload,
  });

  final ApiErrorKind kind;
  final String message;
  final int? statusCode;
  final Object? details;
  final ErrorPayload? serverPayload;

  factory ApiError.network(String message, {Object? details}) => ApiError(
        kind: ApiErrorKind.network,
        message: message,
        details: details,
      );

  factory ApiError.timeout(String message, {Object? details}) => ApiError(
        kind: ApiErrorKind.timeout,
        message: message,
        details: details,
      );

  factory ApiError.http(
    String message, {
    required int statusCode,
    ErrorPayload? serverPayload,
    Object? details,
  }) =>
      ApiError(
        kind: ApiErrorKind.http,
        message: message,
        statusCode: statusCode,
        serverPayload: serverPayload,
        details: details,
      );

  factory ApiError.decoding(String message, {Object? details}) => ApiError(
        kind: ApiErrorKind.decoding,
        message: message,
        details: details,
      );

  factory ApiError.unknown(String message, {Object? details}) => ApiError(
        kind: ApiErrorKind.unknown,
        message: message,
        details: details,
      );

  @override
  String toString() {
    return 'ApiError(kind: $kind, statusCode: $statusCode, message: $message)';
  }
}
