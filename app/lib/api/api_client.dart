import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/cache/local_store.dart';
import '../core/env/env.dart';
import '../core/utils/json.dart';
import '../core/utils/uuid.dart';
import '../models/error_payload.dart';
import 'api_error.dart';
import 'retry.dart';

class ApiClient {
  ApiClient({
    required this.httpClient,
    required this.envConfig,
    required this.localStore,
    this.retryPolicy = const RetryPolicy(),
    this.timeout = const Duration(seconds: 20),
  });

  final http.Client httpClient;
  final EnvConfig envConfig;
  final LocalStore localStore;
  final RetryPolicy retryPolicy;
  final Duration timeout;

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
    final userId = await localStore.getOrCreateUserId();

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
          return decoded is JsonMap ? decoded : <String, dynamic>{'data': decoded};
        }

        throw ApiError.http(
          'HTTP ${response.statusCode}',
          statusCode: response.statusCode,
          serverPayload: decoded is JsonMap ? ErrorPayload.tryParse(decoded) : null,
          details: decoded,
        );
      } on TimeoutException catch (error) {
        if (attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        throw ApiError.timeout('Request timed out', details: error);
      } on SocketException catch (error) {
        if (attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        throw ApiError.network('Network error', details: error);
      } on http.ClientException catch (error) {
        if (retryPolicy.shouldRetryException(error) && attempt < retryPolicy.maxRetries) {
          await Future<void>.delayed(retryPolicy.delayForAttempt(attempt));
          attempt += 1;
          continue;
        }
        throw ApiError.network('HTTP client error', details: error);
      } on ApiError {
        rethrow;
      } catch (error) {
        throw ApiError.unknown('Unexpected API error', details: error);
      }
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
