import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../models/idea.dart';

class IdeasRepository {
  IdeasRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<CreateIdeaResponse> createIdea(
    String sessionId,
    CreateIdeaRequest request,
  ) async {
    final response = await apiClient.postJson(
      ApiEndpoints.ideas(sessionId),
      body: request.toJson(),
    );

    return CreateIdeaResponse.fromJson(response);
  }

  Future<ListIdeasResponse> listIdeas(
    String sessionId, {
    String? cursor,
    int? limit,
  }) async {
    final response = await apiClient.getJson(
      ApiEndpoints.ideas(sessionId),
      queryParameters: {
        'cursor': cursor,
        if (limit != null) 'limit': '$limit',
      },
    );
    return ListIdeasResponse.fromJson(response);
  }

  Future<void> deleteIdea(String sessionId, String ideaId) async {
    await apiClient.deleteJson(ApiEndpoints.ideaById(sessionId, ideaId));
  }
}
