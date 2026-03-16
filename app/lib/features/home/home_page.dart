import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../models/telemetry.dart';
import '../../providers/app_providers.dart';
import '../notifications/notification_center_tab.dart';
import '../notifications/notification_providers.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';
import 'map_discovery_tab.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _navIndex = 0;
  FeedScope _scope = FeedScope.local;
  bool _scopeInitialized = false;

  @override
  Widget build(BuildContext context) {
    final unreadCount = ref.watch(unreadNotificationCountProvider).valueOrNull ?? 0;
    final bootstrap = ref.watch(feedBootstrapProvider).valueOrNull;
    if (!_scopeInitialized && bootstrap != null) {
      _scope = bootstrap.defaultScope;
      _scopeInitialized = true;
    }

    final pages = [
      _FeedTab(scope: _scope, onScopeChanged: (scope) => setState(() => _scope = scope)),
      const MapDiscoveryTab(),
      _SearchTab(scope: _scope),
      const _CreateTab(),
      const _SavedTab(),
      const NotificationCenterTab(),
      const _ProfileStudioTab(),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Perbug')),
      body: AnimatedSwitcher(duration: const Duration(milliseconds: 280), child: IndexedStack(key: ValueKey(_navIndex), index: _navIndex, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'Feed'),
          const NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          const NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Search'),
          const NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Create'),
          const NavigationDestination(icon: Icon(Icons.bookmark_border), selectedIcon: Icon(Icons.bookmark), label: 'Saved'),
          NavigationDestination(
            icon: Badge(isLabelVisible: unreadCount > 0, label: Text(unreadCount > 99 ? '99+' : '$unreadCount'), child: const Icon(Icons.notifications_none)),
            selectedIcon: const Icon(Icons.notifications),
            label: 'Alerts',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Studio'),
        ],
      ),
    );
  }
}

class _FeedTab extends ConsumerWidget {
  const _FeedTab({required this.scope, required this.onScopeChanged});

  final FeedScope scope;
  final ValueChanged<FeedScope> onScopeChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(feedBootstrapProvider);
    final feed = ref.watch(videoFeedProvider(scope));

    return Column(
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: SegmentedButton<FeedScope>(
            segments: const [
              ButtonSegment(value: FeedScope.local, icon: Icon(Icons.place_outlined), label: Text('Local')),
              ButtonSegment(value: FeedScope.regional, icon: Icon(Icons.public), label: Text('Regional')),
              ButtonSegment(value: FeedScope.global, icon: Icon(Icons.flight_takeoff), label: Text('Global')),
            ],
            selected: {scope},
            onSelectionChanged: (value) => onScopeChanged(value.first),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: bootstrap.when(
            data: (boot) {
              final seeded = boot.itemsByScope[scope] ?? const [];
              final items = seeded.isNotEmpty ? seeded : feed.valueOrNull ?? const [];
              if (items.isEmpty) {
                return _FeedEmptyState(
                  title: boot.emptyTitle ?? 'No nearby videos yet',
                  body: boot.emptyBody ?? 'Try switching to Regional or Global and broaden your interests.',
                  suggestions: boot.suggestions,
                );
              }
              return ListView.builder(
                cacheExtent: 1000,
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
                itemCount: items.length,
                itemBuilder: (_, index) => _FeedVideoCard(item: items[index]),
              );
            },
            error: (_, __) => feed.when(
              data: (items) => items.isEmpty
                  ? const _FeedEmptyState(title: 'No content yet', body: 'Try another scope or update preferences in settings.')
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (_, index) => _FeedVideoCard(item: items[index]),
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Feed unavailable: $e')),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
          ),
        ),
      ],
    );
  }
}

class _FeedVideoCard extends StatelessWidget {
  const _FeedVideoCard({required this.item});

  final PlaceVideoFeedItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => PlaceVideoDetailPage(placeId: item.placeId, placeName: item.placeName),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 190,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Theme.of(context).colorScheme.primaryContainer.withOpacity(0.45),
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                  ],
                ),
              ),
              child: Stack(
                children: [
                  const Positioned.fill(child: Icon(Icons.play_circle_fill_rounded, size: 72)),
                  Positioned(
                    left: 12,
                    top: 12,
                    child: Chip(
                      label: Text(item.placeCategory),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  Positioned(
                    right: 12,
                    top: 12,
                    child: Chip(
                      avatar: const Icon(Icons.star_rounded, size: 16),
                      label: Text('${item.rating}/5'),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.caption.isEmpty ? item.placeName : item.caption, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 6),
                  Text('${item.placeName} • ${item.regionLabel}', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      CircleAvatar(radius: 12, child: Text((item.creatorHandle.isNotEmpty ? item.creatorHandle[0] : '?').toUpperCase())),
                      const SizedBox(width: 8),
                      Expanded(child: Text(item.creatorHandle, style: Theme.of(context).textTheme.labelLarge)),
                      IconButton(onPressed: () {}, icon: const Icon(Icons.bookmark_border)),
                      IconButton(onPressed: () {}, icon: const Icon(Icons.ios_share_rounded)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchTab extends ConsumerStatefulWidget {
  const _SearchTab({required this.scope});

  final FeedScope scope;

  @override
  ConsumerState<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends ConsumerState<_SearchTab> with AutomaticKeepAliveClientMixin {
  final _searchController = TextEditingController();

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final query = _searchController.text.trim();
    final results = ref.watch(placeSearchProvider((query: query, scope: widget.scope)));

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search places and neighborhoods'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: results.when(
              data: (items) {
                if (query.isEmpty) return const Center(child: Text('Search for a place to discover creator reviews.'));
                if (items.isEmpty) return const Center(child: Text('No results yet. Try another query.'));
                return ListView.builder(
                  itemCount: items.length,
                  itemBuilder: (_, index) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(items[index].name),
                      subtitle: Text('${items[index].category} • ${items[index].regionLabel}'),
                    ),
                  ),
                );
              },
              error: (_, __) => const Center(child: Text('Place suggestions unavailable right now.')),
              loading: () => query.isEmpty ? const SizedBox.shrink() : const Center(child: CircularProgressIndicator()),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedEmptyState extends StatelessWidget {
  const _FeedEmptyState({required this.title, required this.body, this.suggestions = const []});

  final String title;
  final String body;
  final List<String> suggestions;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.ondemand_video_outlined, size: 52),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center),
            if (suggestions.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 8, children: suggestions.map((e) => Chip(label: Text(e))).toList(growable: false)),
            ],
          ],
        ),
      ),
    );
  }
}

class _CreateTab extends ConsumerStatefulWidget {
  const _CreateTab();

  @override
  ConsumerState<_CreateTab> createState() => _CreateTabState();
}

class _CreateTabState extends ConsumerState<_CreateTab> with AutomaticKeepAliveClientMixin {
  bool _openedTracked = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_openedTracked) {
      _openedTracked = true;
      _trackCreateEvent('create_tab_opened');
    }
  }

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final videos = ref.watch(studioVideosProvider(null));
    final analytics = ref.watch(studioAnalyticsProvider);
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
        children: [
          Text('Creator Hub', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 6),
          const Text('Start, upload, recover, and publish place review videos.'),
          const SizedBox(height: 14),
          _buildPrimaryActions(),
          const SizedBox(height: 14),
          videos.when(
            data: (items) => _buildGroupedSections(items),
            loading: () => const Card(child: Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator())),
            error: (_, __) => Card(child: ListTile(title: const Text('Creator data unavailable'), subtitle: const Text('Pull to refresh.'), trailing: FilledButton.tonal(onPressed: _refresh, child: const Text('Retry')))),
          ),
          const SizedBox(height: 14),
          _buildShortcuts(analytics),
        ],
      ),
    );
  }

  Widget _buildPrimaryActions() {
    return Row(
      children: [
        Expanded(child: _ActionCard(icon: Icons.videocam_rounded, title: 'Record Video', subtitle: 'Create draft + attach recording', onTap: () => _startFlow(CreateFlowSource.record))),
        const SizedBox(width: 10),
        Expanded(child: _ActionCard(icon: Icons.upload_rounded, title: 'Upload Video', subtitle: 'Create draft + attach upload', onTap: () => _startFlow(CreateFlowSource.upload))),
        const SizedBox(width: 10),
        Expanded(child: _ActionCard(icon: Icons.note_add_rounded, title: 'New Draft', subtitle: 'Metadata-first draft', onTap: () => _startFlow(CreateFlowSource.draft))),
      ],
    );
  }

  Widget _buildGroupedSections(List<StudioVideo> items) {
    final drafts = items.where((v) => v.section == StudioSection.drafts).toList(growable: false);
    final processing = items.where((v) => v.section == StudioSection.processing).toList(growable: false);
    final needsAttention = items.where((v) => v.section == StudioSection.needsAttention).toList(growable: false);
    final ready = items.where((v) => v.publishReady && v.section != StudioSection.published).toList(growable: false);

    if (items.isEmpty) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.auto_awesome),
          title: const Text('Create your first place review'),
          subtitle: const Text('Start a draft, tag a canonical place, then record or upload a video.'),
          trailing: FilledButton(onPressed: () => _startFlow(CreateFlowSource.draft), child: const Text('Start')),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _section('Resume Drafts', drafts, empty: 'No drafts right now.'),
        const SizedBox(height: 10),
        _section('Processing', processing, empty: 'No uploads processing.'),
        const SizedBox(height: 10),
        _section('Needs Attention', needsAttention, empty: 'No failed uploads or blocked videos.'),
        const SizedBox(height: 10),
        _section('Ready to Publish', ready, empty: 'Nothing publishable yet.'),
      ],
    );
  }

  Widget _section(String title, List<StudioVideo> videos, {required String empty}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (videos.isEmpty)
          Card(child: ListTile(title: Text(empty)))
        else
          ...videos.take(5).map(_videoCard),
      ],
    );
  }

  Widget _videoCard(StudioVideo video) {
    return Card(
      child: ListTile(
        title: Text(video.title),
        subtitle: Text('${video.placeName} • ${video.statusLabel ?? video.status.name}'),
        onTap: () async => _openEditor(source: CreateFlowSource.draft, video: video),
        trailing: Wrap(
          spacing: 6,
          children: [
            if (video.isRetryable)
              FilledButton.tonal(
                onPressed: () => _retry(video),
                child: const Text('Retry'),
              ),
            if (video.publishReady && video.section != StudioSection.published)
              FilledButton(
                onPressed: () => _publish(video),
                child: const Text('Publish'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildShortcuts(AsyncValue<StudioAnalyticsOverview> analytics) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Creator Shortcuts', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(label: const Text('Drafts'), avatar: const Icon(Icons.description_rounded, size: 18), onPressed: () => _openStudio(StudioSection.drafts)),
                ActionChip(label: const Text('Processing'), avatar: const Icon(Icons.sync_rounded, size: 18), onPressed: () => _openStudio(StudioSection.processing)),
                ActionChip(label: const Text('Needs Attention'), avatar: const Icon(Icons.error_outline_rounded, size: 18), onPressed: () => _openStudio(StudioSection.needsAttention)),
                ActionChip(label: const Text('Published'), avatar: const Icon(Icons.public_rounded, size: 18), onPressed: () => _openStudio(StudioSection.published)),
                ActionChip(label: const Text('Analytics'), avatar: const Icon(Icons.query_stats_rounded, size: 18), onPressed: () => _openAnalytics(analytics.valueOrNull)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _retry(StudioVideo video) async {
    final repo = await ref.read(videoRepositoryProvider.future);
    await _trackCreateEvent('create_retry_tapped', {'videoId': video.videoId});
    if (video.uploadProgressState == UploadProgressState.failed || video.status == StudioVideoStatus.failed) {
      await repo.retryUpload(videoId: video.videoId);
    } else {
      await repo.retryProcessing(videoId: video.videoId);
    }
    await _refresh();
  }

  Future<void> _publish(StudioVideo video) async {
    final repo = await ref.read(videoRepositoryProvider.future);
    await _trackCreateEvent('create_publish_tapped', {'videoId': video.videoId});
    await repo.publish(videoId: video.videoId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Published successfully.')));
    await _refresh();
  }

  Future<void> _refresh() async {
    ref.invalidate(studioVideosProvider(null));
    ref.invalidate(studioAnalyticsProvider);
    await Future.wait([ref.read(studioVideosProvider(null).future), ref.read(studioAnalyticsProvider.future)]);
  }

  Future<void> _startFlow(CreateFlowSource source, {StudioVideo? existing}) async {
    await _trackCreateEvent('create_${source.name}_tapped');
    if (source == CreateFlowSource.record) {
      final status = await Permission.camera.request();
      if (!mounted || !status.isGranted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera permission is required for recording flow.')));
        return;
      }
    }
    if (source == CreateFlowSource.upload || source == CreateFlowSource.record) {
      final status = await Permission.photos.request();
      if (!mounted || !status.isGranted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photos permission is required to attach video.')));
        return;
      }
    }
    await _openEditor(source: source, video: existing);
  }

  Future<void> _openEditor({CreateFlowSource source = CreateFlowSource.draft, StudioVideo? video}) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _DraftEditorSheet(source: source, video: video),
    );
    if (!mounted) return;
    await _refresh();
  }

  void _openStudio(StudioSection section) {
    _trackCreateEvent('create_studio_shortcut_opened', {'section': section.name});
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _StudioSectionPage(section: section)));
  }

  void _openAnalytics(StudioAnalyticsOverview? analytics) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(16),
        child: analytics == null
            ? const Text('Analytics unavailable right now.')
            : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Creator analytics', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text('Published videos: ${analytics.totalVideosPublished}'),
                Text('Total views: ${analytics.totalViews}'),
                const SizedBox(height: 8),
                Text('Needs attention: ${analytics.statusCounts['needsAttention'] ?? 0}'),
              ]),
      ),
    );
  }

  Future<void> _trackCreateEvent(String event, [Map<String, Object?> payload = const {}]) async {
    final telemetryRepository = ref.read(telemetryRepositoryProvider).valueOrNull;
    final dispatcher = ref.read(telemetryDispatcherProvider);
    if (telemetryRepository == null || dispatcher == null) return;
    try {
      await telemetryRepository.enqueueEvent('create', TelemetryEventInput.fromJson({'event': event, 'source': 'create_tab', ...payload}));
      await dispatcher.notifyEventQueued('create');
    } catch (_) {}
  }
}

enum CreateFlowSource { record, upload, draft }

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon), const SizedBox(height: 8), Text(title, style: Theme.of(context).textTheme.titleSmall), const SizedBox(height: 4), Text(subtitle, style: Theme.of(context).textTheme.bodySmall)]),
        ),
      ),
    );
  }
}

class _DraftEditorSheet extends ConsumerStatefulWidget {
  const _DraftEditorSheet({required this.source, this.video});

  final CreateFlowSource source;
  final StudioVideo? video;

  @override
  ConsumerState<_DraftEditorSheet> createState() => _DraftEditorSheetState();
}

class _DraftEditorSheetState extends ConsumerState<_DraftEditorSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _captionController;
  final _placeSearchController = TextEditingController();
  PlaceSearchResult? _selectedPlace;
  int _rating = 4;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.video?.title ?? '');
    _captionController = TextEditingController(text: widget.video?.caption ?? '');
    _placeSearchController.text = widget.video?.placeName ?? '';
    if ((widget.video?.placeId ?? '').isNotEmpty && (widget.video?.placeName ?? '').isNotEmpty) {
      _selectedPlace = PlaceSearchResult(placeId: widget.video!.placeId, name: widget.video!.placeName, category: 'Place', regionLabel: '');
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _captionController.dispose();
    _placeSearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _placeSearchController.text.trim();
    final placeResults = ref.watch(placeSearchProvider((query: query, scope: FeedScope.local)));
    final canSave = _selectedPlace != null && _titleController.text.trim().isNotEmpty && !_saving;
    final canPublish = canSave && widget.source != CreateFlowSource.record && widget.source != CreateFlowSource.upload;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(left: 16, right: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16, top: 10),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.video == null ? 'New review draft' : 'Edit review draft', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), onChanged: (_) => setState(() {})),
              const SizedBox(height: 8),
              TextField(controller: _captionController, decoration: const InputDecoration(labelText: 'Caption'), minLines: 2, maxLines: 4),
              const SizedBox(height: 8),
              TextField(key: const Key('place-search-field'), controller: _placeSearchController, decoration: const InputDecoration(labelText: 'Tag canonical place', hintText: 'Search places'), onChanged: (_) => setState(() {})),
              const SizedBox(height: 8),
              placeResults.when(
                data: (items) => items.isEmpty
                    ? const SizedBox.shrink()
                    : SizedBox(
                        height: 140,
                        child: ListView.builder(
                          itemCount: items.length,
                          itemBuilder: (_, index) {
                            final place = items[index];
                            return ListTile(
                              dense: true,
                              title: Text(place.name),
                              subtitle: Text(place.regionLabel),
                              trailing: _selectedPlace?.placeId == place.placeId ? const Icon(Icons.check_circle, size: 18) : null,
                              onTap: () {
                                setState(() {
                                  _selectedPlace = place;
                                  _placeSearchController.text = place.name;
                                });
                                _trackCreateEvent('place_tagging_completed', {'placeId': place.placeId});
                              },
                            );
                          },
                        ),
                      ),
                loading: () => const SizedBox(height: 40, child: Center(child: CircularProgressIndicator())),
                error: (_, __) => const Text('Place search unavailable.'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(value: _rating, items: [1, 2, 3, 4, 5].map((v) => DropdownMenuItem(value: v, child: Text('$v stars'))).toList(growable: false), onChanged: (value) => setState(() => _rating = value ?? 4), decoration: const InputDecoration(labelText: 'Rating / verdict')),
              const SizedBox(height: 12),
              if (widget.video != null && !widget.video!.publishReady && widget.video!.publishMissing.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text('Not publishable yet: ${widget.video!.publishMissing.join(', ')}'),
                ),
              Row(
                children: [
                  Expanded(child: FilledButton.tonal(onPressed: canSave ? _saveDraft : null, child: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save draft'))),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton(onPressed: canPublish ? _publishNow : null, child: const Text('Publish now'))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<String?> _saveDraft({bool closeOnSuccess = true}) async {
    await _trackCreateEvent('new_draft_created', {'mode': widget.video == null ? 'create' : 'update'});
    setState(() => _saving = true);
    final repo = await ref.read(videoRepositoryProvider.future);
    final place = _selectedPlace;
    if (place == null) {
      setState(() => _saving = false);
      return null;
    }
    try {
      StudioVideo? created;
      if (widget.video == null) {
        created = await repo.createDraft(placeId: place.placeId, title: _titleController.text.trim(), caption: _captionController.text.trim(), rating: _rating);
        if (created != null && widget.source != CreateFlowSource.draft) {
          await repo.attachMediaFromFlow(videoId: created.videoId, source: widget.source.name);
        }
      } else {
        await repo.updateDraft(videoId: widget.video!.videoId, placeId: place.placeId, title: _titleController.text.trim(), caption: _captionController.text.trim(), rating: _rating);
        if (widget.source != CreateFlowSource.draft) {
          await repo.attachMediaFromFlow(videoId: widget.video!.videoId, source: widget.source.name);
        }
      }
      if (!mounted) return null;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Draft saved.')));
      if (closeOnSuccess) Navigator.of(context).pop();
      return created?.videoId ?? widget.video?.videoId;
    } catch (err) {
      if (!mounted) return null;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Draft save failed: $err')));
      return null;
    }
  }

  Future<void> _publishNow() async {
    await _trackCreateEvent('publish_tapped');
    final videoId = await _saveDraft(closeOnSuccess: false);
    if (!mounted || videoId == null) return;
    final repo = await ref.read(videoRepositoryProvider.future);
    try {
      await repo.publish(videoId: videoId);
      if (!mounted) return;
      await _trackCreateEvent('publish_succeeded', {'videoId': videoId});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Published successfully.')));
      Navigator.of(context).pop();
    } catch (err) {
      if (!mounted) return;
      await _trackCreateEvent('publish_failed', {'videoId': videoId});
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Publish failed: $err')));
    }
  }


  Future<void> _trackCreateEvent(String event, [Map<String, Object?> payload = const {}]) async {
    final telemetryRepository = ref.read(telemetryRepositoryProvider).valueOrNull;
    final dispatcher = ref.read(telemetryDispatcherProvider);
    if (telemetryRepository == null || dispatcher == null) return;
    try {
      await telemetryRepository.enqueueEvent('create', TelemetryEventInput.fromJson({'event': event, 'source': 'create_editor', ...payload}));
      await dispatcher.notifyEventQueued('create');
    } catch (_) {}
  }
}


class _StudioSectionPage extends ConsumerWidget {
  const _StudioSectionPage({required this.section});

  final StudioSection section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final videos = ref.watch(studioVideosProvider(section));
    return Scaffold(
      appBar: AppBar(title: Text('${section.name} videos')),
      body: videos.when(
        data: (items) => items.isEmpty
            ? const Center(child: Text('No items in this section yet.'))
            : ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, index) {
                  final video = items[index];
                  return Card(
                    child: ListTile(
                      title: Text(video.title),
                      subtitle: Text('${video.placeName} • ${video.statusLabel ?? video.status.name}'),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          final repo = await ref.read(videoRepositoryProvider.future);
                          if (value == 'publish') await repo.publish(videoId: video.videoId);
                          if (value == 'retry_upload') await repo.retryUpload(videoId: video.videoId);
                          if (value == 'retry_processing') await repo.retryProcessing(videoId: video.videoId);
                          if (value == 'archive') await repo.archiveVideo(videoId: video.videoId);
                          ref.invalidate(studioVideosProvider(section));
                        },
                        itemBuilder: (_) => [
                          if (video.publishReady && section != StudioSection.published) const PopupMenuItem(value: 'publish', child: Text('Publish')),
                          if (video.uploadProgressState == UploadProgressState.failed) const PopupMenuItem(value: 'retry_upload', child: Text('Retry upload')),
                          if (video.processingProgressState == ProcessingProgressState.failed) const PopupMenuItem(value: 'retry_processing', child: Text('Retry processing')),
                          const PopupMenuItem(value: 'archive', child: Text('Archive')),
                        ],
                      ),
                    ),
                  );
                },
              ),
        error: (_, __) => const Center(child: Text('Unable to load studio section.')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _SavedTab extends StatelessWidget {
  const _SavedTab();

  @override
  Widget build(BuildContext context) => const Center(child: Text('Saved places/videos'));
}

class _ProfileStudioTab extends ConsumerStatefulWidget {
  const _ProfileStudioTab();

  @override
  ConsumerState<_ProfileStudioTab> createState() => _ProfileStudioTabState();
}

class _ProfileStudioTabState extends ConsumerState<_ProfileStudioTab> with AutomaticKeepAliveClientMixin {
  StudioSection _section = StudioSection.drafts;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final analytics = ref.watch(studioAnalyticsProvider);
    final videos = ref.watch(studioVideosProvider(_section));
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Text('Creator Studio', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        analytics.when(
          data: (a) => Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _metricCard('Published', a.totalVideosPublished.toString()),
              _metricCard('Views', a.totalViews.toString()),
              _metricCard('Drafts', (a.statusCounts['drafts'] ?? 0).toString()),
              _metricCard('Needs attention', (a.statusCounts['needsAttention'] ?? 0).toString()),
            ],
          ),
          error: (_, __) => const Text('Analytics unavailable right now.'),
          loading: () => const LinearProgressIndicator(),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 6,
          children: [
            _sectionChip('Drafts', StudioSection.drafts),
            _sectionChip('Processing', StudioSection.processing),
            _sectionChip('Published', StudioSection.published),
            _sectionChip('Needs Attention', StudioSection.needsAttention),
            _sectionChip('Archived', StudioSection.archived),
          ],
        ),
        const SizedBox(height: 12),
        videos.when(
          data: (items) {
            if (items.isEmpty) {
              return const Card(child: ListTile(title: Text('No items yet'), subtitle: Text('Start a place review draft to populate your studio.')));
            }
            return Column(
              children: items
                  .map(
                    (video) => Card(
                      child: ListTile(
                        leading: const CircleAvatar(child: Icon(Icons.play_arrow_rounded)),
                        title: Text(video.title),
                        subtitle: Text('${video.placeName} • ${video.statusLabel ?? video.status.name}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _StudioSectionPage(section: _section))),
                      ),
                    ),
                  )
                  .toList(growable: false),
            );
          },
          error: (_, __) => const Center(child: Text('Studio unavailable')),
          loading: () => const Center(child: CircularProgressIndicator()),
        )
      ],
    );
  }

  Widget _sectionChip(String label, StudioSection section) {
    return ChoiceChip(
      label: Text(label),
      selected: _section == section,
      onSelected: (_) => setState(() => _section = section),
    );
  }

  Widget _metricCard(String label, String value) {
    return SizedBox(
      width: 152,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label), Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700))]),
        ),
      ),
    );
  }
}

class PlaceVideoDetailPage extends ConsumerWidget {
  const PlaceVideoDetailPage({required this.placeId, required this.placeName, super.key});

  final String placeId;
  final String placeName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(videoFeedProvider(FeedScope.local));
    return Scaffold(
      appBar: AppBar(title: Text(placeName)),
      body: feed.when(
        data: (items) {
          final placeVideos = items.where((item) => item.placeId == placeId).toList(growable: false);
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Text(placeName, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 6),
              const Text('Place review video coverage'),
              const SizedBox(height: 12),
              ...placeVideos.map(
                (video) => Card(
                  child: ListTile(
                    title: Text(video.caption),
                    subtitle: Text(video.creatorHandle),
                  ),
                ),
              ),
            ],
          );
        },
        error: (_, __) => const Center(child: Text('No place videos available')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
