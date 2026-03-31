import '../../api/api_client.dart';
import 'models/perbug_models.dart';

class PerbugRepository {
  const PerbugRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<PerbugTree>> fetchPlanting({double? north, double? south, double? east, double? west}) async {
    final payload = await apiClient.getJson('/v1/perbug/trees', queryParameters: {
      if (north != null) 'north': north.toStringAsFixed(6),
      if (south != null) 'south': south.toStringAsFixed(6),
      if (east != null) 'east': east.toStringAsFixed(6),
      if (west != null) 'west': west.toStringAsFixed(6),
    });
    final rows = (payload['trees'] as List?) ?? const [];
    return rows.whereType<Map<String, dynamic>>().map(PerbugTree.fromJson).toList(growable: false);
  }

  Future<List<PerbugTree>> fetchMarketplace() async {
    final payload = await apiClient.getJson('/v1/perbug/market/listings');
    final rows = (payload['trees'] as List?) ?? (payload['listings'] as List?) ?? const [];
    return rows.whereType<Map<String, dynamic>>().map(PerbugTree.fromJson).toList(growable: false);
  }

  Future<List<PerbugTree>> fetchOwnedTrees({required String wallet}) async {
    final payload = await apiClient.getJson('/v1/perbug/trees/owned', queryParameters: {'wallet': wallet});
    final rows = (payload['trees'] as List?) ?? const [];
    return rows.whereType<Map<String, dynamic>>().map(PerbugTree.fromJson).toList(growable: false);
  }

  Future<PerbugTree?> fetchTree(String treeId) async {
    final payload = await apiClient.getJson('/v1/perbug/trees/$treeId');
    return PerbugTree.fromJson(payload);
  }

  Future<Map<String, dynamic>> digUpEligibility(String treeId, {required String wallet}) {
    return apiClient.getJson('/v1/perbug/trees/$treeId/dig-up-eligibility', queryParameters: {'wallet': wallet});
  }

  Future<Map<String, dynamic>> createDigUpIntent(String treeId, {required String wallet, required int chainId}) {
    return apiClient.postJson('/v1/perbug/trees/$treeId/dig-up-intents', body: {'wallet': wallet, 'chainId': chainId});
  }

  Future<Map<String, dynamic>> confirmDigUpIntent({
    required String intentId,
    required String paymentTxHash,
    required String from,
    required String to,
    required String valueWei,
    required int chainId,
  }) {
    return apiClient.postJson('/v1/perbug/dig-up-intents/$intentId/confirm', body: {
      'paymentTxHash': paymentTxHash,
      'from': from,
      'to': to,
      'valueWei': valueWei,
      'chainId': chainId,
    });
  }

  Future<List<PerbugSpot>> fetchUnclaimedSpots() async {
    final payload = await apiClient.getJson('/v1/perbug/spots/unclaimed');
    final rows = (payload['spots'] as List?) ?? const [];
    return rows.whereType<Map<String, dynamic>>().map(PerbugSpot.fromJson).toList(growable: false);
  }

  Future<List<PerbugTree>> fetchReplantableTrees({required String wallet}) async {
    final payload = await apiClient.getJson('/v1/perbug/trees/replantable', queryParameters: {'wallet': wallet});
    final rows = (payload['trees'] as List?) ?? const [];
    return rows.whereType<Map<String, dynamic>>().map(PerbugTree.fromJson).toList(growable: false);
  }

  Future<String> createReplantIntent({required String treeId, required String wallet, required String nextSpotId}) async {
    final payload = await apiClient.postJson('/v1/perbug/replant-intents', body: {'treeId': treeId, 'wallet': wallet, 'nextSpotId': nextSpotId});
    return (payload['intentId'] ?? '').toString();
  }

  Future<void> confirmReplantIntent(String intentId) async {
    await apiClient.postJson('/v1/perbug/replant-intents/$intentId/confirm', body: const {});
  }

  Future<void> claimAndPlant(String treeId, {required String wallet, required String seed}) async {
    await apiClient.postJson('/v1/perbug/trees/$treeId/claim-plant', body: {'wallet': wallet, 'seed': seed});
  }

  Future<void> listTree(String treeId, {required String wallet, required double priceEth}) async {
    await apiClient.postJson('/v1/perbug/market/listings', body: {'treeId': treeId, 'wallet': wallet, 'priceEth': priceEth});
  }

  Future<void> unlistTree(String treeId, {required String wallet}) async {
    await apiClient.deleteJson('/v1/perbug/market/listings/$treeId', body: {'wallet': wallet});
  }

  Future<void> buyTree(String treeId, {required String buyerWallet}) async {
    await apiClient.postJson('/v1/perbug/market/buy', body: {'treeId': treeId, 'buyerWallet': buyerWallet});
  }

  Future<Map<String, dynamic>> waterEligibility(String treeId, {required String wallet}) {
    return apiClient.getJson('/v1/perbug/trees/$treeId/water-eligibility', queryParameters: {'wallet': wallet});
  }

  Future<void> waterTree(String treeId, {required String wallet}) async {
    await apiClient.postJson('/v1/perbug/trees/$treeId/water', body: {'wallet': wallet});
  }
}
