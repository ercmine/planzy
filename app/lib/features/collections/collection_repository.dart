import '../../api/api_client.dart';
import 'collection_models.dart';

class CollectionRepository {
  final ApiClient _client;
  CollectionRepository(this._client);

  Future<List<CollectionCardModel>> fetchCollections() async {
    final json = await _client.getJson('/v1/collections');
    final list = (json['collections'] as List?) ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(CollectionCardModel.fromJson)
        .toList(growable: false);
  }
}
