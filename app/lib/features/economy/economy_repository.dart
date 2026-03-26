import '../../api/api_client.dart';
import '../challenges/challenge_models.dart';
import 'economy_models.dart';

class EconomyRepository {
  EconomyRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<EconomyDashboard> fetchDashboard() async {
    final payload = await apiClient.getJson('/v1/dryad-economy/me');
    return EconomyDashboard.fromJson(payload);
  }

  Future<List<SponsoredPlacement>> fetchSponsoredPlacements({
    required double lat,
    required double lng,
    String surface = 'map',
  }) async {
    final payload = await apiClient.getJson('/v1/discovery/sponsored-placements', queryParameters: {
      'lat': lat.toStringAsFixed(6),
      'lng': lng.toStringAsFixed(6),
      'surface': surface,
    });
    final rows = (payload['placements'] as List?) ?? const [];
    return rows.whereType<Map>().map((row) => SponsoredPlacement.fromJson(row.cast<String, dynamic>())).toList(growable: false);
  }

  Future<QuestHubResponse?> fetchQuestHub({String? cityId}) async {
    final path = cityId == null ? '/v1/challenges/quest-hub' : '/v1/challenges/quest-hub?cityId=$cityId';
    final payload = await apiClient.getJsonOrNull(path);
    return payload == null ? null : QuestHubResponse.fromJson(payload);
  }
}
