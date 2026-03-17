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

  Future<QuestHubResponse?> fetchQuestHub({String? cityId}) async {
    final path = cityId == null ? '/v1/challenges/quest-hub' : '/v1/challenges/quest-hub?cityId=$cityId';
    final response = await apiClient.getJsonOrNull(path);
    if (response == null) return null;
    return QuestHubResponse.fromJson(response);
  }
}
