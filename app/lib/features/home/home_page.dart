import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/identity/identity_provider.dart';
import '../../core/identity/identity_store.dart';
import '../../features/accomplishments/accomplishment_models.dart';
import '../../features/challenges/challenge_models.dart';
import '../../features/collections/collection_models.dart';
import '../../features/collections/collection_repository.dart';
import '../../models/telemetry.dart';
import '../../providers/app_providers.dart';
import '../notifications/notification_center_tab.dart';
import '../leaderboards/leaderboard_tab.dart';
import '../notifications/notification_providers.dart';
import '../place_review_editor/place_review_video_editor_screen.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';
import '../viewer_rewards/viewer_reward_models.dart';
import 'map_discovery_tab.dart';
import 'place_video_detail_page.dart';

enum HomeTab { feed, map, create, saved, ranks, alerts, profile }

final profileCollectionsProvider = FutureProvider<List<CollectionCardModel>>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  final repository = CollectionRepository(apiClient);
  return repository.fetchCollections();
});

final profileAccomplishmentSummaryProvider = FutureProvider<AccomplishmentSummary?>((ref) async {
  final repository = await ref.watch(accomplishmentRepositoryProvider.future);
  return repository.fetchSummary();
});

final profileChallengeSummaryProvider = FutureProvider<ChallengeSummary?>((ref) async {
  final repository = await ref.watch(challengeRepositoryProvider.future);
  return repository.fetchSummary();
});

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key, this.initialTab = HomeTab.feed});

  final HomeTab initialTab;

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _navIndex = 0;
  FeedScope _scope = FeedScope.local;
  bool _scopeInitialized = false;
  static const List<HomeTab> _navTabs = [
    HomeTab.feed,
    HomeTab.map,
    HomeTab.create,
    HomeTab.saved,
    HomeTab.ranks,
    HomeTab.alerts,
    HomeTab.profile,
  ];

  @override
  void initState() {
    super.initState();
    _navIndex = _navTabs.indexOf(widget.initialTab);
    if (_navIndex < 0) _navIndex = 0;
  }

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
      const _CreateTab(),
      const _SavedTab(),
      const LeaderboardTab(),
      const NotificationCenterTab(),
      const _ProfileTab(),
    ];

    return AppScaffold(
      padding: EdgeInsets.zero,
      appBar: AppBar(
        title: const Text('Perbug'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: AppSpacing.m),
            child: AppPill(label: 'LIVE', icon: Icons.bolt_rounded),
          ),
        ],
      ),
      body: AnimatedSwitcher(duration: const Duration(milliseconds: 280), child: IndexedStack(key: ValueKey(_navIndex), index: _navIndex, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.play_circle_outline), selectedIcon: Icon(Icons.play_circle), label: 'Feed'),
          const NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          const NavigationDestination(icon: Icon(Icons.add_circle_outline), selectedIcon: Icon(Icons.add_circle), label: 'Create'),
          const NavigationDestination(icon: Icon(Icons.bookmark_border), selectedIcon: Icon(Icons.bookmark), label: 'Saved'),
          const NavigationDestination(icon: Icon(Icons.emoji_events_outlined), selectedIcon: Icon(Icons.emoji_events), label: 'Arena'),
          NavigationDestination(
            icon: Badge(isLabelVisible: unreadCount > 0, label: Text(unreadCount > 99 ? '99+' : '$unreadCount'), child: const Icon(Icons.notifications_none)),
            selectedIcon: const Icon(Icons.notifications),
            label: 'Alerts',
          ),
          const NavigationDestination(icon: Icon(Icons.account_circle_outlined), selectedIcon: Icon(Icons.account_circle), label: 'Profile'),
        ],
      ),
    );
  }
}

class _FeedTab extends ConsumerStatefulWidget {
  const _FeedTab({required this.scope, required this.onScopeChanged});

  final FeedScope scope;
  final ValueChanged<FeedScope> onScopeChanged;

  @override
  ConsumerState<_FeedTab> createState() => _FeedTabState();
}

class _FeedTabState extends ConsumerState<_FeedTab> {
  late final PageController _pageController;
  int _activeIndex = 0;
  final Map<String, PlaceStreamItem> _decisions = {};

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.92);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _track(String event, Map<String, dynamic> payload) async {
    final telemetryRepository = ref.read(telemetryRepositoryProvider).valueOrNull;
    if (telemetryRepository == null) return;
    await telemetryRepository.enqueueEvent(
      'place_stream',
      TelemetryEventInput.fromJson({'event': event, 'source': 'place_stream', ...payload}),
    );
  }

  void _applyDecision(PlaceStreamItem item, bool saved) {
    setState(() {
      _decisions[item.placeId] = item.copyWith(isSaved: saved, isPassed: !saved);
    });
    _track(
      saved ? 'swipe' : 'swipe',
      {'planId': item.placeId, 'action': saved ? 'yes' : 'no', 'section': 'place_stream'},
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(saved ? Icons.verified_rounded : Icons.skip_next_rounded, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(saved ? 'Saved ${item.placeName}' : 'Passed ${item.placeName}')),
          ],
        ),
        action: saved
            ? SnackBarAction(
                label: 'Undo',
                onPressed: () {
                  setState(() {
                    _decisions[item.placeId] = item.copyWith(isSaved: false, isPassed: false);
                  });
                },
              )
            : null,
      ),
    );
  }

  void _openPlace(PlaceStreamItem item) {
    _track('card_opened', {'planId': item.placeId, 'section': 'place_detail'});
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PlaceVideoDetailPage(placeId: item.placeId, placeName: item.placeName),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bootstrap = ref.watch(feedBootstrapProvider);
    final stream = ref.watch(placeStreamProvider(widget.scope));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Column(
            children: [
              const PremiumHeader(
                title: 'Place stream',
                subtitle: 'Swipe vertically between places, swipe horizontally to save or pass, and tap into each place story.',
                badge: AppPill(label: 'Discovery', icon: Icons.auto_awesome_rounded),
              ),
              const SizedBox(height: AppSpacing.s),
              SegmentedButton<FeedScope>(
                segments: const [
                  ButtonSegment(value: FeedScope.local, icon: Icon(Icons.place_outlined), label: Text('Local')),
                  ButtonSegment(value: FeedScope.regional, icon: Icon(Icons.public), label: Text('Regional')),
                  ButtonSegment(value: FeedScope.global, icon: Icon(Icons.flight_takeoff), label: Text('Global')),
                ],
                selected: {widget.scope},
                onSelectionChanged: (value) => widget.onScopeChanged(value.first),
              ),
            ],
          ),
        ),
        Expanded(
          child: bootstrap.when(
            data: (boot) {
              final seeded = (boot.itemsByScope[widget.scope] ?? const [])
                  .fold<Map<String, List<PlaceVideoFeedItem>>>({}, (acc, item) {
                acc.putIfAbsent(item.placeId, () => <PlaceVideoFeedItem>[]).add(item);
                return acc;
              })
                  .values
                  .map((group) => PlaceStreamItem.fromFeedItems(placeId: group.first.placeId, scope: widget.scope, items: group))
                  .toList(growable: false);
              final items = (seeded.isNotEmpty ? seeded : stream.valueOrNull ?? const [])
                  .map((item) => _decisions[item.placeId] ?? item)
                  .toList(growable: false);
              if (items.isEmpty) {
                return _FeedEmptyState(
                  title: boot.emptyTitle ?? 'No nearby places yet',
                  body: boot.emptyBody ?? 'Try switching to Regional or Global to discover more places in the stream.',
                  suggestions: boot.suggestions,
                );
              }
              if (_activeIndex >= items.length) {
                _activeIndex = items.length - 1;
              }
              return PageView.builder(
                key: ValueKey(widget.scope),
                controller: _pageController,
                scrollDirection: Axis.vertical,
                onPageChanged: (index) {
                  setState(() => _activeIndex = index);
                  final item = items[index];
                  _track('card_viewed', {'planId': item.placeId, 'position': index, 'section': 'place_stream'});
                },
                itemCount: items.length,
                itemBuilder: (_, index) => Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
                  child: _PlaceStreamCard(
                    key: ValueKey('place-stream-${items[index].placeId}'),
                    item: items[index],
                    isActive: index == _activeIndex,
                    onSave: () => _applyDecision(items[index], true),
                    onPass: () => _applyDecision(items[index], false),
                    onOpenPlace: () => _openPlace(items[index]),
                    onOpenMap: () {
                      _track('outbound_link_clicked', {'planId': items[index].placeId, 'linkType': 'maps'});
                      showModalBottomSheet<void>(
                        context: context,
                        builder: (context) => _ContextSheet(
                          title: items[index].placeName,
                          subtitle: 'Map preview',
                          body: 'Map context opens here without breaking your place stream position.',
                          icon: Icons.map_outlined,
                        ),
                      );
                    },
                    onOpenCreator: () {
                      final review = items[index].activeReview;
                      _track('card_opened', {'planId': items[index].placeId, 'section': 'creator_profile'});
                      showModalBottomSheet<void>(
                        context: context,
                        builder: (context) => _ContextSheet(
                          title: review?.creatorHandle ?? '@creator',
                          subtitle: review?.creatorName ?? 'Creator profile',
                          body: 'Creator profile opens as a light-weight depth layer from the place stream.',
                          icon: Icons.account_circle_outlined,
                        ),
                      );
                    },
                    onReviewChanged: (reviewIndex) {
                      final updated = items[index].copyWith(selectedHero: reviewIndex);
                      setState(() => _decisions[updated.placeId] = updated);
                      _track('card_opened', {'planId': updated.placeId, 'section': 'review_switch', 'position': reviewIndex});
                    },
                  ),
                ),
              );
            },
            error: (_, __) => stream.when(
              data: (items) => items.isEmpty
                  ? const _FeedEmptyState(title: 'No content yet', body: 'Try another scope or update preferences in settings.')
                  : PageView.builder(
                      scrollDirection: Axis.vertical,
                      itemCount: items.length,
                      itemBuilder: (_, index) => _PlaceStreamCard(
                        item: items[index],
                        isActive: index == 0,
                        onSave: () {},
                        onPass: () {},
                        onOpenPlace: () {},
                        onOpenMap: () {},
                        onOpenCreator: () {},
                        onReviewChanged: (_) {},
                      ),
                    ),
              loading: () => const Center(child: AppSkeleton(height: 220)),
              error: (e, _) => Center(child: Text('Feed unavailable: $e')),
            ),
            loading: () => const Center(child: AppSkeleton(height: 220)),
          ),
        ),
      ],
    );
  }
}

class _PlaceStreamCard extends StatefulWidget {
  const _PlaceStreamCard({
    super.key,
    required this.item,
    required this.isActive,
    required this.onSave,
    required this.onPass,
    required this.onOpenPlace,
    required this.onOpenMap,
    required this.onOpenCreator,
    required this.onReviewChanged,
  });

  final PlaceStreamItem item;
  final bool isActive;
  final VoidCallback onSave;
  final VoidCallback onPass;
  final VoidCallback onOpenPlace;
  final VoidCallback onOpenMap;
  final VoidCallback onOpenCreator;
  final ValueChanged<int> onReviewChanged;

  @override
  State<_PlaceStreamCard> createState() => _PlaceStreamCardState();
}

class _PlaceStreamCardState extends State<_PlaceStreamCard> {
  double _dragDx = 0;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final review = item.activeReview;
    final swipeIntent = _dragDx > 40 ? 'Save' : (_dragDx < -40 ? 'Pass' : null);
    final swipeColor = _dragDx > 40
        ? Colors.greenAccent.shade400
        : (_dragDx < -40 ? Colors.redAccent.shade200 : Colors.transparent);

    return GestureDetector(
      onHorizontalDragUpdate: (details) => setState(() => _dragDx += details.delta.dx),
      onHorizontalDragEnd: (_) {
        final delta = _dragDx;
        setState(() => _dragDx = 0);
        if (delta > 100) widget.onSave();
        if (delta < -100) widget.onPass();
      },
      child: Transform.translate(
        offset: Offset(_dragDx * 0.16, 0),
        child: AppCard(
          tone: widget.isActive ? AppCardTone.featured : AppCardTone.standard,
          padding: EdgeInsets.zero,
          child: Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.black,
                      Theme.of(context).colorScheme.surfaceContainerHighest,
                      Theme.of(context).colorScheme.primary.withOpacity(0.25),
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          _PlaceHero(item: item, review: review),
                          Positioned(
                            left: 18,
                            top: 18,
                            child: Wrap(
                              spacing: 8,
                              children: [
                                AppPill(
                                  label: item.placeCategory,
                                  icon: Icons.place_outlined,
                                  backgroundColor: Colors.white.withOpacity(0.12),
                                  foregroundColor: Colors.white,
                                ),
                                AppPill(
                                  label: item.heroType == PlaceHeroMediaType.video ? 'Review video' : 'Place hero',
                                  icon: item.heroType == PlaceHeroMediaType.video ? Icons.play_circle_fill_rounded : Icons.image_outlined,
                                  backgroundColor: Colors.white.withOpacity(0.12),
                                  foregroundColor: Colors.white,
                                ),
                              ],
                            ),
                          ),
                          if (swipeIntent != null)
                            Positioned(
                              top: 22,
                              right: 22,
                              child: Chip(
                                backgroundColor: swipeColor.withOpacity(0.82),
                                label: Text(swipeIntent),
                                avatar: Icon(_dragDx > 0 ? Icons.bookmark_added_outlined : Icons.do_not_disturb_alt_outlined),
                              ),
                            ),
                          Positioned(
                            left: 18,
                            right: 18,
                            bottom: 18,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.52),
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(18),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    GestureDetector(
                                      onTap: widget.onOpenPlace,
                                      child: Text(item.placeName, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(item.regionLabel, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white70)),
                                    const SizedBox(height: 10),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        if (review != null) _ActionChip(icon: Icons.star_rounded, label: '${review.rating}/5'),
                                        if (review?.viewerRewardHint?.isEligible == true)
                                          _ActionChip(
                                            icon: Icons.workspace_premium_outlined,
                                            label: 'Earn ${(review!.viewerRewardHint!.watchRewardPerbug ?? 0).toStringAsFixed(1)} PERBUG',
                                          ),
                                        if (review?.viewerRewardHint?.hasSponsoredFunding == true)
                                          _ActionChip(
                                            icon: Icons.campaign_outlined,
                                            label: _sponsorLabel(review!.viewerRewardHint!),
                                          ),
                                        if (item.socialProof != null) _ActionChip(icon: Icons.layers_outlined, label: item.socialProof!),
                                        _ActionChip(icon: Icons.swipe_rounded, label: 'Swipe right save • left pass'),
                                      ],
                                    ),
                                    const SizedBox(height: 14),
                                    Row(
                                      children: [
                                        InkWell(
                                          onTap: widget.onOpenCreator,
                                          child: Row(
                                            children: [
                                              CircleAvatar(radius: 16, child: Text(_creatorInitial(review?.creatorHandle))),
                                              const SizedBox(width: 10),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(review?.creatorHandle ?? '@creator', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                                                  Text(review?.caption.isNotEmpty == true ? review!.caption : 'No review caption yet', style: const TextStyle(color: Colors.white70)),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const Spacer(),
                                        IconButton(onPressed: widget.onOpenMap, icon: const Icon(Icons.map_outlined, color: Colors.white)),
                                        IconButton(onPressed: widget.onOpenPlace, icon: const Icon(Icons.open_in_new_rounded, color: Colors.white)),
                                      ],
                                    ),
                                    if (item.reviews.length > 1) ...[
                                      const SizedBox(height: 12),
                                      SizedBox(
                                        height: 42,
                                        child: ListView.separated(
                                          scrollDirection: Axis.horizontal,
                                          itemCount: item.reviews.length,
                                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                                          itemBuilder: (_, index) {
                                            final option = item.reviews[index];
                                            final selected = index == item.selectedHero;
                                            return ChoiceChip(
                                              selected: selected,
                                              label: Text(option.creatorHandle),
                                              avatar: CircleAvatar(radius: 10, child: Text('${index + 1}')),
                                              onSelected: (_) => widget.onReviewChanged(index),
                                            );
                                          },
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: widget.onPass,
                              icon: const Icon(Icons.close_rounded),
                              label: const Text('Pass'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: widget.onSave,
                              icon: Icon(item.isSaved ? Icons.bookmark_added_rounded : Icons.bookmark_add_outlined),
                              label: Text(item.isSaved ? 'Saved' : 'Want to go'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceHero extends StatelessWidget {
  const _PlaceHero({required this.item, required this.review});

  final PlaceStreamItem item;
  final PlaceStreamReview? review;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final heroImageUrl = item.heroType == PlaceHeroMediaType.video ? null : item.heroImageUrl;
    return Container(
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        image: heroImageUrl != null && heroImageUrl.isNotEmpty
            ? DecorationImage(
                image: NetworkImage(heroImageUrl),
                fit: BoxFit.cover,
                onError: (_, __) {},
              )
            : null,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.primary.withOpacity(item.heroType == PlaceHeroMediaType.video ? 0.55 : 0.18),
              colorScheme.secondary.withOpacity(0.16),
              Colors.black87,
            ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                item.heroType == PlaceHeroMediaType.video
                    ? Icons.play_circle_fill_rounded
                    : item.heroType == PlaceHeroMediaType.image
                        ? Icons.photo_library_outlined
                        : Icons.place_rounded,
                size: 88,
                color: Colors.white.withOpacity(0.92),
              ),
              const SizedBox(height: 12),
              Text(
                review?.caption.isNotEmpty == true ? review!.caption : item.placeName,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

class _ContextSheet extends StatelessWidget {
  const _ContextSheet({required this.title, required this.subtitle, required this.body, required this.icon});

  final String title;
  final String subtitle;
  final String body;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [Icon(icon), const SizedBox(width: 10), Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge))]),
            const SizedBox(height: 8),
            Text(subtitle, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(body),
          ],
        ),
      ),
    );
  }
}

String _creatorInitial(String? handle) {
  final normalized = (handle ?? '').replaceAll('@', '').trim();
  if (normalized.isEmpty) return 'C';
  return normalized[0].toUpperCase();
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
        child: AppCard(
          tone: AppCardTone.collection,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AppPill(label: 'Fresh feed', icon: Icons.ondemand_video_outlined),
              const SizedBox(height: 12),
              Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
              const SizedBox(height: 6),
              Text(body, textAlign: TextAlign.center),
              if (suggestions.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(spacing: 8, runSpacing: 8, children: suggestions.map((e) => AppPill(label: e)).toList(growable: false)),
              ],
            ],
          ),
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
          const BrandHeroCard(
            child: AppSectionHeader(
              title: 'Creator Hub',
              subtitle: 'Start, upload, recover, and publish vivid place review videos with branded momentum.',
            ),
          ),
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
        Expanded(child: _ActionCard(icon: Icons.videocam_rounded, title: 'Record Video', subtitle: 'Open the full review editor', onTap: () => _launchEditor())),
        const SizedBox(width: 10),
        Expanded(child: _ActionCard(icon: Icons.upload_rounded, title: 'Upload Video', subtitle: 'Import a clip into the editor', onTap: () => _launchEditor())),
        const SizedBox(width: 10),
        Expanded(child: _ActionCard(icon: Icons.note_add_rounded, title: 'New Draft', subtitle: 'Build a place review from scratch', onTap: () => _launchEditor())),
      ],
    );
  }

  Future<void> _launchEditor() async {
    await _trackCreateEvent('place_review_editor_opened');
    if (!mounted) return;
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const PlaceReviewVideoEditorScreen(recoverLatestDraft: true)));
    if (!mounted) return;
    await _refresh();
  }

  Widget _buildGroupedSections(List<StudioVideo> items) {
    final drafts = items.where((v) => v.section == StudioSection.drafts).toList(growable: false);
    final processing = items.where((v) => v.section == StudioSection.processing).toList(growable: false);
    final needsAttention = items.where((v) => v.section == StudioSection.needsAttention).toList(growable: false);
    final ready = items.where((v) => v.publishReady && v.section != StudioSection.published).toList(growable: false);

    if (items.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Icon(Icons.auto_awesome),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Create your first place review'),
                        SizedBox(height: 4),
                        Text('Start a draft, tag a canonical place, then record or upload a video.'),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => _startFlow(CreateFlowSource.draft),
                child: const Text('Start'),
              ),
            ],
          ),
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
    _trackCreateEvent('create_profile_shortcut_opened', {'section': section.name});
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
              TextField(
                controller: _titleController,
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.next,
                maxLines: 1,
                decoration: const InputDecoration(labelText: 'Title'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _captionController,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(labelText: 'Caption'),
                minLines: 2,
                maxLines: 4,
              ),
              const SizedBox(height: 8),
              TextField(
                key: const Key('place-search-field'),
                controller: _placeSearchController,
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.search,
                maxLines: 1,
                decoration: const InputDecoration(labelText: 'Tag canonical place', hintText: 'Search places'),
                onChanged: (_) => setState(() {}),
              ),
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
      appBar: AppBar(title: Text('${_sectionTitle(section)} reviews')),
      body: videos.when(
        data: (items) => items.isEmpty
            ? const Center(child: Text('No reviews in this section yet.'))
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
        error: (_, __) => const Center(child: Text('Unable to load this profile section.')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}


String _sectionTitle(StudioSection section) {
  return switch (section) {
    StudioSection.drafts => 'Drafts',
    StudioSection.processing => 'Processing',
    StudioSection.published => 'Published',
    StudioSection.needsAttention => 'Needs Attention',
    StudioSection.archived => 'Archived',
  };
}

class _SavedTab extends StatelessWidget {
  const _SavedTab();

  @override
  Widget build(BuildContext context) => const Center(child: Text('Saved places/videos'));
}

class _ProfileTab extends ConsumerStatefulWidget {
  const _ProfileTab();

  @override
  ConsumerState<_ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<_ProfileTab> with AutomaticKeepAliveClientMixin {
  StudioSection _section = StudioSection.published;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final profile = ref.watch(localUserProfileProvider);
    final analytics = ref.watch(studioAnalyticsProvider);
    final publishedVideos = ref.watch(studioVideosProvider(StudioSection.published));
    final draftVideos = ref.watch(studioVideosProvider(StudioSection.drafts));
    final needsAttentionVideos = ref.watch(studioVideosProvider(StudioSection.needsAttention));
    final archivedVideos = ref.watch(studioVideosProvider(StudioSection.archived));
    final collections = ref.watch(profileCollectionsProvider);
    final accomplishments = ref.watch(profileAccomplishmentSummaryProvider);
    final challenges = ref.watch(profileChallengeSummaryProvider);

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 32),
        children: [
          profile.when(
            data: (user) => _buildHeader(context, user, analytics),
            loading: () => const Card(child: Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator())),
            error: (_, __) => const Card(child: ListTile(title: Text('Profile unavailable'), subtitle: Text('Pull to refresh and try again.'))),
          ),
          const SizedBox(height: 12),
          _buildInsightsRow(analytics, collections, accomplishments, challenges),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Posts & reviews',
            subtitle: 'Your published place reviews and profile-ready content.',
            child: publishedVideos.when(
              data: (items) => items.isEmpty
                  ? const _ProfileEmptyState(
                      icon: Icons.rate_review_outlined,
                      title: 'No published reviews yet',
                      subtitle: 'Publish your first place review from Create to build your public profile.',
                    )
                  : Column(
                      children: items.take(6).map((video) => _ProfileReviewTile(video: video)).toList(growable: false),
                    ),
              loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
              error: (_, __) => const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Published reviews are temporarily unavailable.'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Drafted reviews & videos',
            subtitle: 'Keep unfinished content moving and fix anything blocked before publish.',
            child: Column(
              children: [
                _profileSubsection(
                  title: 'Drafts',
                  asyncVideos: draftVideos,
                  emptyTitle: 'No active drafts',
                  emptySubtitle: 'Start a draft in Create when you are ready to review a new spot.',
                ),
                const SizedBox(height: 12),
                _profileSubsection(
                  title: 'Needs attention',
                  asyncVideos: needsAttentionVideos,
                  emptyTitle: 'Nothing needs attention',
                  emptySubtitle: 'Upload retries and moderation fixes will appear here.',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Saved places & collections',
            subtitle: 'Quick access to the places and collection progress you care about most.',
            child: collections.when(
              data: (items) => items.isEmpty
                  ? const _ProfileEmptyState(
                      icon: Icons.bookmark_outline,
                      title: 'No saved collections yet',
                      subtitle: 'Saved places and curated collections will surface here as soon as they are available.',
                    )
                  : Column(
                      children: items.take(4).map((collection) => _CollectionTile(collection: collection)).toList(growable: false),
                    ),
              loading: () => const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
              error: (_, __) => const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Saved collections are temporarily unavailable.'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Achievements & progress',
            subtitle: 'Badges earned, milestone progress, and challenge momentum across Perbug.',
            child: _buildAchievementContent(accomplishments, challenges),
          ),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Profile tools',
            subtitle: 'Manage your account, privacy, notifications, and sign-out flow.',
            child: Column(
              children: [
                _SettingsEntry(
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'Perbug Balance hub',
                  subtitle: 'Wallet, rewards, quests, collections, and earning progression.',
                  onTap: () => context.push('/economy'),
                ),
                const Divider(height: 1),
                _SettingsEntry(
                  icon: Icons.insights_outlined,
                  title: 'Creator earnings',
                  subtitle: 'Performance, claimable rewards, and monetization activity.',
                  onTap: () => context.push('/creator/rewards'),
                ),
                const Divider(height: 1),
                _SettingsEntry(
                  icon: Icons.settings_outlined,
                  title: 'Open settings',
                  subtitle: 'Notifications, permissions, support, and privacy controls.',
                  onTap: () => context.push('/settings'),
                ),
                const Divider(height: 1),
                _SettingsEntry(
                  icon: Icons.logout_rounded,
                  title: 'Log out',
                  subtitle: 'Clear this local profile and return to onboarding.',
                  onTap: _confirmLogout,
                  destructive: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildSectionCard(
            context,
            title: 'Library filters',
            subtitle: 'Jump into another profile content bucket.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _sectionChip('Published', StudioSection.published),
                    _sectionChip('Drafts', StudioSection.drafts),
                    _sectionChip('Processing', StudioSection.processing),
                    _sectionChip('Needs Attention', StudioSection.needsAttention),
                    _sectionChip('Archived', StudioSection.archived),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => _StudioSectionPage(section: _section)),
                    ),
                    icon: const Icon(Icons.grid_view_rounded),
                    label: Text('Open ${_sectionTitle(_section)} library'),
                  ),
                ),
                const SizedBox(height: 8),
                archivedVideos.when(
                  data: (items) => Text(
                    'Archived content: ${items.length}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, LocalUserProfile user, AsyncValue<StudioAnalyticsOverview> analytics) {
    final overview = analytics.valueOrNull;
    final publishedCount = overview?.totalVideosPublished ?? 0;
    const int? followerCount = null;
    const int? followingCount = null;
    final draftCount = overview?.statusCounts['drafts'] ?? 0;
    final needsAttention = overview?.statusCounts['needsAttention'] ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 34,
                  child: Text(user.initials, style: Theme.of(context).textTheme.titleLarge),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.displayName, style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 2),
                      Text('@${user.username}', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Theme.of(context).colorScheme.primary)),
                      const SizedBox(height: 8),
                      Text(user.bio),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _metricCard('Reviews', '$publishedCount'),
                _metricCard('Drafts', '$draftCount'),
                _metricCard('Needs fixes', '$needsAttention'),
                _metricCard('Followers', followerCount == null ? '—' : '$followerCount', caption: followerCount == null ? 'Unavailable' : null),
                _metricCard('Following', followingCount == null ? '—' : '$followingCount', caption: followingCount == null ? 'Unavailable' : null),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: () => _showEditProfile(user),
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit profile'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/settings'),
                    icon: const Icon(Icons.tune_rounded),
                    label: const Text('Settings'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightsRow(
    AsyncValue<StudioAnalyticsOverview> analytics,
    AsyncValue<List<CollectionCardModel>> collections,
    AsyncValue<AccomplishmentSummary?> accomplishments,
    AsyncValue<ChallengeSummary?> challenges,
  ) {
    final collectionCount = collections.valueOrNull?.length ?? 0;
    final accomplishmentCount = accomplishments.valueOrNull?.earnedCount ?? 0;
    final challengeCount = challenges.valueOrNull?.inProgress ?? 0;
    final totalViews = analytics.valueOrNull?.totalViews ?? 0;

    return Row(
      children: [
        Expanded(child: _metricCard('Views', '$totalViews')),
        const SizedBox(width: 8),
        Expanded(child: _metricCard('Collections', '$collectionCount')),
        const SizedBox(width: 8),
        Expanded(child: _metricCard('Badges', '$accomplishmentCount')),
        const SizedBox(width: 8),
        Expanded(child: _metricCard('Active quests', '$challengeCount')),
      ],
    );
  }

  Widget _buildAchievementContent(
    AsyncValue<AccomplishmentSummary?> accomplishments,
    AsyncValue<ChallengeSummary?> challenges,
  ) {
    if (accomplishments.isLoading || challenges.isLoading) {
      return const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator());
    }
    if (accomplishments.hasError && challenges.hasError) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text('Achievements and challenge progress are temporarily unavailable.'),
      );
    }

    final accomplishmentSummary = accomplishments.valueOrNull;
    final challengeSummary = challenges.valueOrNull;
    final badges = accomplishmentSummary?.featured ?? const <String>[];
    final nextMilestones = accomplishmentSummary?.nextMilestones ?? const <String>[];
    final featuredLocales = challengeSummary?.featuredLocales ?? const <String>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (badges.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: badges.map((badge) => Chip(avatar: const Icon(Icons.verified_rounded, size: 18), label: Text(badge))).toList(growable: false),
          ),
          const SizedBox(height: 12),
        ],
        if (nextMilestones.isNotEmpty)
          ...nextMilestones.map(
            (milestone) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.flag_outlined),
              title: Text(milestone.replaceAll('_', ' ')),
              subtitle: const Text('Next milestone on your profile journey.'),
            ),
          ),
        if (featuredLocales.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: featuredLocales.map((locale) => Chip(label: Text(locale))).toList(growable: false),
            ),
          ),
        if (badges.isEmpty && nextMilestones.isEmpty && featuredLocales.isEmpty)
          const _ProfileEmptyState(
            icon: Icons.emoji_events_outlined,
            title: 'No achievements to show yet',
            subtitle: 'Your earned badges and challenge progress will appear here once available.',
          ),
      ],
    );
  }

  Widget _profileSubsection({
    required String title,
    required AsyncValue<List<StudioVideo>> asyncVideos,
    required String emptyTitle,
    required String emptySubtitle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        asyncVideos.when(
          data: (items) => items.isEmpty
              ? _ProfileEmptyState(
                  icon: Icons.edit_note_rounded,
                  title: emptyTitle,
                  subtitle: emptySubtitle,
                )
              : Column(children: items.take(3).map((video) => _ProfileReviewTile(video: video)).toList(growable: false)),
          loading: () => const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator()),
          error: (_, __) => const Padding(
            padding: EdgeInsets.all(12),
            child: Text('This profile section is temporarily unavailable.'),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionCard(BuildContext context, {required String title, required String subtitle, required Widget child}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }

  Future<void> _showEditProfile(LocalUserProfile user) async {
    final displayNameController = TextEditingController(text: user.displayName);
    final usernameController = TextEditingController(text: user.username);
    final bioController = TextEditingController(text: user.bio);

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Edit profile', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(controller: displayNameController, decoration: const InputDecoration(labelText: 'Display name')),
            const SizedBox(height: 8),
            TextField(controller: usernameController, decoration: const InputDecoration(prefixText: '@', labelText: 'Username')),
            const SizedBox(height: 8),
            TextField(controller: bioController, decoration: const InputDecoration(labelText: 'Bio'), minLines: 3, maxLines: 5),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  final store = await ref.read(identityStoreProvider.future);
                  await store.updateProfile(
                    displayName: displayNameController.text,
                    username: usernameController.text,
                    bio: bioController.text,
                  );
                  if (!mounted) return;
                  ref.invalidate(localUserProfileProvider);
                  Navigator.of(context).pop(true);
                },
                child: const Text('Save changes'),
              ),
            ),
          ],
        ),
      ),
    );

    displayNameController.dispose();
    usernameController.dispose();
    bioController.dispose();

    if (saved == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated.')));
    }
  }

  Future<void> _confirmLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('This clears the current local profile from this device and sends you back to onboarding.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Log out')),
        ],
      ),
    );

    if (confirm != true) return;
    final store = await ref.read(identityStoreProvider.future);
    await store.resetIdentity();
    ref.invalidate(localUserProfileProvider);
    ref.invalidate(userIdProvider);
    ref.invalidate(onboardingCompletedProvider);
    if (!mounted) return;
    context.go('/onboarding');
  }

  Future<void> _refresh() async {
    ref.invalidate(localUserProfileProvider);
    ref.invalidate(studioAnalyticsProvider);
    ref.invalidate(studioVideosProvider(StudioSection.published));
    ref.invalidate(studioVideosProvider(StudioSection.drafts));
    ref.invalidate(studioVideosProvider(StudioSection.needsAttention));
    ref.invalidate(studioVideosProvider(StudioSection.archived));
    ref.invalidate(profileCollectionsProvider);
    ref.invalidate(profileAccomplishmentSummaryProvider);
    ref.invalidate(profileChallengeSummaryProvider);
    await Future.wait([
      ref.read(localUserProfileProvider.future),
      ref.read(studioAnalyticsProvider.future),
      ref.read(studioVideosProvider(StudioSection.published).future),
      ref.read(studioVideosProvider(StudioSection.drafts).future),
      ref.read(studioVideosProvider(StudioSection.needsAttention).future),
      ref.read(studioVideosProvider(StudioSection.archived).future),
      ref.read(profileCollectionsProvider.future),
      ref.read(profileAccomplishmentSummaryProvider.future),
      ref.read(profileChallengeSummaryProvider.future),
    ]);
  }

  Widget _sectionChip(String label, StudioSection section) {
    return ChoiceChip(
      label: Text(label),
      selected: _section == section,
      onSelected: (_) => setState(() => _section = section),
    );
  }

  Widget _metricCard(String label, String value, {String? caption}) {
    return SizedBox(
      width: 132,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label),
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              if (caption != null) ...[
                const SizedBox(height: 4),
                Text(caption, style: Theme.of(context).textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileReviewTile extends StatelessWidget {
  const _ProfileReviewTile({required this.video});

  final StudioVideo video;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: CircleAvatar(
          child: Icon(
            video.section == StudioSection.published ? Icons.public_rounded : Icons.play_circle_outline_rounded,
          ),
        ),
        title: Text(video.title),
        subtitle: Text('${video.placeName} • ${video.statusLabel ?? video.status.name}'),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class _CollectionTile extends StatelessWidget {
  const _CollectionTile({required this.collection});

  final CollectionCardModel collection;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.collections_bookmark_outlined),
                const SizedBox(width: 8),
                Expanded(child: Text(collection.title, style: Theme.of(context).textTheme.titleMedium)),
                Text(collection.status.replaceAll('_', ' ')),
              ],
            ),
            const SizedBox(height: 8),
            Text('${collection.completedItems}/${collection.totalItems} saved • ${collection.type}'),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: collection.progress),
          ],
        ),
      ),
    );
  }
}

class _ProfileEmptyState extends StatelessWidget {
  const _ProfileEmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.35),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon),
          const SizedBox(height: 8),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle),
        ],
      ),
    );
  }
}

class _SettingsEntry extends StatelessWidget {
  const _SettingsEntry({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? Theme.of(context).colorScheme.error : null;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: color),
      title: Text(title, style: TextStyle(color: color)),
      subtitle: Text(subtitle),
      trailing: Icon(Icons.chevron_right, color: color),
      onTap: onTap,
    );
  }
}

String _sponsorLabel(ViewerRewardHint hint) {
  if (hint.sponsorName?.isNotEmpty == true) {
    return 'Sponsored by ${hint.sponsorName}';
  }
  return hint.fundingLabel?.isNotEmpty == true ? hint.fundingLabel! : 'Sponsored reward';
}
