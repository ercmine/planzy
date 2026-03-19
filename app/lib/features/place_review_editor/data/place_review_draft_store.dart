import '../../../core/cache/local_store.dart';
import '../models/place_review_video_draft.dart';

class PlaceReviewDraftStore {
  PlaceReviewDraftStore(this._localStore);

  static const draftKeyPrefix = 'place_review_video_draft_';
  static const latestDraftKey = 'place_review_video_draft_latest';

  final LocalStore _localStore;

  Future<void> saveDraft(PlaceReviewVideoDraft draft) async {
    await _localStore.saveJson('$draftKeyPrefix${draft.id}', draft.toJson());
    await _localStore.saveJson(latestDraftKey, draft.toJson());
  }

  PlaceReviewVideoDraft? loadDraft(String draftId) {
    final data = _localStore.loadJson('$draftKeyPrefix$draftId');
    if (data == null) return null;
    return PlaceReviewVideoDraft.fromJson(data);
  }

  PlaceReviewVideoDraft? loadLatestDraft() {
    final data = _localStore.loadJson(latestDraftKey);
    if (data == null) return null;
    return PlaceReviewVideoDraft.fromJson(data);
  }

  Future<void> deleteDraft(String draftId) async {
    await _localStore.remove('$draftKeyPrefix$draftId');
    final latest = loadLatestDraft();
    if (latest?.id == draftId) {
      await _localStore.remove(latestDraftKey);
    }
  }
}
