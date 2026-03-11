import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

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

  @override
  Widget build(BuildContext context) {
    final pages = [
      _FeedTab(scope: _scope, onScopeChanged: (scope) => setState(() => _scope = scope)),
      _SearchTab(scope: _scope),
      const _CreateTab(),
      const _SavedTab(),
      const _NotificationsTab(),
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
        destinations: const [
          NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'Feed'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Create'),
          NavigationDestination(icon: Icon(Icons.bookmark_border), selectedIcon: Icon(Icons.bookmark), label: 'Saved'),
          NavigationDestination(icon: Icon(Icons.notifications_none), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
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
          child: feed.when(
            data: (items) => ListView.builder(
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
                    subtitle: Text('${item.placeName} • ${item.placeCategory} • ${item.regionLabel}\n${item.creatorHandle}'),
                    trailing: Chip(label: Text('${item.rating}/5')),
                  ),
                );
              },
            ),
            error: (_, __) => const Center(child: Text('Feed unavailable.')),
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

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(placeSearchProvider((query: _controller.text, scope: widget.scope)));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _controller,
            decoration: const InputDecoration(labelText: 'Search places', prefixIcon: Icon(Icons.search)),
            onChanged: (_) => setState(() {}),
          ),
        ),
        Expanded(
          child: results.when(
            data: (items) => ListView(
              children: items
                  .map((item) => ListTile(
                        title: Text(item.name),
                        subtitle: Text('${item.category} • ${item.regionLabel}'),
                      ))
                  .toList(growable: false),
            ),
            error: (_, __) => const Center(child: Text('Search unavailable')),
            loading: () => const Center(child: CircularProgressIndicator()),
          ),
        ),
      ],
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
  String _placeId = '';
  final _titleController = TextEditingController();
  final _captionController = TextEditingController();
  int _rating = 4;

  @override
  Widget build(BuildContext context) {
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
        TextField(
          key: const Key('place-id-field'),
          decoration: const InputDecoration(labelText: 'Canonical place ID (required)'),
          onChanged: (value) => _placeId = value,
        ),
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
          onPressed: _placeId.isEmpty
              ? null
              : () async {
                  final repo = await ref.read(videoRepositoryProvider.future);
                  await repo.submitDraft(
                    source: _source,
                    placeId: _placeId,
                    title: _titleController.text,
                    caption: _captionController.text,
                    rating: _rating,
                  );
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Draft saved to studio')));
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

class _NotificationsTab extends StatelessWidget {
  const _NotificationsTab();

  @override
  Widget build(BuildContext context) => const Center(child: Text('Creator notifications'));
}

class _ProfileStudioTab extends ConsumerWidget {
  const _ProfileStudioTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final videos = ref.watch(studioVideosProvider);
    return videos.when(
      data: (items) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          const Text('Creator Profile + Studio', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...items.map((video) => ListTile(
                title: Text(video.title),
                subtitle: Text('${video.placeName} • ${video.status.name}'),
              )),
        ],
      ),
      error: (_, __) => const Center(child: Text('Studio unavailable')),
      loading: () => const Center(child: CircularProgressIndicator()),
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
