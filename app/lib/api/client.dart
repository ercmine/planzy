import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiClient {
  final String baseUrl;
  final String? userId;
  final http.Client _http;

  ApiClient({
    required this.baseUrl,
    this.userId,
    http.Client? client,
  }) : _http = client ?? http.Client();

  Future<ClaimVenueResponse> createVenueClaim({
    required String venueId,
    required String contactEmail,
    String? message,
    String? planId,
    String? provider,
  }) async {
    final uri = Uri.parse('$baseUrl/v1/venue-claims');
    final payload = <String, dynamic>{
      'venueId': venueId,
      'contactEmail': contactEmail,
      if (message != null && message.isNotEmpty) 'message': message,
      if (planId != null && planId.isNotEmpty) 'planId': planId,
      if (provider != null && provider.isNotEmpty) 'provider': provider,
    };

    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (userId != null && userId!.isNotEmpty) 'x-user-id': userId!,
    };

    final response = await _http.post(
      uri,
      headers: headers,
      body: jsonEncode(payload),
    );

    Map<String, dynamic> json;
    try {
      json = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception('API returned invalid JSON (${response.statusCode}).');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final details = json['details'];
      final detailText = details is List ? details.join(', ') : (json['error'] ?? 'Unknown error').toString();
      throw Exception('Claim failed (${response.statusCode}): $detailText');
    }

    return ClaimVenueResponse.fromJson(json);
  }
}
