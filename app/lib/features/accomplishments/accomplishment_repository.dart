import '../../api/api_client.dart';
import 'accomplishment_models.dart';

class AccomplishmentRepository {
  AccomplishmentRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<AccomplishmentSummary?> fetchSummary() async {
    final response = await apiClient.getJsonOrNull('/v1/accomplishments/summary');
    if (response == null) return null;
    return AccomplishmentSummary.fromJson(response);
  }
}
