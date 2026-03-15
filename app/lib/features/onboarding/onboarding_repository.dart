import '../../api/api_client.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_repository.dart';
import 'onboarding_models.dart';

class FeedBootstrap {
  const FeedBootstrap({required this.defaultScope, required this.itemsByScope, this.emptyTitle, this.emptyBody, this.suggestions = const []});

  final FeedScope defaultScope;
  final Map<FeedScope, List<PlaceVideoFeedItem>> itemsByScope;
  final String? emptyTitle;
  final String? emptyBody;
  final List<String> suggestions;
}

class OnboardingRepository {
  const OnboardingRepository({required this.apiClient, required this.videoRepository});

  final ApiClient apiClient;
  final VideoRepository videoRepository;

  Future<void> savePreferences(OnboardingPreferences preferences) async {
    await apiClient.putJson('/v1/onboarding/preferences', body: preferences.toJson());
  }

  Future<FeedBootstrap> fetchBootstrap() async {
    final response = await apiClient.getJson('/v1/feed/bootstrap');
    final rawDefault = (response['defaultScope'] ?? 'local').toString();
    final defaultScope = rawDefault == 'regional'
        ? FeedScope.regional
        : (rawDefault == 'global' ? FeedScope.global : FeedScope.local);

    List<PlaceVideoFeedItem> parse(String scopeName, FeedScope scope) {
      final map = response['feeds'];
      if (map is! Map<String, dynamic>) return const [];
      final row = map[scopeName];
      if (row is! Map<String, dynamic>) return const [];
      final items = row['items'];
      if (items is! List) return const [];
      return items.whereType<Map<String, dynamic>>().map((item) => PlaceVideoFeedItem.fromJson(item, scope)).toList(growable: false);
    }

    final empty = response['emptyState'];
    return FeedBootstrap(
      defaultScope: defaultScope,
      itemsByScope: {
        FeedScope.local: parse('local', FeedScope.local),
        FeedScope.regional: parse('regional', FeedScope.regional),
        FeedScope.global: parse('global', FeedScope.global),
      },
      emptyTitle: empty is Map<String, dynamic> ? empty['title']?.toString() : null,
      emptyBody: empty is Map<String, dynamic> ? empty['body']?.toString() : null,
      suggestions: empty is Map<String, dynamic>
          ? ((empty['suggestions'] is List) ? (empty['suggestions'] as List).map((e) => e.toString()).toList(growable: false) : const [])
          : const [],
    );
  }
}
