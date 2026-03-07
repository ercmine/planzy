import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/env/env.dart';
import '../core/logging/log.dart';
import '../core/utils/json.dart';
import '../core/utils/uuid.dart';
import '../models/error_payload.dart';
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

  Uri buildUri(String path, [Map<String, String?>? queryParameters]) {
    final base = Uri.parse(envConfig.apiBaseUrl);
    final sanitized = queryParameters == null
        ? null
        : Map<String, String>.fromEntries(
            queryParameters.entries
                .where((entry) => entry.value != null && entry.value!.isNotEmpty)
                .map((entry) => MapEntry(entry.key, entry.value!)),
          );

    return base.replace(
      path: '${base.path}${path.startsWith('/') ? path : '/$path'}',
      queryParameters: sanitized,
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
    return _send(
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
    return _send(method: 'DELETE', path: path, body: body);
  }

  Future<JsonMap> _send({
    required String method,
    required String path,
    Map<String, String?>? queryParameters,
    Object? body,
  }) async {
    final uri = buildUri(path, queryParameters);
    final userId = await userIdResolver();

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
        final response = await _request(method, uri, headers, body).timeout(timeout);

        if (retryPolicy.shouldRetryStatusCode(response.statusCode) &&
            attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }

        final decoded = _decodeBody(response.body);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          Log.d('$method $uri -> ${response.statusCode}');
          return decoded is JsonMap ? decoded : <String, dynamic>{'data': decoded};
        }

        _logHttpFailure(
          method: method,
          uri: uri,
          statusCode: response.statusCode,
          responseBody: response.body,
        );
        throw ApiError.http(
          'HTTP ${response.statusCode}',
          statusCode: response.statusCode,
          serverPayload: decoded is JsonMap ? ErrorPayload.tryParse(decoded) : null,
          details: decoded,
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
    final snippet = responseBody.length > 200
        ? '${responseBody.substring(0, 200)}...'
        : responseBody;
    Log.warn('$method $uri failed: status=$statusCode body="$snippet"');
  }

  void _logRequestException({
    required String method,
    required Uri uri,
    required Object error,
  }) {
    Log.warn('$method $uri exception=${error.runtimeType} message=$error');
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
      throw ApiError.decoding('Invalid JSON response', details: error);
    }
  }
}
