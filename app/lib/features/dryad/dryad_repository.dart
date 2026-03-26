import '../../api/api_client.dart';
import '../../api/api_error.dart';
import 'data/dryad_seed_data.dart';
import 'models/dryad_models.dart';

class DryadRepository {
  const DryadRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<DryadTree>> fetchPlanting({double? north, double? south, double? east, double? west}) async {
    try {
      final payload = await apiClient.getJson('/v1/dryad/trees', queryParameters: {
        if (north != null) 'north': north.toStringAsFixed(6),
        if (south != null) 'south': south.toStringAsFixed(6),
        if (east != null) 'east': east.toStringAsFixed(6),
        if (west != null) 'west': west.toStringAsFixed(6),
      });
      final rows = (payload['trees'] as List?) ?? const [];
      return rows.whereType<Map<String, dynamic>>().map(DryadTree.fromJson).toList(growable: false);
    } on ApiError {
      return DryadSeedData.trees;
    }
  }

  Future<List<DryadTree>> fetchMarketplace() async {
    try {
      final payload = await apiClient.getJson('/v1/dryad/market/listings');
      final rows = (payload['trees'] as List?) ?? const [];
      return rows.whereType<Map<String, dynamic>>().map(DryadTree.fromJson).toList(growable: false);
    } on ApiError {
      return DryadSeedData.trees.where((tree) => tree.saleStatus == TreeSaleStatus.listed).toList(growable: false);
    }
  }

  Future<DryadTree?> fetchTree(String treeId) async {
    try {
      final payload = await apiClient.getJson('/v1/dryad/trees/$treeId');
      return DryadTree.fromJson(payload);
    } on ApiError {
      for (final tree in DryadSeedData.trees) {
        if (tree.id == treeId) return tree;
      }
      return null;
    }
  }

  Future<void> claimAndPlant(String treeId, {required String wallet}) async {
    await apiClient.postJson('/v1/dryad/trees/$treeId/claim-plant', body: {'wallet': wallet});
  }

  Future<void> listTree(String treeId, {required String wallet, required double priceEth}) async {
    await apiClient.postJson('/v1/dryad/market/listings', body: {'treeId': treeId, 'wallet': wallet, 'priceEth': priceEth});
  }

  Future<void> unlistTree(String treeId, {required String wallet}) async {
    await apiClient.deleteJson('/v1/dryad/market/listings/$treeId', body: {'wallet': wallet});
  }

  Future<void> buyTree(String treeId, {required String buyerWallet}) async {
    await apiClient.postJson('/v1/dryad/market/buy', body: {'treeId': treeId, 'buyerWallet': buyerWallet});
  }
}
