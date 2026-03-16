import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

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

class _CreateTabState extends ConsumerState<_CreateTab> {
  final _titleController = TextEditingController();
  final _captionController = TextEditingController();
  PlaceSearchResult? _selectedPlace;
  int _rating = 4;
  FeedScope _source = FeedScope.local;

  @override
  void dispose() {
    _titleController.dispose();
    _captionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Text('Create a review', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        SegmentedButton<FeedScope>(
          segments: const [
            ButtonSegment(value: FeedScope.local, label: Text('Local')),
            ButtonSegment(value: FeedScope.regional, label: Text('Regional')),
            ButtonSegment(value: FeedScope.global, label: Text('Global')),
          ],
          selected: {_source},
          onSelectionChanged: (value) => setState(() => _source = value.first),
        ),
        const SizedBox(height: 12),
        FilledButton.tonalIcon(onPressed: _requestCamera, icon: const Icon(Icons.videocam_outlined), label: const Text('Enable camera')),
        const SizedBox(height: 8),
        FilledButton.tonalIcon(onPressed: _requestStorage, icon: const Icon(Icons.photo_library_outlined), label: const Text('Enable gallery access')),
        const SizedBox(height: 12),
        TextField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title')),
        const SizedBox(height: 8),
        TextField(controller: _captionController, decoration: const InputDecoration(labelText: 'Caption')),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          value: _rating,
          items: [1, 2, 3, 4, 5].map((v) => DropdownMenuItem(value: v, child: Text('$v stars'))).toList(),
          onChanged: (value) => setState(() => _rating = value ?? 4),
          decoration: const InputDecoration(labelText: 'Quick verdict'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () async {
            final repo = await ref.read(videoRepositoryProvider.future);
            await repo.submitDraft(
              source: _source.name,
              placeId: _selectedPlace?.placeId ?? 'manual',
              title: _titleController.text,
              caption: _captionController.text,
              rating: _rating,
            );
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Draft saved.')));
          },
          child: const Text('Save draft'),
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
                        subtitle: Text('${video.placeName} • ${video.status.name}'),
                        trailing: const Icon(Icons.chevron_right),
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
