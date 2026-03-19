import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../app/theme/widgets.dart';
import '../../core/widgets/app_snackbar.dart';
import '../../core/widgets/section_card.dart';
import '../video_platform/video_models.dart';
import 'models/place_review_video_draft.dart';
import 'place_review_editor_controller.dart';
import 'services/place_review_export_service.dart';
import 'services/place_review_upload_service.dart';
import 'video_source_support.dart';
import 'widgets/place_picker_sheet.dart';
import 'widgets/trim_timeline.dart';

class PlaceReviewVideoEditorScreen extends ConsumerStatefulWidget {
  const PlaceReviewVideoEditorScreen({
    this.initialPlace,
    this.recoverLatestDraft = false,
    super.key,
  });

  final PlaceSearchResult? initialPlace;
  final bool recoverLatestDraft;

  @override
  ConsumerState<PlaceReviewVideoEditorScreen> createState() => _PlaceReviewVideoEditorScreenState();
}

enum _EditorToolTab { timeline, transform, audio, overlays, review, publish }

class _PlaceReviewVideoEditorScreenState extends ConsumerState<PlaceReviewVideoEditorScreen> with WidgetsBindingObserver {
  final _titleController = TextEditingController();
  final _captionController = TextEditingController();
  final _summaryController = TextEditingController();
  final _whatToOrderController = TextEditingController();
  final _bestTimeController = TextEditingController();
  final _companionsController = TextEditingController();
  final _hashtagsController = TextEditingController();
  final _titleFocusNode = FocusNode();
  final _captionFocusNode = FocusNode();
  final _summaryFocusNode = FocusNode();
  final _whatToOrderFocusNode = FocusNode();
  final _bestTimeFocusNode = FocusNode();
  final _companionsFocusNode = FocusNode();
  final _hashtagsFocusNode = FocusNode();
  final _imagePicker = ImagePicker();

  PlaceReviewEditorController? _controller;
  PlaceReviewEditorState? _state;
  void Function()? _removeListener;
  bool _loadingDeps = true;
  _EditorToolTab _activeTab = _EditorToolTab.timeline;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_bootstrap());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _removeListener?.call();
    _controller?.dispose();
    _titleController.dispose();
    _captionController.dispose();
    _summaryController.dispose();
    _whatToOrderController.dispose();
    _bestTimeController.dispose();
    _companionsController.dispose();
    _hashtagsController.dispose();
    _titleFocusNode.dispose();
    _captionFocusNode.dispose();
    _summaryFocusNode.dispose();
    _whatToOrderFocusNode.dispose();
    _bestTimeFocusNode.dispose();
    _companionsFocusNode.dispose();
    _hashtagsFocusNode.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      unawaited(_controller?.saveDraft() ?? Future<void>.value());
    }
  }

  Future<void> _bootstrap() async {
    final draftStore = await ref.read(placeReviewDraftStoreProvider.future);
    final uploadService = await ref.read(placeReviewUploadServiceProvider.future);
    final exportService = ref.read(placeReviewExportServiceProvider);
    final controller = PlaceReviewEditorController(
      draftStore: draftStore,
      exportService: exportService,
      uploadService: uploadService,
      initialPlace: widget.initialPlace,
    );
    _removeListener = controller.addListener((state) {
      if (!mounted) return;
      _syncControllers(state.draft.metadata);
      setState(() => _state = state);
    });
    await controller.initialize(recoverLatest: widget.recoverLatestDraft);
    if (!mounted) return;
    _syncControllers(controller.state.draft.metadata);
    setState(() {
      _controller = controller;
      _state = controller.state;
      _loadingDeps = false;
    });
  }

  void _syncControllers(PlaceReviewMetadata metadata) {
    _syncControllerValue(_titleController, _titleFocusNode, metadata.title);
    _syncControllerValue(_captionController, _captionFocusNode, metadata.caption);
    _syncControllerValue(_summaryController, _summaryFocusNode, metadata.reviewSummary);
    _syncControllerValue(_whatToOrderController, _whatToOrderFocusNode, metadata.whatToOrder);
    _syncControllerValue(_bestTimeController, _bestTimeFocusNode, metadata.bestTimeToGo);
    _syncControllerValue(_companionsController, _companionsFocusNode, metadata.companions.join(', '));
    _syncControllerValue(_hashtagsController, _hashtagsFocusNode, metadata.hashtags.join(' '));
  }

  void _syncControllerValue(TextEditingController controller, FocusNode focusNode, String value) {
    if (focusNode.hasFocus || controller.text == value) return;
    controller.value = controller.value.copyWith(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
      composing: TextRange.empty,
    );
  }

  PlaceReviewMetadata get _currentMetadata => _state?.draft.metadata ?? _controller?.state.draft.metadata ?? const PlaceReviewMetadata();

  void _updateMetadata(PlaceReviewMetadata Function(PlaceReviewMetadata current) transform) {
    final controller = _controller;
    if (controller == null) return;
    controller.updateMetadata(transform(_currentMetadata));
  }

  @override
  Widget build(BuildContext context) {
    final state = _state;
    if (_loadingDeps || state == null) {
      return const Scaffold(body: Center(child: AppSkeleton(height: 240)));
    }
    final theme = Theme.of(context);
    final controller = _controller!;

    return WillPopScope(
      onWillPop: () async {
        await _confirmDiscard();
        return false;
      },
      child: AppScaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: _confirmDiscard),
          title: const Text('Place Review Video Editor'),
          actions: [
            TextButton.icon(
              onPressed: state.isSavingDraft
                  ? null
                  : () async {
                      await controller.saveDraft();
                      if (!mounted) return;
                      AppSnackbar.show(context, 'Draft saved');
                    },
              icon: state.isSavingDraft
                  ? const SizedBox.square(dimension: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save_alt_rounded),
              label: const Text('Save draft'),
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                children: [
                  const BrandHeroCard(
                    child: AppSectionHeader(
                      title: 'Create a vivid place review',
                      subtitle: 'Edit, polish, and publish with premium Perbug motion and progress states.',
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildPreviewCard(theme, state, controller),
                  const SizedBox(height: 16),
                  if (state.hasRecoveredDraft)
                    const AppCard(
                      glow: true,
                      child: ListTile(
                        leading: Icon(Icons.history),
                        title: Text('Recovered your unfinished draft'),
                        subtitle: Text('Perbug restored your last draft after an interruption.'),
                      ),
                    ),
                  if (state.lastError != null)
                    Card(
                      color: theme.colorScheme.errorContainer,
                      child: ListTile(
                        leading: const Icon(Icons.error_outline),
                        title: const Text('Editor issue'),
                        subtitle: Text(state.lastError!),
                      ),
                    ),
                  if (state.unsupportedMessage != null)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.warning_amber_rounded),
                        title: const Text('Clip unavailable'),
                        subtitle: Text(state.unsupportedMessage!),
                      ),
                    ),
                  _buildClipLibrary(state, controller),
                  const SizedBox(height: 16),
                  _buildToolTray(state, controller),
                  const SizedBox(height: 16),
                  _buildReviewMetadata(state, controller),
                ],
              ),
            ),
            _buildStickyFooter(state, controller),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewCard(ThemeData theme, PlaceReviewEditorState state, PlaceReviewEditorController controller) {
    final videoController = state.controller;
    final aspectRatio = _aspectRatioValue(state.draft.transform.aspectRatio);
    final activeOverlays = state.draft.overlays;
    return AppSectionCard(
      title: 'Preview',
      icon: Icons.preview_rounded,
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: aspectRatio,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Container(
                color: Colors.black,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (videoController == null || !videoController.value.isInitialized)
                      _EmptyPreview(onImport: _pickVideoSource)
                    else
                      GestureDetector(
                        onScaleUpdate: (details) {
                          final transform = state.draft.transform;
                          controller.updateTransform(
                            transform.copyWith(
                              zoom: (transform.zoom * details.scale).clamp(1, 3),
                              offsetX: (transform.offsetX + details.focalPointDelta.dx / 250).clamp(-1, 1),
                              offsetY: (transform.offsetY + details.focalPointDelta.dy / 250).clamp(-1, 1),
                            ),
                          );
                        },
                        child: _PreviewCanvas(state: state, controller: videoController),
                      ),
                    ...activeOverlays.map((overlay) => _OverlayChip(overlay: overlay)).toList(growable: false),
                    if (state.draft.metadata.place != null)
                      Positioned(
                        left: 12,
                        right: 12,
                        bottom: 12,
                        child: _PlaceCard(metadata: state.draft.metadata),
                      ),
                    Positioned(
                      right: 12,
                      top: 12,
                      child: FilledButton.tonalIcon(
                        onPressed: videoController == null
                            ? _pickVideoSource
                            : () async {
                                if (videoController.value.isPlaying) {
                                  await videoController.pause();
                                } else {
                                  await videoController.play();
                                }
                                setState(() {});
                              },
                        icon: Icon(videoController?.value.isPlaying == true ? Icons.pause : Icons.play_arrow),
                        label: Text(videoController == null ? 'Import' : 'Preview'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: Text(state.statusMessage ?? 'Ready to edit', style: theme.textTheme.bodyMedium)),
              if (state.exportResult != null)
                FilledButton.tonalIcon(
                  onPressed: () => _showRenderPreview(state.exportResult!),
                  icon: const Icon(Icons.movie_creation_outlined),
                  label: const Text('Final preview'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildClipLibrary(PlaceReviewEditorState state, PlaceReviewEditorController controller) {
    return AppSectionCard(
      title: 'Clips',
      icon: Icons.video_library_outlined,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickVideoSource,
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('Record or import'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: state.draft.clips.isEmpty ? null : () => controller.exportPreview(),
                  icon: const Icon(Icons.visibility_outlined),
                  label: const Text('Render preview'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (state.draft.clips.isEmpty)
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(child: Icon(Icons.video_call_outlined)),
              title: Text('No footage yet'),
              subtitle: Text('Record a quick review on-site or import from your camera roll to start editing.'),
            )
          else
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: state.draft.clips.length,
              onReorder: controller.reorderClips,
              itemBuilder: (context, index) {
                final clip = state.draft.clips[index];
                final selected = index == state.draft.selectedClipIndex;
                return Card(
                  key: ValueKey(clip.id),
                  child: ListTile(
                    selected: selected,
                    leading: CircleAvatar(child: Text('${index + 1}')),
                    title: Text(clip.fileName),
                    subtitle: Text('Trimmed ${_formatMs(clip.trimmedDurationMs)} • Source ${_formatMs(clip.durationMs)}'),
                    trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => controller.deleteClip(index)),
                    onTap: () => controller.selectClip(index),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildToolTray(PlaceReviewEditorState state, PlaceReviewEditorController controller) {
    final clip = state.draft.selectedClip;
    return AppSectionCard(
      title: 'Editing tools',
      icon: Icons.tune_rounded,
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<_EditorToolTab>(
              segments: _EditorToolTab.values
                  .map((tab) => ButtonSegment<_EditorToolTab>(value: tab, label: Text(tab.name.toUpperCase()), icon: Icon(_iconForTab(tab))))
                  .toList(growable: false),
              selected: {_activeTab},
              onSelectionChanged: (selection) => setState(() => _activeTab = selection.first),
            ),
          ),
          const SizedBox(height: 16),
          switch (_activeTab) {
            _EditorToolTab.timeline when clip != null => TrimTimeline(
                clip: clip,
                positionMs: state.controller?.value.position.inMilliseconds ?? 0,
                onTrimChanged: (start, end) => controller.updateTrim(startMs: start, endMs: end),
                onScrub: (position) async => state.controller?.seekTo(Duration(milliseconds: position)),
              ),
            _EditorToolTab.timeline => const Text('Add a video clip to unlock timeline editing.'),
            _EditorToolTab.transform => _TransformEditor(
                transform: state.draft.transform,
                onChanged: controller.updateTransform,
              ),
            _EditorToolTab.audio => _AudioEditor(
                audio: state.draft.audio,
                onChanged: controller.updateAudio,
              ),
            _EditorToolTab.overlays => _OverlayEditor(
                overlays: state.draft.overlays,
                onAddPreset: _showAddOverlay,
                onDelete: controller.deleteOverlay,
              ),
            _EditorToolTab.review => _QuickReviewEditor(
                metadata: state.draft.metadata,
                onToggleTag: (tag) {
                  final tags = [...state.draft.metadata.tags];
                  tags.contains(tag) ? tags.remove(tag) : tags.add(tag);
                  controller.updateMetadata(state.draft.metadata.copyWith(tags: tags));
                },
                onToggleReaction: (reaction) {
                  final reactions = [...state.draft.metadata.quickReactions];
                  reactions.contains(reaction) ? reactions.remove(reaction) : reactions.add(reaction);
                  controller.updateMetadata(state.draft.metadata.copyWith(quickReactions: reactions));
                },
              ),
            _EditorToolTab.publish => _PublishSettingsEditor(
                metadata: state.draft.metadata,
                onChanged: controller.updateMetadata,
              ),
          },
        ],
      ),
    );
  }

  Widget _buildReviewMetadata(PlaceReviewEditorState state, PlaceReviewEditorController controller) {
    final metadata = state.draft.metadata;
    return AppSectionCard(
      title: 'Review details',
      icon: Icons.edit_note_rounded,
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CircleAvatar(child: Icon(Icons.place)),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(metadata.place?.name ?? 'Attach a place'),
                      const SizedBox(height: 4),
                      Text(metadata.place == null ? 'Search for the exact location you visited.' : '${metadata.place!.category} • ${metadata.place!.regionLabel}'),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.tonal(onPressed: _pickPlace, child: Text(metadata.place == null ? 'Select' : 'Change')),
            ],
          ),
          TextField(
            controller: _titleController,
            focusNode: _titleFocusNode,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.next,
            maxLines: 1,
            inputFormatters: [FilteringTextInputFormatter.singleLineFormatter],
            decoration: const InputDecoration(labelText: 'Review title'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(title: value)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _captionController,
            focusNode: _captionFocusNode,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.newline,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Caption'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(caption: value)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _ratingInput('Overall', metadata.rating.overall, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(overall: value))))),
              const SizedBox(width: 8),
              Expanded(child: _ratingInput('Food', metadata.rating.food, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(food: value))))),
              const SizedBox(width: 8),
              Expanded(child: _ratingInput('Drinks', metadata.rating.drinks, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(drinks: value))))),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _ratingInput('Service', metadata.rating.service, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(service: value))))),
              const SizedBox(width: 8),
              Expanded(child: _ratingInput('Vibe', metadata.rating.vibe, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(vibe: value))))),
              const SizedBox(width: 8),
              Expanded(child: _ratingInput('Value', metadata.rating.value, (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(value: value))))),
            ],
          ),
          const SizedBox(height: 12),
          SwitchListTile.adaptive(
            value: metadata.rating.recommend,
            title: const Text('Recommend this place'),
            subtitle: const Text('Flip off to mark this as not recommended.'),
            contentPadding: EdgeInsets.zero,
            onChanged: (value) => _updateMetadata((current) => current.copyWith(rating: current.rating.copyWith(recommend: value))),
          ),
          TextField(
            controller: _whatToOrderController,
            focusNode: _whatToOrderFocusNode,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.next,
            maxLines: 1,
            inputFormatters: [FilteringTextInputFormatter.singleLineFormatter],
            decoration: const InputDecoration(labelText: 'What to order'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(whatToOrder: value)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bestTimeController,
            focusNode: _bestTimeFocusNode,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.next,
            maxLines: 1,
            inputFormatters: [FilteringTextInputFormatter.singleLineFormatter],
            decoration: const InputDecoration(labelText: 'Best time to go'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(bestTimeToGo: value)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _summaryController,
            focusNode: _summaryFocusNode,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.sentences,
            textInputAction: TextInputAction.newline,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Review summary'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(reviewSummary: value)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _companionsController,
            focusNode: _companionsFocusNode,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.next,
            maxLines: 1,
            inputFormatters: [FilteringTextInputFormatter.singleLineFormatter],
            decoration: const InputDecoration(labelText: 'Companions / group context', hintText: 'Friends, family, coworkers'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(companions: value.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList(growable: false))),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _hashtagsController,
            focusNode: _hashtagsFocusNode,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.done,
            maxLines: 1,
            inputFormatters: [FilteringTextInputFormatter.singleLineFormatter],
            decoration: const InputDecoration(labelText: 'Hashtags / categories', hintText: '#brunch #nightlife'),
            onChanged: (value) => _updateMetadata((current) => current.copyWith(hashtags: value.split(RegExp(r'\s+')).where((item) => item.isNotEmpty).toList(growable: false))),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: () async {
                    final picked = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime.now(), initialDate: metadata.visitDate ?? DateTime.now());
                    if (picked != null) {
                      _updateMetadata((current) => current.copyWith(visitDate: picked));
                    }
                  },
                  icon: const Icon(Icons.calendar_today_outlined),
                  label: Text(metadata.visitDate == null ? 'Visit date' : '${metadata.visitDate!.year}-${metadata.visitDate!.month.toString().padLeft(2, '0')}-${metadata.visitDate!.day.toString().padLeft(2, '0')}'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SwitchListTile.adaptive(
                  value: metadata.currentlyHere,
                  title: const Text('Currently here'),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (value) => _updateMetadata((current) => current.copyWith(currentlyHere: value)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStickyFooter(PlaceReviewEditorState state, PlaceReviewEditorController controller) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 14, offset: Offset(0, -4))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (state.isExporting || state.isPublishing) ...[
              LinearProgressIndicator(value: state.isPublishing ? state.uploadProgress : state.exportProgress),
              const SizedBox(height: 8),
            ],
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: state.isSavingDraft ? null : () async {
                      await controller.saveDraft();
                      if (!mounted) return;
                      AppSnackbar.show(context, 'Draft saved for recovery');
                    },
                    icon: const Icon(Icons.bookmark_added_outlined),
                    label: const Text('Save draft'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: state.canPublish ? () => _publish(controller) : null,
                    icon: const Icon(Icons.publish_rounded),
                    label: const Text('Publish review'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickVideoSource() async {
    final action = await showModalBottomSheet<_VideoSourceAction>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.videocam_rounded), title: const Text('Record new video'), onTap: () => Navigator.of(context).pop(_VideoSourceAction.record)),
            ListTile(leading: const Icon(Icons.video_library_outlined), title: const Text('Import from gallery'), onTap: () => Navigator.of(context).pop(_VideoSourceAction.gallery)),
          ],
        ),
      ),
    );
    if (action == null) return;
    final isRecording = action == _VideoSourceAction.record;
    if (!supportsNativeVideoPicker(
      isWeb: kIsWeb,
      platform: defaultTargetPlatform,
    )) {
      if (!mounted) return;
      AppSnackbar.show(
        context,
        videoSourceUnavailableMessage(isRecording: isRecording),
        isError: true,
      );
      return;
    }
    try {
      final file = await _imagePicker.pickVideo(
        source: isRecording ? ImageSource.camera : ImageSource.gallery,
        maxDuration: const Duration(seconds: 60),
      );
      if (file == null) return;
      final tempController = VideoPlayerController.file(File(file.path));
      await tempController.initialize();
      final duration = tempController.value.duration;
      if (duration > const Duration(seconds: 60)) {
        if (!mounted) return;
        AppSnackbar.show(context, 'Video is too long. Please keep place review videos under 60 seconds.', isError: true);
        await tempController.dispose();
        return;
      }
      await _controller!.setClipFiles([
        (path: file.path, duration: duration, width: tempController.value.size.width.round(), height: tempController.value.size.height.round()),
      ]);
      await tempController.dispose();
      if (!mounted) return;
      AppSnackbar.show(
        context,
        isRecording
            ? 'Recording attached to your review draft'
            : 'Video imported into the editor',
      );
    } on MissingPluginException {
      if (!mounted) return;
      AppSnackbar.show(
        context,
        videoSourceUnavailableMessage(isRecording: isRecording),
        isError: true,
      );
    } catch (error) {
      if (!mounted) return;
      AppSnackbar.show(context, 'Unable to open video source: $error', isError: true);
    }
  }

  Future<void> _pickPlace() async {
    final picked = await showModalBottomSheet<PlaceSearchResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => PlacePickerSheet(initialQuery: _state?.draft.metadata.place?.name ?? widget.initialPlace?.name ?? ''),
    );
    if (picked == null) return;
    _controller!.updateMetadata(_state!.draft.metadata.copyWith(place: picked, title: _state!.draft.metadata.title.isEmpty ? picked.name : _state!.draft.metadata.title));
  }

  Future<void> _showAddOverlay() async {
    final preset = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            'Must try',
            'Worth it',
            'Skip',
            'Hidden gem',
            'Best item',
            'Overrated',
            'Underrated',
          ]
              .map((label) => ListTile(title: Text(label), onTap: () => Navigator.of(context).pop(label)))
              .toList(growable: false),
        ),
      ),
    );
    if (preset == null) return;
    _controller!.addOverlay(
      ReviewOverlayItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: OverlayType.presetCallout,
        text: preset,
        alignmentX: 0,
        alignmentY: -0.5,
      ),
    );
  }

  Future<void> _publish(PlaceReviewEditorController controller) async {
    final payload = await controller.publish();
    if (!mounted) return;
    if (payload == null) {
      AppSnackbar.show(context, _state?.lastError ?? 'Publish failed', isError: true);
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Review published', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text('Place: ${payload.placeId}'),
              Text('Aspect ratio: ${payload.aspectRatio}'),
              Text('Duration: ${_formatMs(payload.durationMs)}'),
              const SizedBox(height: 12),
              const Text('Your review is ready for the place page, creator profile, and short-form feed.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
            ],
          ),
        ),
      ),
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  Future<void> _showRenderPreview(ReviewExportResult result) async {
    final previewController = VideoPlayerController.file(File(result.exportPath));
    await previewController.initialize();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Final render preview'),
        content: AspectRatio(aspectRatio: previewController.value.aspectRatio == 0 ? 9 / 16 : previewController.value.aspectRatio, child: VideoPlayer(previewController)),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
          FilledButton(
            onPressed: () async {
              await previewController.play();
              setState(() {});
            },
            child: const Text('Play'),
          ),
        ],
      ),
    );
    await previewController.dispose();
  }

  Future<void> _confirmDiscard() async {
    final decision = await showDialog<String>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Discard changes?'),
            content: const Text('You can save as draft to recover later, or discard this place review editor session.'),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop('keep'), child: const Text('Keep editing')),
              TextButton(
                onPressed: () async {
                  await _controller?.saveDraft();
                  if (mounted) Navigator.of(context).pop('save');
                },
                child: const Text('Save draft'),
              ),
              FilledButton.tonal(onPressed: () => Navigator.of(context).pop('discard'), child: const Text('Discard')),
            ],
          ),
        );
    if (!mounted) return;
    if (decision == 'discard' || decision == 'save') {
      Navigator.of(context).pop();
    }
  }

  IconData _iconForTab(_EditorToolTab tab) {
    switch (tab) {
      case _EditorToolTab.timeline:
        return Icons.timeline;
      case _EditorToolTab.transform:
        return Icons.crop_rotate_rounded;
      case _EditorToolTab.audio:
        return Icons.music_note_rounded;
      case _EditorToolTab.overlays:
        return Icons.text_fields_rounded;
      case _EditorToolTab.review:
        return Icons.rate_review_outlined;
      case _EditorToolTab.publish:
        return Icons.public_rounded;
    }
  }

  double _aspectRatioValue(ReviewAspectRatio ratio) {
    switch (ratio) {
      case ReviewAspectRatio.ratio9x16:
        return 9 / 16;
      case ReviewAspectRatio.ratio1x1:
        return 1;
      case ReviewAspectRatio.ratio4x5:
        return 4 / 5;
      case ReviewAspectRatio.ratio16x9:
        return 16 / 9;
    }
  }

  Widget _ratingInput(String label, int value, ValueChanged<int> onChanged) {
    return DropdownButtonFormField<int>(
      value: value == 0 ? null : value,
      decoration: InputDecoration(labelText: label),
      items: [1, 2, 3, 4, 5].map((item) => DropdownMenuItem<int>(value: item, child: Text('$item★'))).toList(growable: false),
      onChanged: (updated) => onChanged(updated ?? 0),
    );
  }

  String _formatMs(int ms) {
    final seconds = Duration(milliseconds: ms).inSeconds;
    final minutesPart = (seconds ~/ 60).toString().padLeft(2, '0');
    final secondsPart = (seconds % 60).toString().padLeft(2, '0');
    return '$minutesPart:$secondsPart';
  }
}

enum _VideoSourceAction { record, gallery }

class _EmptyPreview extends StatelessWidget {
  const _EmptyPreview({required this.onImport});

  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.ondemand_video_outlined, size: 58, color: Colors.white70),
            const SizedBox(height: 12),
            Text('Import footage to start your review', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white)),
            const SizedBox(height: 8),
            const Text('Record on-site or pull a clip from your camera roll, then trim and attach it to a place.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 12),
            FilledButton.icon(onPressed: onImport, icon: const Icon(Icons.add), label: const Text('Add video')),
          ],
        ),
      ),
    );
  }
}

class _PreviewCanvas extends StatelessWidget {
  const _PreviewCanvas({required this.state, required this.controller});

  final PlaceReviewEditorState state;
  final VideoPlayerController controller;

  @override
  Widget build(BuildContext context) {
    final transform = state.draft.transform;
    final playbackAspectRatio = controller.value.aspectRatio == 0 ? 9 / 16 : controller.value.aspectRatio;
    return ColorFiltered(
      colorFilter: ColorFilter.matrix(_buildColorMatrix(transform)),
      child: Transform.scale(
        scaleX: transform.mirrored ? -transform.zoom : transform.zoom,
        scaleY: transform.zoom,
        child: Transform.translate(
          offset: Offset(transform.offsetX * 100, transform.offsetY * 100),
          child: Transform.rotate(
            angle: transform.rotationTurns * math.pi / 2,
            child: FittedBox(
              fit: transform.fit == ClipFit.fill ? BoxFit.cover : BoxFit.contain,
              child: SizedBox(
                width: 320,
                height: 320 / playbackAspectRatio,
                child: VideoPlayer(controller),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<double> _buildColorMatrix(EditorTransformSettings transform) {
    final contrast = transform.autoEnhance ? transform.contrast + 0.08 : transform.contrast;
    final saturation = transform.autoEnhance ? transform.saturation + 0.12 : transform.saturation;
    final brightness = transform.autoEnhance ? transform.brightness + 0.04 : transform.brightness;
    final warmth = transform.autoEnhance ? transform.warmth + 0.05 : transform.warmth;
    return <double>[
      contrast + warmth, 0, 0, 0, brightness * 255,
      0, contrast, 0, 0, brightness * 255,
      0, 0, saturation, 0, brightness * 255,
      0, 0, 0, 1, 0,
    ];
  }
}

class _PlaceCard extends StatelessWidget {
  const _PlaceCard({required this.metadata});

  final PlaceReviewMetadata metadata;

  @override
  Widget build(BuildContext context) {
    final place = metadata.place!;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.62),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const CircleAvatar(backgroundColor: Colors.white12, child: Icon(Icons.location_on_rounded, color: Colors.white)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(place.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  Text('${place.category} • ${place.regionLabel}', style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(999)),
              child: Text('${metadata.rating.overall}/5 ★', style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverlayChip extends StatelessWidget {
  const _OverlayChip({required this.overlay});

  final ReviewOverlayItem overlay;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment(overlay.alignmentX, overlay.alignmentY),
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black54,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white24),
        ),
        child: Text(
          overlay.text,
          style: TextStyle(color: _parseColor(overlay.colorHex), fontSize: 16 * overlay.fontScale, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Color _parseColor(String value) {
    final hex = value.replaceFirst('#', '');
    return Color(int.parse('FF$hex', radix: 16));
  }
}

class _TransformEditor extends StatelessWidget {
  const _TransformEditor({required this.transform, required this.onChanged});

  final EditorTransformSettings transform;
  final ValueChanged<EditorTransformSettings> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ReviewAspectRatio.values
              .map(
                (ratio) => ChoiceChip(
                  label: Text({
                    ReviewAspectRatio.ratio9x16: '9:16',
                    ReviewAspectRatio.ratio1x1: '1:1',
                    ReviewAspectRatio.ratio4x5: '4:5',
                    ReviewAspectRatio.ratio16x9: '16:9',
                  }[ratio]!),
                  selected: transform.aspectRatio == ratio,
                  onSelected: (_) => onChanged(transform.copyWith(aspectRatio: ratio)),
                ),
              )
              .toList(growable: false),
        ),
        SwitchListTile.adaptive(value: transform.fit == ClipFit.fill, title: const Text('Fill frame'), contentPadding: EdgeInsets.zero, onChanged: (value) => onChanged(transform.copyWith(fit: value ? ClipFit.fill : ClipFit.fit))),
        Wrap(
          spacing: 8,
          children: [
            FilledButton.tonalIcon(onPressed: () => onChanged(transform.copyWith(rotationTurns: (transform.rotationTurns + 1) % 4)), icon: const Icon(Icons.rotate_right), label: const Text('Rotate')),
            FilledButton.tonalIcon(onPressed: () => onChanged(transform.copyWith(mirrored: !transform.mirrored)), icon: const Icon(Icons.flip), label: const Text('Mirror')),
            FilledButton.tonalIcon(onPressed: () => onChanged(transform.copyWith(autoEnhance: !transform.autoEnhance)), icon: const Icon(Icons.auto_fix_high), label: Text(transform.autoEnhance ? 'Auto on' : 'Auto enhance')),
          ],
        ),
        const SizedBox(height: 12),
        _LabeledSlider(label: 'Zoom', value: transform.zoom, min: 1, max: 3, onChanged: (value) => onChanged(transform.copyWith(zoom: value))),
        _LabeledSlider(label: 'Brightness', value: transform.brightness, min: -0.2, max: 0.3, onChanged: (value) => onChanged(transform.copyWith(brightness: value))),
        _LabeledSlider(label: 'Contrast', value: transform.contrast, min: 0.8, max: 1.5, onChanged: (value) => onChanged(transform.copyWith(contrast: value))),
        _LabeledSlider(label: 'Saturation', value: transform.saturation, min: 0.8, max: 1.5, onChanged: (value) => onChanged(transform.copyWith(saturation: value))),
        _LabeledSlider(label: 'Warmth', value: transform.warmth, min: -0.1, max: 0.2, onChanged: (value) => onChanged(transform.copyWith(warmth: value))),
        _LabeledSlider(label: 'Highlights', value: transform.highlights, min: -0.3, max: 0.3, onChanged: (value) => onChanged(transform.copyWith(highlights: value))),
        _LabeledSlider(label: 'Shadows', value: transform.shadows, min: -0.3, max: 0.3, onChanged: (value) => onChanged(transform.copyWith(shadows: value))),
      ],
    );
  }
}

class _AudioEditor extends StatelessWidget {
  const _AudioEditor({required this.audio, required this.onChanged});

  final EditorAudioSettings audio;
  final ValueChanged<EditorAudioSettings> onChanged;

  @override
  Widget build(BuildContext context) {
    final presets = const ['Original only', 'Lo-fi dinner', 'City night', 'Sunset walk'];
    return Column(
      children: [
        SwitchListTile.adaptive(value: audio.muteOriginal, title: const Text('Mute original audio'), contentPadding: EdgeInsets.zero, onChanged: (value) => onChanged(audio.copyWith(muteOriginal: value))),
        _LabeledSlider(label: 'Original volume', value: audio.originalVolume, min: 0, max: 1, onChanged: (value) => onChanged(audio.copyWith(originalVolume: value))),
        _LabeledSlider(label: 'Music volume', value: audio.musicVolume, min: 0, max: 1, onChanged: (value) => onChanged(audio.copyWith(musicVolume: value))),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: presets
              .map(
                (preset) => ChoiceChip(
                  label: Text(preset),
                  selected: audio.musicTrackName == preset,
                  onSelected: (_) => onChanged(audio.copyWith(musicTrackName: preset, musicTrackAsset: preset.toLowerCase().replaceAll(' ', '_'))),
                ),
              )
              .toList(growable: false),
        ),
        SwitchListTile.adaptive(value: audio.voiceoverEnabled, title: const Text('Voiceover support'), subtitle: const Text('Reserve headroom for spoken reviews.'), contentPadding: EdgeInsets.zero, onChanged: (value) => onChanged(audio.copyWith(voiceoverEnabled: value))),
        SwitchListTile.adaptive(value: audio.fadeIn, title: const Text('Fade in'), contentPadding: EdgeInsets.zero, onChanged: (value) => onChanged(audio.copyWith(fadeIn: value))),
        SwitchListTile.adaptive(value: audio.fadeOut, title: const Text('Fade out'), contentPadding: EdgeInsets.zero, onChanged: (value) => onChanged(audio.copyWith(fadeOut: value))),
      ],
    );
  }
}

class _OverlayEditor extends StatelessWidget {
  const _OverlayEditor({required this.overlays, required this.onAddPreset, required this.onDelete});

  final List<ReviewOverlayItem> overlays;
  final VoidCallback onAddPreset;
  final ValueChanged<String> onDelete;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: FilledButton.tonalIcon(onPressed: onAddPreset, icon: const Icon(Icons.add_comment_outlined), label: const Text('Add callout'))),
          ],
        ),
        const SizedBox(height: 12),
        if (overlays.isEmpty)
          const Text('Add text overlays, rating stickers, or place labels to make your review more informative.')
        else
          ...overlays.map(
            (overlay) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(child: Icon(Icons.text_fields)),
              title: Text(overlay.text),
              subtitle: Text('${overlay.type.name} • ${overlay.colorHex}'),
              trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => onDelete(overlay.id)),
            ),
          ),
      ],
    );
  }
}

class _QuickReviewEditor extends StatelessWidget {
  const _QuickReviewEditor({required this.metadata, required this.onToggleTag, required this.onToggleReaction});

  final PlaceReviewMetadata metadata;
  final ValueChanged<String> onToggleTag;
  final ValueChanged<String> onToggleReaction;

  @override
  Widget build(BuildContext context) {
    const tags = ['date night', 'cheap eats', 'upscale', 'coffee', 'nightlife', 'family-friendly', 'scenic', 'fast service', 'good for groups'];
    const reactions = ['Must try', 'Worth it', 'Skip', 'Hidden gem', 'Best item', 'Overrated', 'Underrated'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick tags', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: tags.map((tag) => FilterChip(label: Text(tag), selected: metadata.tags.contains(tag), onSelected: (_) => onToggleTag(tag))).toList(growable: false),
        ),
        const SizedBox(height: 16),
        Text('Quick reactions', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: reactions.map((reaction) => FilterChip(label: Text(reaction), selected: metadata.quickReactions.contains(reaction), onSelected: (_) => onToggleReaction(reaction))).toList(growable: false),
        ),
      ],
    );
  }
}

class _PublishSettingsEditor extends StatelessWidget {
  const _PublishSettingsEditor({required this.metadata, required this.onChanged});

  final PlaceReviewMetadata metadata;
  final ValueChanged<PlaceReviewMetadata> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        DropdownButtonFormField<ReviewPrivacy>(
          value: metadata.privacy,
          decoration: const InputDecoration(labelText: 'Privacy'),
          items: ReviewPrivacy.values
              .map((privacy) => DropdownMenuItem(value: privacy, child: Text(switch (privacy) { ReviewPrivacy.public => 'Public', ReviewPrivacy.followersOnly => 'Followers only', ReviewPrivacy.privateDraft => 'Private draft' })))
              .toList(growable: false),
          onChanged: (value) => onChanged(metadata.copyWith(privacy: value ?? ReviewPrivacy.public)),
        ),
        const SizedBox(height: 12),
        const ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(child: Icon(Icons.image_outlined)),
          title: Text('Cover thumbnail selection'),
          subtitle: Text('The exported preview generates a cover you can reuse before publishing.'),
        ),
        const ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(child: Icon(Icons.cloud_upload_outlined)),
          title: Text('Background-safe upload retry'),
          subtitle: Text('Draft metadata is stored locally so failed publishes can be retried after reconnecting.'),
        ),
      ],
    );
  }
}

class _LabeledSlider extends StatelessWidget {
  const _LabeledSlider({required this.label, required this.value, required this.min, required this.max, required this.onChanged});

  final String label;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label), Text(value.toStringAsFixed(2))]),
        Slider(value: value.clamp(min, max), min: min, max: max, onChanged: onChanged),
      ],
    );
  }
}
