import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../core/env/env.dart';
import '../core/logging/log.dart';
import '../core/utils/json.dart';
import '../core/utils/uuid.dart';
import '../models/entitlement_summary.dart';
import '../models/error_payload.dart';
import '../models/rollout_summary.dart';
import 'api_error.dart';
import 'retry.dart';

class ApiClient {
  ApiClient({
    required this.httpClient,
    required this.envConfig,
    required this.userIdResolver,
    this.retryPolicy = const RetryPolicy(),
    this.timeout = const Duration(seconds: 20),
    this.reachabilityTimeout = const Duration(seconds: 10),
  });

  final http.Client httpClient;
  final EnvConfig envConfig;
  final Future<String> Function() userIdResolver;
  final RetryPolicy retryPolicy;
  final Duration timeout;
  final Duration reachabilityTimeout;

  int? lastPlansStatus;
  int? lastLiveResultsStatus;
  String? lastPlansBodySnippet;
  String? lastLiveResultsBodySnippet;

  Uri buildUri(String path, [Map<String, String?>? queryParameters]) {
    final base = Uri.parse(envConfig.apiBaseUrl);
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final sanitized = queryParameters == null
        ? <String, String>{}
        : Map<String, String>.fromEntries(
            queryParameters.entries
                .where((entry) => entry.value != null && entry.value!.isNotEmpty)
                .map((entry) => MapEntry(entry.key, entry.value!)),
          );

    final mergedPath = '${base.path}${normalizedPath}'
        .replaceAll('//', '/')
        .replaceAllMapped(RegExp(r'/{2,}'), (_) => '/');
    return base.replace(
      path: mergedPath,
      queryParameters: sanitized.isEmpty ? null : sanitized,
    );
  }

  Future<void> runStartupDebugChecklist() async {
    if (!kDebugMode) {
      return;
    }

    Log.info('Debug checklist API_BASE_URL=${envConfig.apiBaseUrl}');
    await _debugProbe('/plans');
    await _debugProbe('/live-results');
  }

  Future<void> _debugProbe(String path) async {
    final uri = buildUri(path);
    try {
      final response = await httpClient
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(reachabilityTimeout);
      Log.info(
        'Debug checklist GET $path status=${response.statusCode} body="${_bodySnippet120(response.body)}"',
      );
    } catch (error) {
      Log.warn('Debug checklist GET $path failed error=$error');
    }
  }

  Future<void> pingHealth() async {
    final uri = buildUri('/health');
    final response = await httpClient
        .get(uri, headers: const {'Accept': 'application/json'})
        .timeout(reachabilityTimeout);

    _logResponse(method: 'GET', uri: uri, response: response);
    if (response.statusCode == 200) {
      return;
    }

    final snippet = _bodySnippet(response.body);
    final requestId = response.headers['x-request-id'];
    throw ApiError.http(
      'Health check failed (${response.statusCode})${requestId == null ? '' : ' requestId=$requestId'} body="$snippet"',
      statusCode: response.statusCode,
      details: response.body,
    );
  }

  Future<bool> checkBackendReachability() async {
    final healthUri = buildUri('/health');
    if (await _ping(healthUri)) {
      return true;
    }

    final rootUri = buildUri('/');
    return _ping(rootUri);
  }

  Future<JsonMap> getJson(String path, {Map<String, String?>? queryParameters}) {
    return _sendForJsonMap(
      method: 'GET',
      path: path,
      queryParameters: queryParameters,
    );
  }

  Future<JsonMap?> getJsonOrNull(
    String path, {
    Map<String, String?>? queryParameters,
    Set<int> nullableStatusCodes = const {404, 501},
  }) async {
    try {
      return await getJson(path, queryParameters: queryParameters);
    } on ApiError catch (error) {
      final statusCode = error.statusCode;
      if (statusCode != null && nullableStatusCodes.contains(statusCode)) {
        return null;
      }
      rethrow;
    }
  }

  Future<JsonMap?> fetchPlanDetail(String planId) {
    return getJsonOrNull('/plans/$planId');
  }

  Future<JsonMap?> fetchPlaceDetail(String placeId) {
    return getJsonOrNull('/places/$placeId');
  }


  Future<EntitlementSummary> fetchEntitlementSummary({String targetType = 'USER'}) async {
    final response = await getJson('/v1/entitlements/summary', queryParameters: {'targetType': targetType});
    return EntitlementSummary.fromJson(response);
  }

  Future<RolloutSummary> fetchRolloutSummary() async {
    final response = await getJson('/v1/rollouts/summary');
    return RolloutSummary.fromJson(response);
  }

  String? buildPhotoUrl(String? token) {
    if (token == null || token.isEmpty) {
      return null;
    }
    if (token.startsWith('http://') || token.startsWith('https://')) {
      return token;
    }
    if (token.startsWith('file://')) {
      return null;
    }
    return buildUri('/photos', <String, String?>{'name': token}).toString();
  }

  Future<Object> getDecoded(String path, {Map<String, String?>? queryParameters}) {
    return _send(
      method: 'GET',
      path: path,
      queryParameters: queryParameters,
    );
  }

  Future<JsonMap> postJson(
    String path, {
    Object? body,
    Map<String, String?>? queryParameters,
  }) {
    return _sendForJsonMap(
      method: 'POST',
      path: path,
      queryParameters: queryParameters,
      body: body,
    );
  }

  Future<T> postJsonTyped<T>(
    String path, {
    Object? body,
    Map<String, String?>? queryParameters,
    required T Function(Map<String, dynamic>) fromJson,
  }) async {
    final response = await postJson(
      path,
      body: body,
      queryParameters: queryParameters,
    );
    return fromJson(response);
  }

  Future<JsonMap> deleteJson(String path, {Object? body}) {
    return _sendForJsonMap(method: 'DELETE', path: path, body: body);
  }

  Future<JsonMap> putJson(
    String path, {
    Object? body,
    Map<String, String?>? queryParameters,
  }) {
    return _sendForJsonMap(
      method: 'PUT',
      path: path,
      queryParameters: queryParameters,
      body: body,
    );
  }

  Future<JsonMap> patchJson(
    String path, {
    Object? body,
    Map<String, String?>? queryParameters,
  }) {
    return _sendForJsonMap(
      method: 'PATCH',
      path: path,
      queryParameters: queryParameters,
      body: body,
    );
  }

  Future<JsonMap> _sendForJsonMap({
    required String method,
    required String path,
    Map<String, String?>? queryParameters,
    Object? body,
  }) async {
    final decoded = await _send(
      method: method,
      path: path,
      queryParameters: queryParameters,
      body: body,
    );
    if (decoded is JsonMap) {
      return decoded;
    }
    throw ApiError.decoding(
      'Expected JSON object response but received ${decoded.runtimeType}',
      details: decoded,
    );
  }

  Future<Object> _send({
    required String method,
    required String path,
    Map<String, String?>? queryParameters,
    Object? body,
  }) async {
    final uri = buildUri(path, queryParameters);
    final userId = (await userIdResolver()).trim();
    if (userId.isEmpty) {
      throw ApiError.unknown('Missing user identity for API request');
    }

    var attempt = 0;
    while (true) {
      final requestId = Uuid.v4();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-user-id': userId,
        'x-request-id': requestId,
      };

      try {
        _logDebugRequest(method: method, uri: uri);
        final response = await _request(method, uri, headers, body).timeout(timeout);
        _logResponse(method: method, uri: uri, response: response);

        if (retryPolicy.shouldRetryStatusCode(response.statusCode) &&
            attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return _decodeBody(response.body);
        }

        _logHttpFailure(
          method: method,
          uri: uri,
          statusCode: response.statusCode,
          responseBody: response.body,
        );
        final decodedErrorBody = _tryDecodeBody(response.body);
        throw ApiError.http(
          'HTTP ${response.statusCode} body="${_bodySnippet(response.body)}"',
          statusCode: response.statusCode,
          serverPayload:
              decodedErrorBody is JsonMap ? ErrorPayload.tryParse(decodedErrorBody) : null,
          details: decodedErrorBody ?? response.body,
        );
      } on TimeoutException catch (error, stackTrace) {
        _logRequestException(method: method, uri: uri, error: error);
        if (attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        Log.error('Timeout for $method $uri', error: error, stackTrace: stackTrace);
        throw ApiError.timeout('Request timed out', details: error);
      } on SocketException catch (error, stackTrace) {
        _logRequestException(method: method, uri: uri, error: error);
        if (attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        Log.error('Socket error for $method $uri', error: error, stackTrace: stackTrace);
        throw ApiError.network('Network error', details: error);
      } on http.ClientException catch (error, stackTrace) {
        _logRequestException(method: method, uri: uri, error: error);
        if (retryPolicy.shouldRetryException(error) && attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        Log.error('Client error for $method $uri', error: error, stackTrace: stackTrace);
        throw ApiError.network('HTTP client error', details: error);
      } on ApiError {
        rethrow;
      } catch (error, stackTrace) {
        _logRequestException(method: method, uri: uri, error: error);
        Log.error('Unexpected API error for $method $uri',
            error: error, stackTrace: stackTrace);
        throw ApiError.unknown('Unexpected API error', details: error);
      }
    }
  }

  Future<bool> _ping(Uri uri) async {
    try {
      final response = await httpClient
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(reachabilityTimeout);
      Log.d('Reachability check GET $uri -> ${response.statusCode}');
      return response.statusCode == 200;
    } catch (error) {
      _logRequestException(method: 'GET', uri: uri, error: error);
      return false;
    }
  }

  Future<http.Response> _request(
    String method,
    Uri uri,
    Map<String, String> headers,
    Object? body,
  ) {
    final encodedBody = body == null ? null : jsonEncode(body);

    switch (method) {
      case 'GET':
        return httpClient.get(uri, headers: headers);
      case 'POST':
        return httpClient.post(uri, headers: headers, body: encodedBody);
      case 'DELETE':
        return httpClient.delete(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        return httpClient.patch(uri, headers: headers, body: encodedBody);
      default:
        throw UnsupportedError('Unsupported method $method');
    }
  }

  void _logHttpFailure({
    required String method,
    required Uri uri,
    required int statusCode,
    required String responseBody,
  }) {
    if (kDebugMode) {
      final snippet = _bodySnippet500(responseBody);
      Log.warn('$method $uri failed: status=$statusCode body="$snippet"');
      return;
    }
    Log.warn('$method ${uri.path} failed: status=$statusCode');
  }

  void _logDebugRequest({
    required String method,
    required Uri uri,
  }) {
    if (kDebugMode) {
      Log.d('$method $uri');
    }
  }

  void _logResponse({
    required String method,
    required Uri uri,
    required http.Response response,
  }) {
    final requestId = response.headers['x-request-id'];
    final snippet = _bodySnippet(response.body);
    if (uri.path.endsWith('/plans')) {
      lastPlansStatus = response.statusCode;
      lastPlansBodySnippet = snippet;
    }
    if (uri.path.endsWith('/live-results')) {
      lastLiveResultsStatus = response.statusCode;
      lastLiveResultsBodySnippet = snippet;
    }
    Log.d(
      '$method ${uri.path.isEmpty ? '/' : uri.path} url=$uri status=${response.statusCode} x-request-id=${requestId ?? '-'} body="$snippet"',
    );
  }

  String _bodySnippet(String responseBody) {
    if (responseBody.length > 200) {
      return '${responseBody.substring(0, 200)}...';
    }
    return responseBody;
  }

  String _bodySnippet500(String responseBody) {
    if (responseBody.length > 500) {
      return '${responseBody.substring(0, 500)}...';
    }
    return responseBody;
  }

  String _bodySnippet120(String responseBody) {
    if (responseBody.length > 120) {
      return '${responseBody.substring(0, 120)}...';
    }
    return responseBody;
  }

  void _logRequestException({
    required String method,
    required Uri uri,
    required Object error,
  }) {
    if (kDebugMode) {
      Log.warn('$method $uri exception=${error.runtimeType} message=$error');
      return;
    }
    Log.warn('$method ${uri.path} failed (${error.runtimeType})');
  }

  Object _decodeBody(String body) {
    if (body.trim().isEmpty) {
      return <String, dynamic>{};
    }

    try {
      final decoded = jsonDecode(body);
      if (decoded is JsonMap || decoded is JsonList) {
        return decoded;
      }
      throw const FormatException('Expected JSON object or array');
    } on FormatException catch (error) {
      Log.error('JSON decode failed. rawBody="${_bodySnippet500(body)}"', error: error);
      throw ApiError.decoding(
        'Invalid JSON response',
        details: {'error': error.toString(), 'rawBodySnippet': _bodySnippet500(body)},
      );
    }
  }

  Object? _tryDecodeBody(String body) {
    if (body.trim().isEmpty) {
      return <String, dynamic>{};
    }
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}
