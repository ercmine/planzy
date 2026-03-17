import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../api/api_client.dart';
import 'review_prompt_models.dart';

class ReviewPromptService {
  ReviewPromptService({required ApiClient apiClient, required SharedPreferences preferences})
      : _apiClient = apiClient,
        _preferences = preferences;

  static const String optInKey = 'review_prompt_opt_in';
  static const String backgroundModeKey = 'review_prompt_background_enabled';
  static const String historyKey = 'review_prompt_history_v1';
  static const String globalLastPromptKey = 'review_prompt_last_global';

  final ApiClient _apiClient;
  final SharedPreferences _preferences;

  bool get isOptedIn => _preferences.getBool(optInKey) ?? false;

  Future<void> setOptIn(bool enabled) => _preferences.setBool(optInKey, enabled);
  Future<void> setBackgroundMode(bool enabled) => _preferences.setBool(backgroundModeKey, enabled);

  Future<ReviewPromptDecision> evaluate({required double lat, required double lng, required List<String> reviewedPlaceIds}) async {
    if (!isOptedIn) {
      return const ReviewPromptDecision(shouldPrompt: false, suppressionReason: 'opted_out');
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    final lastGlobal = _preferences.getInt(globalLastPromptKey) ?? 0;
    if (now - lastGlobal < const Duration(hours: 4).inMilliseconds) {
      return const ReviewPromptDecision(shouldPrompt: false, suppressionReason: 'global_cooldown');
    }

    final response = await _apiClient.postJson('/v1/review-prompts/visit-match', body: {
      'lat': lat,
      'lng': lng,
      'reviewedPlaceIds': reviewedPlaceIds,
    });
    final match = VisitMatchResponse.fromJson(response);
    if (!match.matched || match.canonicalPlaceId == null) {
      return ReviewPromptDecision(shouldPrompt: false, suppressionReason: match.reason ?? 'not_matched', match: match);
    }

    final history = _loadHistory();
    final placeLastPrompt = history[match.canonicalPlaceId!] ?? 0;
    if (now - placeLastPrompt < const Duration(days: 10).inMilliseconds) {
      return ReviewPromptDecision(shouldPrompt: false, suppressionReason: 'place_cooldown', match: match);
    }

    return ReviewPromptDecision(shouldPrompt: true, match: match);
  }

  Future<void> markPromptSent(String canonicalPlaceId) async {
    final history = _loadHistory();
    final now = DateTime.now().millisecondsSinceEpoch;
    history[canonicalPlaceId] = now;
    await _preferences.setString(historyKey, jsonEncode(history));
    await _preferences.setInt(globalLastPromptKey, now);
  }

  Map<String, int> _loadHistory() {
    final raw = _preferences.getString(historyKey);
    if (raw == null || raw.isEmpty) return <String, int>{};
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) return <String, int>{};
    return decoded.map((key, value) => MapEntry(key, value is num ? value.toInt() : 0));
  }
}
