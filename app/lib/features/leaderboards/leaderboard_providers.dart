import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'leaderboard_models.dart';

class CompetitionRepository {
  CompetitionRepository(this.ref);
  final Ref ref;

  Future<CompetitionHubModel> fetchHome() async {
    final api = await ref.read(apiClientProvider.future);
    final response = await api.getJson('/v1/competition/home');
    return CompetitionHubModel.fromJson(response);
  }
}

final competitionRepositoryProvider = Provider((ref) => CompetitionRepository(ref));
final competitionHubProvider = FutureProvider<CompetitionHubModel>((ref) async {
  final repository = ref.watch(competitionRepositoryProvider);
  return repository.fetchHome();
});
