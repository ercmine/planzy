import 'dart:async';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:video_player/video_player.dart';

import '../../core/utils/uuid.dart';
import '../../providers/app_providers.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';
import 'data/place_review_draft_store.dart';
import 'models/place_review_video_draft.dart';
import 'services/place_review_export_service.dart';
import 'services/place_review_upload_service.dart';

class PlaceReviewEditorState {
  const PlaceReviewEditorState({
    required this.draft,
    this.controller,
    this.isInitializing = false,
    this.isSavingDraft = false,
    this.isExporting = false,
    this.isPublishing = false,
    this.exportProgress = 0,
    this.uploadProgress = 0,
    this.lastError,
    this.statusMessage,
    this.exportResult,
    this.unsupportedMessage,
    this.hasRecoveredDraft = false,
  });

  final PlaceReviewVideoDraft draft;
  final VideoPlayerController? controller;
  final bool isInitializing;
  final bool isSavingDraft;
  final bool isExporting;
  final bool isPublishing;
  final double exportProgress;
  final double uploadProgress;
  final String? lastError;
  final String? statusMessage;
  final ReviewExportResult? exportResult;
  final String? unsupportedMessage;
  final bool hasRecoveredDraft;

  bool get canPublish => draft.metadata.place != null && draft.totalDurationMs > 0 && draft.metadata.rating.overall > 0 && !isPublishing;

  PlaceReviewEditorState copyWith({
    PlaceReviewVideoDraft? draft,
    VideoPlayerController? controller,
    bool setController = false,
    bool? isInitializing,
    bool? isSavingDraft,
    bool? isExporting,
    bool? isPublishing,
    double? exportProgress,
    double? uploadProgress,
    String? lastError,
    bool clearError = false,
    String? statusMessage,
    bool clearStatus = false,
    ReviewExportResult? exportResult,
    bool clearExportResult = false,
    String? unsupportedMessage,
    bool clearUnsupportedMessage = false,
    bool? hasRecoveredDraft,
  }) {
    return PlaceReviewEditorState(
      draft: draft ?? this.draft,
      controller: setController ? controller : this.controller,
      isInitializing: isInitializing ?? this.isInitializing,
      isSavingDraft: isSavingDraft ?? this.isSavingDraft,
      isExporting: isExporting ?? this.isExporting,
      isPublishing: isPublishing ?? this.isPublishing,
      exportProgress: exportProgress ?? this.exportProgress,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      lastError: clearError ? null : lastError ?? this.lastError,
      statusMessage: clearStatus ? null : statusMessage ?? this.statusMessage,
      exportResult: clearExportResult ? null : exportResult ?? this.exportResult,
      unsupportedMessage: clearUnsupportedMessage ? null : unsupportedMessage ?? this.unsupportedMessage,
      hasRecoveredDraft: hasRecoveredDraft ?? this.hasRecoveredDraft,
    );
  }

  static PlaceReviewEditorState initial({PlaceSearchResult? initialPlace}) {
    final now = DateTime.now();
    return PlaceReviewEditorState(
      draft: PlaceReviewVideoDraft(
        id: Uuid.v4(),
        createdAt: now,
        updatedAt: now,
        metadata: PlaceReviewMetadata(place: initialPlace, title: initialPlace?.name ?? ''),
      ),
    );
  }
}

class PlaceReviewEditorController extends StateNotifier<PlaceReviewEditorState> {
  PlaceReviewEditorController({
    required PlaceReviewDraftStore draftStore,
    required PlaceReviewExportService exportService,
    required PlaceReviewUploadService uploadService,
    PlaceSearchResult? initialPlace,
    PlaceReviewVideoDraft? initialDraft,
  })  : _draftStore = draftStore,
        _exportService = exportService,
        _uploadService = uploadService,
        super(initialDraft == null
            ? PlaceReviewEditorState.initial(initialPlace: initialPlace)
            : PlaceReviewEditorState(draft: initialDraft));

  final PlaceReviewDraftStore _draftStore;
  final PlaceReviewExportService _exportService;
  final PlaceReviewUploadService _uploadService;
  Timer? _autosaveTimer;

  Future<void> initialize({bool recoverLatest = false}) async {
    state = state.copyWith(isInitializing: true, clearError: true, clearUnsupportedMessage: true);
    try {
      if (recoverLatest && state.draft.clips.isEmpty) {
        final recovered = _draftStore.loadLatestDraft();
        if (recovered != null && recovered.clips.isNotEmpty) {
          state = state.copyWith(
            draft: recovered.copyWith(updatedAt: DateTime.now(), recovered: true),
            hasRecoveredDraft: true,
          );
        }
      }
      await _reloadController();
    } catch (error) {
      state = state.copyWith(lastError: '$error');
    } finally {
      state = state.copyWith(isInitializing: false);
    }
  }

  Future<void> setClipFiles(List<({String path, Duration duration, int? width, int? height})> clips) async {
    if (clips.isEmpty) {
      state = state.copyWith(lastError: 'No video clips were selected.');
      return;
    }
    final mapped = clips
        .map(
          (clip) => ReviewClipItem(
            id: Uuid.v4(),
            filePath: clip.path,
            fileName: p.basename(clip.path),
            durationMs: clip.duration.inMilliseconds,
            width: clip.width,
            height: clip.height,
          ),
        )
        .toList(growable: false);
    state = state.copyWith(
      draft: state.draft.copyWith(clips: mapped, selectedClipIndex: 0, updatedAt: DateTime.now()),
      clearError: true,
      clearUnsupportedMessage: true,
      clearExportResult: true,
    );
    await _reloadController();
    _scheduleAutosave();
  }

  void selectClip(int index) {
    state = state.copyWith(draft: state.draft.copyWith(selectedClipIndex: index, updatedAt: DateTime.now()));
    unawaited(_reloadController());
  }

  void reorderClips(int oldIndex, int newIndex) {
    final clips = [...state.draft.clips];
    if (oldIndex < 0 || oldIndex >= clips.length) return;
    if (newIndex > oldIndex) newIndex -= 1;
    final clip = clips.removeAt(oldIndex);
    clips.insert(newIndex.clamp(0, clips.length), clip);
    state = state.copyWith(draft: state.draft.copyWith(clips: clips, selectedClipIndex: newIndex.clamp(0, clips.length - 1), updatedAt: DateTime.now()));
    _scheduleAutosave();
  }

  void deleteClip(int index) {
    final clips = [...state.draft.clips]..removeAt(index);
    state = state.copyWith(draft: state.draft.copyWith(clips: clips, selectedClipIndex: 0, updatedAt: DateTime.now()));
    unawaited(_reloadController());
    _scheduleAutosave();
  }

  void updateTrim({required int startMs, required int endMs}) {
    final clip = state.draft.selectedClip;
    if (clip == null) return;
    final clips = [...state.draft.clips];
    clips[state.draft.selectedClipIndex] = clip.copyWith(trimStartMs: startMs.clamp(0, clip.durationMs), trimEndMs: endMs.clamp(0, clip.durationMs));
    state = state.copyWith(draft: state.draft.copyWith(clips: clips, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void updateTransform(EditorTransformSettings value) {
    state = state.copyWith(draft: state.draft.copyWith(transform: value, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void updateAudio(EditorAudioSettings value) {
    state = state.copyWith(draft: state.draft.copyWith(audio: value, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void updateMetadata(PlaceReviewMetadata value) {
    state = state.copyWith(draft: state.draft.copyWith(metadata: value, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void addOverlay(ReviewOverlayItem item) {
    state = state.copyWith(draft: state.draft.copyWith(overlays: [...state.draft.overlays, item], updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void updateOverlay(ReviewOverlayItem item) {
    final overlays = state.draft.overlays.map((overlay) => overlay.id == item.id ? item : overlay).toList(growable: false);
    state = state.copyWith(draft: state.draft.copyWith(overlays: overlays, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  void deleteOverlay(String id) {
    final overlays = state.draft.overlays.where((overlay) => overlay.id != id).toList(growable: false);
    state = state.copyWith(draft: state.draft.copyWith(overlays: overlays, updatedAt: DateTime.now()), clearExportResult: true);
    _scheduleAutosave();
  }

  Future<void> saveDraft() async {
    state = state.copyWith(isSavingDraft: true, clearError: true, statusMessage: 'Saving draft…');
    try {
      final updated = state.draft.copyWith(updatedAt: DateTime.now(), isDraft: true);
      await _draftStore.saveDraft(updated);
      state = state.copyWith(draft: updated, isSavingDraft: false, statusMessage: 'Draft saved locally');
    } catch (error) {
      state = state.copyWith(isSavingDraft: false, lastError: '$error');
    }
  }

  Future<void> exportPreview() async {
    state = state.copyWith(isExporting: true, exportProgress: 0.15, clearError: true, statusMessage: 'Preparing preview render…');
    try {
      final result = await _exportService.exportDraft(state.draft);
      state = state.copyWith(isExporting: false, exportProgress: 1, exportResult: result, statusMessage: 'Preview render ready');
    } catch (error) {
      state = state.copyWith(isExporting: false, exportProgress: 0, lastError: '$error');
    }
  }

  Future<ReviewPublishPayload?> publish() async {
    state = state.copyWith(isPublishing: true, isExporting: true, exportProgress: 0.2, uploadProgress: 0.05, clearError: true, statusMessage: 'Exporting final video…');
    try {
      final exportResult = await _exportService.exportDraft(state.draft);
      state = state.copyWith(exportResult: exportResult, isExporting: false, exportProgress: 1, uploadProgress: 0.35, statusMessage: 'Publishing review…');
      final payload = await _uploadService.publishDraft(draft: state.draft, exportResult: exportResult);
      await _draftStore.deleteDraft(state.draft.id);
      state = state.copyWith(isPublishing: false, uploadProgress: 1, statusMessage: 'Place review published');
      return payload;
    } catch (error) {
      state = state.copyWith(isPublishing: false, isExporting: false, lastError: '$error', uploadProgress: 0);
      return null;
    }
  }

  Future<void> discard() => _draftStore.deleteDraft(state.draft.id);

  Future<void> _reloadController() async {
    final previous = state.controller;
    await previous?.dispose();
    final clip = state.draft.selectedClip;
    if (clip == null) {
      state = state.copyWith(controller: null, setController: true);
      return;
    }
    final file = File(clip.filePath);
    if (!await file.exists()) {
      state = state.copyWith(controller: null, setController: true, unsupportedMessage: 'The selected clip is no longer available on this device.');
      return;
    }
    final controller = VideoPlayerController.file(file);
    await controller.initialize();
    await controller.setLooping(true);
    await controller.setVolume(state.draft.audio.muteOriginal ? 0 : state.draft.audio.originalVolume);
    state = state.copyWith(controller: controller, setController: true);
  }

  void _scheduleAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer(const Duration(milliseconds: 500), () {
      unawaited(saveDraft());
    });
  }

  @override
  void dispose() {
    _autosaveTimer?.cancel();
    state.controller?.dispose();
    super.dispose();
  }
}

final placeReviewDraftStoreProvider = FutureProvider<PlaceReviewDraftStore>((ref) async {
  final localStore = await ref.watch(localStoreProvider.future);
  return PlaceReviewDraftStore(localStore);
});

final placeReviewExportServiceProvider = Provider<PlaceReviewExportService>((ref) => PlaceReviewExportService());

final placeReviewUploadServiceProvider = FutureProvider<PlaceReviewUploadService>((ref) async {
  final videoRepository = await ref.watch(videoRepositoryProvider.future);
  return PlaceReviewUploadService(videoRepository: videoRepository);
});

final placeReviewEditorControllerProvider = StateNotifierProvider.autoDispose
    .family<PlaceReviewEditorController, PlaceReviewEditorState, ({PlaceSearchResult? initialPlace, PlaceReviewVideoDraft? initialDraft})>((ref, args) {
  final draftStore = ref.watch(placeReviewDraftStoreProvider).value;
  final uploadService = ref.watch(placeReviewUploadServiceProvider).value;
  final exportService = ref.watch(placeReviewExportServiceProvider);

  if (draftStore == null || uploadService == null) {
    throw StateError('Place review editor dependencies are not ready');
  }

  final controller = PlaceReviewEditorController(
    draftStore: draftStore,
    exportService: exportService,
    uploadService: uploadService,
    initialPlace: args.initialPlace,
    initialDraft: args.initialDraft,
  );
  ref.onDispose(controller.dispose);
  return controller;
});
