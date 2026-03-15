import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../notifications/notification_center_tab.dart';
import 'map_discovery_tab.dart';
import '../notifications/notification_providers.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';

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
      appBar: AppBar(
        title: const Text('Perbug Videos'),
      ),
      body: AnimatedSwitcher(duration: const Duration(milliseconds: 240), child: pages[_navIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: [
          NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'Feed'),
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Create'),
          NavigationDestination(icon: Icon(Icons.bookmark_border), selectedIcon: Icon(Icons.bookmark), label: 'Saved'),
          NavigationDestination(icon: Badge(isLabelVisible: unreadCount > 0, label: Text(unreadCount > 99 ? '99+' : '$unreadCount'), child: const Icon(Icons.notifications_none)), selectedIcon: const Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Studio'),
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
        SegmentedButton<FeedScope>(
          segments: const [
            ButtonSegment(value: FeedScope.local, label: Text('Local')),
            ButtonSegment(value: FeedScope.regional, label: Text('Regional')),
            ButtonSegment(value: FeedScope.global, label: Text('Global')),
          ],
          selected: {scope},
          onSelectionChanged: (value) => onScopeChanged(value.first),
        ),
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
                itemCount: items.length,
                itemBuilder: (_, index) {
                  final item = items[index];
                  return Card(
                    margin: const EdgeInsets.all(12),
                    child: ListTile(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => PlaceVideoDetailPage(placeId: item.placeId, placeName: item.placeName),
                        ),
                      ),
                      title: Text(item.caption.isEmpty ? item.placeName : item.caption),
                      subtitle: Text('${item.placeName} • ${item.placeCategory} • ${item.regionLabel}
${item.creatorHandle}'),
                      trailing: Chip(label: Text('${item.rating}/5')),
                    ),
                  );
                },
              );
            },
            error: (_, __) => feed.when(
              data: (items) => items.isEmpty
                  ? const _FeedEmptyState(title: 'No content yet', body: 'Try another scope or update preferences in settings.')
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (_, index) => Card(
                        margin: const EdgeInsets.all(12),
                        child: ListTile(title: Text(items[index].caption.isEmpty ? items[index].placeName : items[index].caption)),
                      ),
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

class _SearchTab extends ConsumerStatefulWidget {
  const _SearchTab({required this.scope});

  final FeedScope scope;

  @override
  ConsumerState<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends ConsumerState<_SearchTab> {
  final _controller = TextEditingController();
  String _debouncedQuery = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(placeSearchProvider((query: _debouncedQuery, scope: widget.scope)));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Search places',
              hintText: 'Type a place name, category, or neighborhood',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (value) {
              _debounce?.cancel();
              _debounce = Timer(const Duration(milliseconds: 220), () {
                if (!mounted) return;
                setState(() => _debouncedQuery = value.trim());
              });
            },
          ),
        ),
        Expanded(
          child: results.when(
            data: (items) {
              if (_debouncedQuery.isEmpty) return const Center(child: Text('Start typing to search canonical places.'));
              if (items.isEmpty) return const Center(child: Text('No places found. Try another area or query.'));
              return ListView(
                children: items
                    .map((item) => ListTile(
                          leading: const Icon(Icons.place_outlined),
                          title: Text(item.name),
                          subtitle: Text('${item.category} • ${item.regionLabel}${item.addressSnippet == null ? '' : '\n${item.addressSnippet}'}'),
                          trailing: item.distanceKm == null ? null : Text('${item.distanceKm!.toStringAsFixed(1)} km'),
                        ))
                    .toList(growable: false),
              );
            },
            error: (_, __) => const Center(child: Text('Search unavailable')),
            loading: () => _debouncedQuery.isEmpty ? const SizedBox.shrink() : const Center(child: CircularProgressIndicator()),
          ),
        ),
      ],
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
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center),
            if (suggestions.isNotEmpty) ...[
              const SizedBox(height: 12),
              ...suggestions.map((s) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text('• $s', textAlign: TextAlign.center),
                  )),
            ]
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

class _CreateTabState extends ConsumerState<_CreateTab> {
  String _source = 'record';
  final _titleController = TextEditingController();
  final _captionController = TextEditingController();
  final _placeSearchController = TextEditingController();
  Timer? _searchDebounce;
  String _searchQuery = '';
  PlaceSearchResult? _selectedPlace;
  final List<PlaceSearchResult> _recentPlaces = [];
  int _rating = 4;

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _titleController.dispose();
    _captionController.dispose();
    _placeSearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = ref.watch(placeSearchProvider((query: _searchQuery, scope: FeedScope.local)));
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Creator Studio Flow', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text('Record or upload, add metadata, attach canonical place, then save as draft.'),
        const SizedBox(height: 16),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'record', label: Text('Record in-app')),
            ButtonSegment(value: 'upload', label: Text('Upload from device')),
          ],
          selected: {_source},
          onSelectionChanged: (value) => setState(() => _source = value.first),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: _source == 'record' ? _requestCamera : _requestStorage,
          child: Text(_source == 'record' ? 'Open Recorder' : 'Open Media Picker'),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('place-search-field'),
          controller: _placeSearchController,
          decoration: InputDecoration(
            labelText: 'Tag reviewed place',
            hintText: 'Search for the canonical place',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _selectedPlace == null
                ? null
                : IconButton(
                    onPressed: () => setState(() => _selectedPlace = null),
                    icon: const Icon(Icons.edit_location_alt_outlined),
                    tooltip: 'Change place',
                  ),
          ),
          onChanged: (value) {
            _searchDebounce?.cancel();
            _searchDebounce = Timer(const Duration(milliseconds: 220), () {
              if (!mounted) return;
              setState(() => _searchQuery = value.trim());
            });
          },
        ),
        const SizedBox(height: 8),
        if (_selectedPlace != null)
          Card(
            child: ListTile(
              leading: const Icon(Icons.verified),
              title: Text(_selectedPlace!.name),
              subtitle: Text('${_selectedPlace!.category} • ${_selectedPlace!.regionLabel}\nCanonical: ${_selectedPlace!.placeId}'),
            ),
          )
        else ...[
          if (_recentPlaces.isNotEmpty)
            Wrap(
              spacing: 8,
              children: _recentPlaces
                  .map((item) => ActionChip(
                        label: Text(item.name),
                        onPressed: () => setState(() => _selectedPlace = item),
                      ))
                  .toList(growable: false),
            ),
          suggestions.when(
            data: (items) {
              if (_searchQuery.isEmpty) return const SizedBox.shrink();
              if (items.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('No matching place found. Try a nearby area or different keywords.'),
                );
              }
              return Column(
                children: items
                    .map((item) => ListTile(
                          title: Text(item.name),
                          subtitle: Text('${item.category} • ${item.regionLabel}'),
                          trailing: item.distanceKm == null ? null : Text('${item.distanceKm!.toStringAsFixed(1)} km'),
                          onTap: () => setState(() {
                            _selectedPlace = item;
                            _placeSearchController.text = item.name;
                            if (_recentPlaces.every((entry) => entry.placeId != item.placeId)) {
                              _recentPlaces.insert(0, item);
                              if (_recentPlaces.length > 4) {
                                _recentPlaces.removeLast();
                              }
                            }
                          }),
                        ))
                    .toList(growable: false),
              );
            },
            error: (_, __) => const Text('Place suggestions unavailable right now.'),
            loading: () => _searchQuery.isEmpty ? const SizedBox.shrink() : const Padding(
              padding: EdgeInsets.all(8),
              child: LinearProgressIndicator(),
            ),
          ),
        ],
        TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title')),
        TextField(controller: _captionController, decoration: const InputDecoration(labelText: 'Caption')),
        DropdownButtonFormField<int>(
          value: _rating,
          items: [1, 2, 3, 4, 5].map((v) => DropdownMenuItem(value: v, child: Text('$v stars'))).toList(),
          onChanged: (value) => setState(() => _rating = value ?? 4),
          decoration: const InputDecoration(labelText: 'Quick verdict'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _selectedPlace == null
              ? null
              : () async {
                  final repo = await ref.read(videoRepositoryProvider.future);
                  await repo.submitDraft(
                    source: _source,
                    placeId: _selectedPlace!.placeId,
                    title: _titleController.text,
                    caption: _captionController.text,
                    rating: _rating,
                  );
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Draft saved for ${_selectedPlace!.name}')));
                },
          child: const Text('Save Draft'),
        ),
      ],
    );
  }

  Future<void> _requestCamera() async {
    await Permission.camera.request();
  }

  Future<void> _requestStorage() async {
    await Permission.photos.request();
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

class _ProfileStudioTabState extends ConsumerState<_ProfileStudioTab> {
  StudioSection _section = StudioSection.drafts;

  @override
  Widget build(BuildContext context) {
    final analytics = ref.watch(studioAnalyticsProvider);
    final videos = ref.watch(studioVideosProvider(_section));
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        const Text('Creator Studio', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
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
              children: items.map((video) => Card(
                child: ListTile(
                  title: Text(video.title),
                  subtitle: Text('${video.placeName} • ${video.status.name}'),
                ),
              )).toList(growable: false),
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
      width: 150,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label), Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))]),
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
            children: [
              ListTile(title: Text(placeName), subtitle: const Text('Place review video coverage')),
              ...placeVideos.map((video) => ListTile(title: Text(video.caption), subtitle: Text(video.creatorHandle))),
            ],
          );
        },
        error: (_, __) => const Center(child: Text('No place videos available')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
