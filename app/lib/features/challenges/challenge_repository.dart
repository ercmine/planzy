import '../../api/api_client.dart';
import 'challenge_models.dart';

class ChallengeRepository {
  ChallengeRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<ChallengeSummary?> fetchSummary() async {
    final response = await apiClient.getJsonOrNull('/v1/challenges/summary');
    if (response == null) return null;
    return ChallengeSummary.fromJson(response);
  }
}
