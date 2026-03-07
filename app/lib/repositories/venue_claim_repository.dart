import '../api/api_client.dart';
import '../api/api_error.dart';
import '../api/endpoints.dart';
import '../models/venue_claim.dart';

class VenueClaimRepository {
  VenueClaimRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<CreateVenueClaimResponse> createClaim(CreateVenueClaimRequest req) async {
    final body = req.toJson()
      ..removeWhere((key, value) => value == null || (value is String && value.isEmpty));

    try {
      final response = await _apiClient.postJson(ApiEndpoints.venueClaimsV1, body: body);
      return CreateVenueClaimResponse.fromJson(response);
    } on ApiError catch (error) {
      if (error.statusCode != 404) {
        rethrow;
      }
      final response = await _apiClient.postJson(ApiEndpoints.venueClaimsLegacy, body: body);
      return CreateVenueClaimResponse.fromJson(response);
    }
  }
}
