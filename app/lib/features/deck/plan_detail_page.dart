import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../ads/native_ad_card.dart';
import '../../api/api_client.dart';
import '../../app/theme/spacing.dart';
import '../../core/ads/ad_placement.dart';
import '../../core/ads/native_ad_controller.dart';
import '../../core/format/formatters.dart';
import '../../core/json_parsers.dart';
import '../../core/validation/url.dart';
import '../../models/telemetry.dart';
import '../../models/place_review.dart';
import '../../models/place_review_video.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'place_detail_models.dart';
import 'widgets/category_pill.dart';
import '../../core/widgets/app_back_button.dart';

class PlanDetailPage extends ConsumerStatefulWidget {
  const PlanDetailPage({
    required this.plan,
    required this.sessionId,
    this.relatedSeed = const <Plan>[],
    this.sessionLat,
    this.sessionLng,
    this.heroTag,
    super.key,
  });

  final Plan plan;
  final String sessionId;
  final List<Plan> relatedSeed;
  final double? sessionLat;
  final double? sessionLng;
  final Object? heroTag;

  @override
  ConsumerState<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends ConsumerState<PlanDetailPage> {
  late Plan _plan;
  Map<String, dynamic>? _rawDetails;
  bool _isLoadingDetails = false;
  String? _detailsError;
  int _selectedPhotoIndex = 0;

  bool _isLoadingReviews = false;
  bool _isSubmittingReview = false;
  String? _reviewsError;
  List<PlaceReview> _reviews = const <PlaceReview>[];

  bool _isLoadingVideos = false;
  bool _isLoadingMoreVideos = false;
  String? _videosError;
  List<PlaceReviewVideo> _videos = const <PlaceReviewVideo>[];
  PlaceReviewVideo? _featuredVideo;
  String? _videoCursor;
  String _videoFilter = 'all';
  bool _isSaved = false;
  bool _isSaveBusy = false;

  final _reviewFormKey = GlobalKey<FormState>();
  final _reviewTextController = TextEditingController();
  final _displayNameController = TextEditingController();
  int _selectedRating = 0;
  bool _anonymous = false;
  NativeAdController? _detailAdController;

  @override
  void initState() {
    super.initState();
    _plan = widget.plan;
    _isSaved = _plan.metadata?['saved'] == true;
    _loadDetailsIfNeeded();
    _loadReviews();
    _loadReviewVideos();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _trackPlaceEvent('place_detail_opened', {'placeId': _plan.sourceId, 'planId': _plan.id});
    });
  }

  @override
  void dispose() {
    _reviewTextController.dispose();
    _displayNameController.dispose();
    _detailAdController?.dispose();
    super.dispose();
  }

  Future<void> _loadDetailsIfNeeded() async {
    final missingDetails = (_plan.description?.trim().isEmpty ?? true) || (_plan.photos?.isEmpty ?? true);
    if (!missingDetails) {
      return;
    }

    final apiClient = ref.read(apiClientProvider).valueOrNull;
    if (apiClient == null) {
      return;
    }

    if (kDebugMode) {
      debugPrint('Plan detail load: id=${_plan.id} sourceId=${_plan.sourceId}');
    }

    setState(() {
      _isLoadingDetails = true;
      _detailsError = null;
    });

    try {
      final detailJson = await apiClient!.fetchPlanDetail(_plan.id) ?? await apiClient.fetchPlaceDetail(_plan.sourceId);
      if (!mounted || detailJson == null) {
        return;
      }

      if (kDebugMode) {
        debugPrint('Plan detail response keys: ${detailJson.keys.toList()}');
      }

      final merged = mergePlanWithDetails(basePlan: _plan, details: detailJson, apiClient: apiClient);
      if (kDebugMode) {
        debugPrint('Parsed detail descriptionLength=${merged.description?.length ?? 0} photoCount=${merged.photos?.length ?? 0}');
      }

      setState(() {
        _plan = merged;
        _rawDetails = detailJson;
        _selectedPhotoIndex = 0;
      });
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Plan detail load failed: $error');
      }
      setState(() => _detailsError = 'Some place details are unavailable right now.');
    } finally {
      if (mounted) {
        setState(() => _isLoadingDetails = false);
      }
    }
  }

  Future<void> _loadReviews() async {
    final repo = ref.read(reviewsRepositoryProvider).valueOrNull;
    if (repo == null) {
      return;
    }
    setState(() {
      _isLoadingReviews = true;
      _reviewsError = null;
    });

    try {
      final reviews = await repo.fetchForPlace(_plan.sourceId);
      if (kDebugMode) {
        debugPrint('Reviews fetch count=${reviews.length} for place=${_plan.sourceId}');
      }
      if (!mounted) return;
      setState(() => _reviews = reviews);
    } catch (error) {
      if (!mounted) return;
      setState(() => _reviewsError = 'Reviews are temporarily unavailable.');
    } finally {
      if (mounted) {
        setState(() => _isLoadingReviews = false);
      }
    }
  }


  Future<void> _loadReviewVideos({bool append = false}) async {
    final repo = ref.read(reviewsRepositoryProvider).valueOrNull;
    if (repo == null) {
      return;
    }
    if (append) {
      if (_isLoadingMoreVideos || _videoCursor == null) return;
      setState(() => _isLoadingMoreVideos = true);
    } else {
      setState(() {
        _isLoadingVideos = true;
        _videosError = null;
        _videoCursor = null;
      });
    }

    try {
      final section = await repo.fetchVideoSection(
        _plan.sourceId,
        filter: _videoFilter,
        cursor: append ? _videoCursor : null,
      );
      if (!mounted) return;
      setState(() {
        _featuredVideo = section.featuredVideo;
        _videos = append ? [..._videos, ...section.videos] : section.videos;
        _videoCursor = section.nextCursor;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _videosError = 'Videos are temporarily unavailable.');
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoadingVideos = false;
        _isLoadingMoreVideos = false;
      });
    }
  }

  Future<void> _openVideoViewer(int initialIndex) async {
    if (_videos.isEmpty) return;
    var index = initialIndex.clamp(0, _videos.length - 1);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final current = _videos[index];
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.m),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: _buildNetworkImage(current.previewUrl),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s),
                    Text(current.author.displayName, style: Theme.of(context).textTheme.titleMedium),
                    if (current.caption?.trim().isNotEmpty == true) Text(current.caption!),
                    const SizedBox(height: AppSpacing.s),
                    Wrap(
                      spacing: AppSpacing.s,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => _launchUri(context, Uri.tryParse(current.playbackUrl)),
                          icon: const Icon(Icons.play_circle_outline),
                          label: const Text('Play video'),
                        ),
                        if (_videos.length > 1)
                          OutlinedButton.icon(
                            onPressed: index > 0
                                ? () => setModalState(() => index -= 1)
                                : null,
                            icon: const Icon(Icons.chevron_left),
                            label: const Text('Previous'),
                          ),
                        if (_videos.length > 1)
                          OutlinedButton.icon(
                            onPressed: index < _videos.length - 1
                                ? () => setModalState(() => index += 1)
                                : null,
                            icon: const Icon(Icons.chevron_right),
                            label: const Text('Next'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submitReview() async {
    final formState = _reviewFormKey.currentState;
    if (formState == null || !formState.validate() || _isSubmittingReview) {
      return;
    }

    final repo = ref.read(reviewsRepositoryProvider).valueOrNull;
    if (repo == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reviews service unavailable.')));
      return;
    }

    setState(() => _isSubmittingReview = true);
    final text = _reviewTextController.text.trim();
    final displayName = _displayNameController.text.trim();

    try {
      if (kDebugMode) {
        debugPrint('Review submit payload place=${_plan.sourceId} rating=$_selectedRating textLen=${text.length} anonymous=$_anonymous');
      }
      final created = await repo.createReview(
        placeId: _plan.sourceId,
        rating: _selectedRating == 0 ? null : _selectedRating,
        body: text,
        displayName: _anonymous ? 'Anonymous' : displayName,
      );
      if (!mounted) return;
      setState(() {
        _reviews = [created, ..._reviews];
        _reviewTextController.clear();
        _displayNameController.clear();
        _selectedRating = 0;
        _anonymous = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted.')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not submit review.')));
    } finally {
      if (mounted) {
        setState(() => _isSubmittingReview = false);
      }
    }
  }

  NativeAdController _getDetailAdController() {
    return _detailAdController ??= NativeAdController(
      adsManager: ref.read(adsManagerProvider),
      slotId: 'place-detail-${widget.plan.id}',
      placement: AdPlacement.placeDetailInlineBanner,
    );
  }

  @override
  Widget build(BuildContext context) {
    final plan = _plan;
    final apiClient = ref.read(apiClientProvider).valueOrNull;
    final viewData = normalizePlaceDetail(
      basePlan: plan,
      details: _rawDetails,
      buildPhotoUrl: (token) => apiClient?.buildPhotoUrl(token) ?? token,
      seedRelated: widget.relatedSeed
          .map(
            (candidate) => PlaceDetailRelatedItem(
              id: candidate.id,
              sourceId: candidate.sourceId,
              title: candidate.title,
              category: candidate.category,
              source: candidate.source,
              address: candidate.location.address,
              rating: candidate.rating,
              distanceMeters: candidate.distanceMeters,
              photoUrl: candidate.photos?.isNotEmpty == true ? candidate.photos!.first.url : null,
              lat: candidate.location.lat,
              lng: candidate.location.lng,
            ),
          )
          .toList(growable: false),
    );

    final distance = _distanceLabel(plan);

    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Place details')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          _buildPhotoGallery(context, viewData.photos, isLoading: _isLoadingDetails),
          const SizedBox(height: AppSpacing.m),
          Text(viewData.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.xs),
          Text(
            [viewData.category, if (viewData.subcategory?.isNotEmpty == true) viewData.subcategory!, if (viewData.address?.isNotEmpty == true) viewData.address!].join(' • '),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.s),
          Wrap(spacing: AppSpacing.s, runSpacing: AppSpacing.s, children: [
            CategoryPill(category: viewData.category),
            if (viewData.openNow != null) Chip(label: Text(viewData.openNow! ? 'Open now' : 'Closed now')),
            if (distance != null) Chip(label: Text(distance)),
            if (viewData.rating != null) Chip(label: Text('${viewData.rating!.toStringAsFixed(1)} ★${viewData.reviewCount != null ? ' (${viewData.reviewCount})' : ''}')),
            if (_videos.isNotEmpty) Chip(label: Text('${_videos.length} creator videos')),
          ]),
          const SizedBox(height: AppSpacing.m),
          _buildPrimaryActions(context, viewData),
          const SizedBox(height: AppSpacing.m),
          _buildQuickFacts(context, viewData, distance),
          if (viewData.address?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Address',
              child: SelectableText(viewData.address!),
            ),
          ],
          const SizedBox(height: AppSpacing.m),
          _Section(
            title: 'About',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isLoadingDetails && (viewData.effectiveDescription == null))
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    child: LinearProgressIndicator(),
                  )
                else
                  Text(viewData.effectiveDescription ?? 'Explore this place for details and updates.'),
                if (viewData.notableContext?.landmarkType?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: AppSpacing.s),
                  Chip(
                    avatar: const Icon(Icons.location_city_outlined, size: 16),
                    label: Text('Landmark type: ${viewData.notableContext!.landmarkType!}'),
                  ),
                ],
                if (viewData.notableContext?.aliases.isNotEmpty == true) ...[
                  const SizedBox(height: AppSpacing.s),
                  Text('Also known as: ${viewData.notableContext!.aliases.take(3).join(', ')}'),
                ],
              ],
            ),
          ),
          if (viewData.phone?.trim().isNotEmpty == true || viewData.website?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Contact',
              child: Wrap(
                spacing: AppSpacing.s,
                runSpacing: AppSpacing.s,
                children: [
                  if (viewData.phone?.trim().isNotEmpty == true)
                    FilledButton.tonalIcon(
                      onPressed: () => _launchUri(context, Uri.tryParse('tel:${viewData.phone}')),
                      icon: const Icon(Icons.phone_outlined),
                      label: Text(viewData.phone!),
                    ),
                  if (viewData.website?.trim().isNotEmpty == true)
                    FilledButton.tonalIcon(
                      onPressed: () => _launchUri(context, Uri.tryParse(viewData.website!)),
                      icon: const Icon(Icons.public),
                      label: const Text('Website'),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.m),
          _Section(
            title: 'Hours',
            child: viewData.hours.isEmpty
                ? const Text('Hours unavailable')
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: viewData.hours
                        .map(
                          (row) => Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Text(
                              row.label,
                              style: row.isToday ? const TextStyle(fontWeight: FontWeight.w700) : null,
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
          ),
          if (viewData.lat != null && viewData.lng != null) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Map',
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.location_on_outlined),
                title: const Text('View map location'),
                subtitle: Text('${viewData.lat!.toStringAsFixed(5)}, ${viewData.lng!.toStringAsFixed(5)}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _openMaps(context, plan),
              ),
            ),
          ],
          if (viewData.attribution.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Source attribution',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: viewData.attribution
                    .map((item) => Text(
                          item.label ?? (item.provider.toLowerCase() == 'wikidata' ? 'Description from Wikidata' : 'Information provided by trusted partners'),
                        ))
                    .toList(growable: false),
              ),
            ),
          ],
          if (viewData.related.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Related places',
              child: Column(
                children: viewData.related
                    .map(
                      (item) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(item.title),
                        subtitle: Text([item.category, if (item.address != null) item.address!].join(' · ')),
                        leading: item.photoUrl == null
                            ? const CircleAvatar(child: Icon(Icons.place_outlined))
                            : CircleAvatar(backgroundImage: NetworkImage(item.photoUrl!)),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PlanDetailPage(
                              plan: Plan(
                                id: item.id,
                                source: item.source,
                                sourceId: item.sourceId,
                                title: item.title,
                                category: item.category,
                                location: PlanLocation(lat: item.lat ?? plan.location.lat, lng: item.lng ?? plan.location.lng, address: item.address),
                                rating: item.rating,
                                distanceMeters: item.distanceMeters,
                              ),
                              sessionId: widget.sessionId,
                              sessionLat: widget.sessionLat,
                              sessionLng: widget.sessionLng,
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(growable: false),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.m),
          _buildReviewVideosSection(context),
          const SizedBox(height: AppSpacing.m),
          _buildReviewsSection(context),
          const SizedBox(height: AppSpacing.m),
          _buildGallerySection(context, viewData.photos),
          const SizedBox(height: AppSpacing.m),
          NativeAdCard(
            controller: _getDetailAdController(),
            placement: AdPlacement.placeDetailInlineBanner,
          ),
          const SizedBox(height: AppSpacing.m),
          _Section(
            title: 'Trust and source',
            child: Text('Top reviews and creator videos are ranked using trust, moderation, and quality signals. Source attributions are shown for external descriptions and imagery.'),
          ),
          if (_detailsError != null) ...[
            const SizedBox(height: AppSpacing.s),
            Text(_detailsError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
        ],
      ),
    );
  }

  Widget _buildPrimaryActions(BuildContext context, PlaceDetailViewData viewData) {
    return Wrap(
      spacing: AppSpacing.s,
      runSpacing: AppSpacing.s,
      children: [
        FilledButton.icon(
          onPressed: _isSaveBusy ? null : () => _toggleSaved(),
          icon: Icon(_isSaved ? Icons.bookmark : Icons.bookmark_border),
          label: Text(_isSaved ? 'Saved' : 'Save'),
        ),
        FilledButton.tonalIcon(
          onPressed: () {
            _trackPlaceEvent('place_detail_share_tapped', {'placeId': _plan.sourceId});
            _share(_plan);
          },
          icon: const Icon(Icons.share_outlined),
          label: const Text('Share'),
        ),
        FilledButton.tonalIcon(
          onPressed: () {
            _trackPlaceEvent('place_detail_maps_tapped', {'placeId': _plan.sourceId});
            _openMaps(context, _plan);
          },
          icon: const Icon(Icons.map_outlined),
          label: const Text('Open in maps'),
        ),
        if ((viewData.phone ?? _plan.phone)?.isNotEmpty == true)
          OutlinedButton.icon(
            onPressed: () => _launchUri(context, Uri.tryParse('tel:${viewData.phone ?? _plan.phone}')),
            icon: const Icon(Icons.call_outlined),
            label: const Text('Call'),
          ),
        if (viewData.website?.isNotEmpty == true)
          OutlinedButton.icon(
            onPressed: () => _launchUri(context, Uri.tryParse(viewData.website!)),
            icon: const Icon(Icons.language_outlined),
            label: const Text('Website'),
          ),
      ],
    );
  }

  Widget _buildQuickFacts(BuildContext context, PlaceDetailViewData viewData, String? distance) {
    final facts = <({IconData icon, String label, String value})>[
      if (viewData.openNow != null) (icon: Icons.schedule, label: 'Status', value: viewData.openNow! ? 'Open now' : 'Closed now'),
      if (viewData.priceLevel != null) (icon: Icons.payments_outlined, label: 'Price', value: formatPriceLevel(viewData.priceLevel)),
      if (distance != null) (icon: Icons.near_me_outlined, label: 'Distance', value: distance),
      if (viewData.reviewCount != null) (icon: Icons.reviews_outlined, label: 'Reviews', value: '${viewData.reviewCount}'),
      (icon: Icons.video_library_outlined, label: 'Creator videos', value: '${_videos.length}${_isLoadingVideos ? '+' : ''}'),
      (icon: Icons.verified_user_outlined, label: 'Trusted reviews', value: '${_reviews.where((r) => r.trust?.verificationLevel == 'trusted' || r.trust?.verificationLevel == 'trusted_verified').length}'),
    ];

    return _Section(
      title: 'Quick facts',
      child: Column(
        children: facts
            .map((fact) => ListTile(contentPadding: EdgeInsets.zero, dense: true, leading: Icon(fact.icon), title: Text(fact.label), trailing: Text(fact.value)))
            .toList(growable: false),
      ),
    );
  }

  Widget _buildGallerySection(BuildContext context, List<PlaceDetailPhoto> photos) {
    if (photos.length < 2) return const SizedBox.shrink();
    return _Section(
      title: 'Gallery',
      child: SizedBox(
        height: 100,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: photos.length,
          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s),
          itemBuilder: (_, i) => AspectRatio(
            aspectRatio: 1,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: _buildNetworkImage(photos[i].thumbUrl),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _toggleSaved() async {
    setState(() => _isSaveBusy = true);
    final next = !_isSaved;
    setState(() => _isSaved = next);
    _trackPlaceEvent(next ? 'place_detail_save_tapped' : 'place_detail_unsave_tapped', {'placeId': _plan.sourceId});
    await Future<void>.delayed(const Duration(milliseconds: 120));
    if (mounted) {
      setState(() => _isSaveBusy = false);
    }
  }

  Future<void> _trackPlaceEvent(String event, Map<String, Object?> payload) async {
    final telemetryRepository = ref.read(telemetryRepositoryProvider).valueOrNull;
    final dispatcher = ref.read(telemetryDispatcherProvider);
    if (telemetryRepository == null || dispatcher == null) return;
    try {
      await telemetryRepository.enqueueEvent(
        widget.sessionId,
        TelemetryEventInput.cardOpened(
          event: event,
          planId: _plan.id,
          section: payload['section']?.toString(),
          source: _plan.source,
          clientAtISO: DateTime.now().toUtc().toIso8601String(),
        ),
      );
      await dispatcher.notifyEventQueued(widget.sessionId);
    } catch (_) {}
  }

  Widget _buildPhotoGallery(BuildContext context, List<PlaceDetailPhoto> photos, {required bool isLoading}) {
    if (isLoading && photos.isEmpty) {
      return Container(
        height: 220,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (photos.isEmpty) {
      return Container(
        height: 220,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Icon(Icons.photo_library_outlined, size: 56)),
      );
    }

    final selected = photos[_selectedPhotoIndex.clamp(0, photos.length - 1)];
    return Column(
      children: [
        Hero(
          tag: widget.heroTag ?? 'plan-photo-${_plan.id}',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(height: 220, width: double.infinity, child: _buildNetworkImage(selected.heroUrl)),
          ),
        ),
        if (photos.length > 1) ...[
          const SizedBox(height: AppSpacing.s),
          SizedBox(
            height: 84,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s),
              itemBuilder: (_, index) {
                final photo = photos[index];
                final selected = index == _selectedPhotoIndex;
                return GestureDetector(
                  onTap: () => setState(() => _selectedPhotoIndex = index),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: AspectRatio(aspectRatio: 1, child: _buildNetworkImage(photo.thumbUrl)),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
        if (selected.attributionText?.trim().isNotEmpty == true) ...[
          const SizedBox(height: AppSpacing.xs),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Photo: ${selected.attributionText}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ],
    );
  }


  Widget _buildReviewVideosSection(BuildContext context) {
    return _Section(
      title: 'Review Videos',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpacing.s,
            children: [
              for (final option in const ['all', 'creator', 'user', 'trusted', 'verified'])
                ChoiceChip(
                  label: Text(option[0].toUpperCase() + option.substring(1)),
                  selected: _videoFilter == option,
                  onSelected: (selected) {
                    if (!selected || _videoFilter == option) return;
                    setState(() => _videoFilter = option);
                    _loadReviewVideos();
                  },
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.s),
          if (_isLoadingVideos)
            const LinearProgressIndicator(),
          if (_videosError != null)
            Text(_videosError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (!_isLoadingVideos && _videos.isEmpty && _videosError == null)
            const Text('No videos yet.'),
          if (_featuredVideo != null) ...[
            Text('Featured', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            ListTile(
              contentPadding: EdgeInsets.zero,
              onTap: () {
                final index = _videos.indexWhere((item) => item.id == _featuredVideo!.id);
                _openVideoViewer(index < 0 ? 0 : index);
              },
              leading: CircleAvatar(backgroundImage: _featuredVideo!.author.avatarUrl != null ? NetworkImage(_featuredVideo!.author.avatarUrl!) : null),
              title: Text(_featuredVideo!.title?.isNotEmpty == true ? _featuredVideo!.title! : _featuredVideo!.author.displayName),
              subtitle: Text(_featuredVideo!.labels.join(' • ')),
              trailing: const Icon(Icons.play_circle_fill),
            ),
            const SizedBox(height: AppSpacing.s),
          ],
          if (_videos.isNotEmpty)
            SizedBox(
              height: 210,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _videos.length,
                separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s),
                itemBuilder: (context, index) {
                  final video = _videos[index];
                  return SizedBox(
                    width: 220,
                    child: InkWell(
                      onTap: () => _openVideoViewer(index),
                      child: Card(
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(height: 120, width: double.infinity, child: Stack(children: [
                              Positioned.fill(child: _buildNetworkImage(video.previewUrl)),
                              const Positioned.fill(child: Center(child: Icon(Icons.play_circle_outline, size: 36))),
                            ])),
                            Padding(
                              padding: const EdgeInsets.all(AppSpacing.xs),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(video.author.displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
                                Text(video.caption?.isNotEmpty == true ? video.caption! : 'Video review', maxLines: 2, overflow: TextOverflow.ellipsis),
                              ]),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          if (_videoCursor != null)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _isLoadingMoreVideos ? null : () => _loadReviewVideos(append: true),
                child: Text(_isLoadingMoreVideos ? 'Loading…' : 'View more videos'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReviewsSection(BuildContext context) {
    final ratings = _reviews.map((review) => review.rating).whereType<int>().toList(growable: false);
    final average = ratings.isEmpty ? null : ratings.reduce((a, b) => a + b) / ratings.length;

    return _Section(
      title: 'Perbug Reviews',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isLoadingReviews) const LinearProgressIndicator(),
          if (_reviewsError != null)
            Text(_reviewsError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (average != null) ...[
            Text('Average ${average.toStringAsFixed(1)} (${ratings.length})'),
            const SizedBox(height: AppSpacing.s),
          ],
          if (!_isLoadingReviews && _reviews.isEmpty && _reviewsError == null)
            const Text('No Perbug Limited reviews yet. Be the first to review.'),
          ..._reviews.map(
            (review) => Card(
              margin: const EdgeInsets.only(bottom: AppSpacing.s),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.s),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${review.author.displayName}${review.rating == null ? '' : ' • ${review.rating}/5'}')),
                        if (review.trust?.isVerifiedVisit == true)
                          Chip(
                            label: Text(review.trust?.verificationLabel ?? 'Verified Visit'),
                            visualDensity: VisualDensity.compact,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(review.body),
                    const SizedBox(height: 4),
                    Text(
                      _formatReviewDate(review.createdAt),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (review.editedAt != null)
                      Text('Edited', style: Theme.of(context).textTheme.bodySmall),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () async {
                            if (review.viewerHasHelpfulVote) {
                              await ref.read(reviewsRepositoryProvider).valueOrNull?.unvoteHelpful(review.id);
                            } else {
                              await ref.read(reviewsRepositoryProvider).valueOrNull?.voteHelpful(review.id);
                            }
                            await _loadReviews();
                          },
                          child: Text(review.viewerHasHelpfulVote ? 'Helpful ✓' : 'Helpful'),
                        ),
                        Text('${review.helpfulCount}'),
                      ],
                    ),
                    if (review.businessReply != null)
                      Container(
                        margin: const EdgeInsets.only(top: 6),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                        child: Text('Business response: ${review.businessReply!.body}'),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.s),
          Form(
            key: _reviewFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<int>(
                  value: _selectedRating == 0 ? null : _selectedRating,
                  decoration: const InputDecoration(labelText: 'Rating'),
                  items: List.generate(
                    5,
                    (index) => DropdownMenuItem<int>(value: index + 1, child: Text('${index + 1}')),
                  ),
                  onChanged: (value) => setState(() => _selectedRating = value ?? 0),
                  validator: (value) => value == null ? 'Rating is required' : null,
                ),
                const SizedBox(height: AppSpacing.s),
                TextFormField(
                  controller: _displayNameController,
                  decoration: const InputDecoration(labelText: 'Display name (optional)'),
                  enabled: !_anonymous,
                ),
                const SizedBox(height: AppSpacing.s),
                SwitchListTile(
                  title: const Text('Post as anonymous'),
                  value: _anonymous,
                  onChanged: (value) => setState(() => _anonymous = value),
                  contentPadding: EdgeInsets.zero,
                ),
                TextFormField(
                  controller: _reviewTextController,
                  decoration: const InputDecoration(labelText: 'Write your review'),
                  maxLines: 3,
                  validator: (value) {
                    final text = value?.trim() ?? '';
                    if (text.isEmpty) return 'Review text is required';
                    if (text.length < 5) return 'Review must be at least 5 characters';
                    if (text.length > 1000) return 'Review must be less than 1000 characters';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.s),
                FilledButton(
                  onPressed: _isSubmittingReview ? null : _submitReview,
                  child: _isSubmittingReview
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Submit review'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNetworkImage(String url) {
    if (!isHttpUrl(url)) {
      return Container(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: const Center(child: Icon(Icons.photo)),
      );
    }

    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: const Center(child: Icon(Icons.broken_image)),
      ),
      loadingBuilder: (_, child, progress) {
        if (progress == null) {
          return child;
        }
        return Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
      },
    );
  }

  String? _distanceLabel(Plan plan) {
    final fromLat = widget.sessionLat;
    final fromLng = widget.sessionLng;
    if (fromLat == null || fromLng == null) {
      return formatDistanceMeters(plan.distanceMeters);
    }
    final meters = _haversineMeters(fromLat, fromLng, plan.location.lat, plan.location.lng);
    return formatDistanceMeters(meters);
  }

  String _formatReviewDate(DateTime date) {
    final local = date.toLocal();
    final mm = local.month.toString().padLeft(2, '0');
    final dd = local.day.toString().padLeft(2, '0');
    return '${local.year}-$mm-$dd';
  }

  Future<void> _openMaps(BuildContext context, Plan plan) async {
    final mapsRaw = plan.deepLinks?.mapsLink;
    final directUri = mapsRaw == null ? null : Uri.tryParse(mapsRaw);
    if (directUri != null && await canLaunchUrl(directUri)) {
      await launchUrl(directUri, mode: LaunchMode.externalApplication);
      return;
    }

    final fallback = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${plan.location.lat},${plan.location.lng}',
    );
    await _launchUri(context, fallback);
  }

  Future<void> _launchUri(BuildContext context, Uri? uri) async {
    final canUseSchemeOnly = uri?.scheme == 'tel' || uri?.scheme == 'mailto';
    if (uri == null || !uri.hasScheme || (!canUseSchemeOnly && uri.host.isEmpty)) {
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link unavailable.')),
      );
      return;
    }

    final canLaunch = await canLaunchUrl(uri);
    if (!canLaunch) {
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link.')),
      );
      return;
    }

    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _share(Plan plan) async {
    final address = plan.location.address;
    final maps = plan.deepLinks?.mapsLink ??
        'https://www.google.com/maps/search/?api=1&query=${plan.location.lat},${plan.location.lng}';
    final text = [plan.title, if (address != null && address.isNotEmpty) address, maps].join('\n');
    await Share.share(text);
  }
}

Plan mergePlanWithDetails({
  required Plan basePlan,
  required Map<String, dynamic> details,
  required ApiClient apiClient,
}) {
  final detailLat = parseDouble(details['lat']);
  final detailLng = parseDouble(details['lng']);
  final detailAddress = details['address']?.toString();

  final mergedPhotos = _photosFromDetail(details: details, apiClient: apiClient) ?? basePlan.photos;

  final mapsLink = details['googleMapsUri']?.toString() ?? basePlan.deepLinks?.mapsLink;
  final websiteLink = details['websiteUri']?.toString() ?? basePlan.deepLinks?.websiteLink;

  final description = pickDetailDescription(details) ?? basePlan.description;

  return basePlan.copyWith(
    description: description,
    location: PlanLocation(
      lat: detailLat ?? basePlan.location.lat,
      lng: detailLng ?? basePlan.location.lng,
      address: detailAddress ?? basePlan.location.address,
    ),
    rating: parseDouble(details['rating']) ?? basePlan.rating,
    reviewCount: parseInt(details['userRatingCount'] ?? details['reviewCount']) ?? basePlan.reviewCount,
    priceLevel: parseInt(details['priceLevel']) ?? basePlan.priceLevel,
    phone: details['phone']?.toString() ?? basePlan.phone,
    openingHoursText:
        parseOpeningHoursText(details['openingHoursText'] ?? details['openingHours']) ?? basePlan.openingHoursText,
    photos: mergedPhotos,
    deepLinks: (mapsLink?.isNotEmpty == true || websiteLink?.isNotEmpty == true)
        ? PlanDeepLinks(mapsLink: mapsLink, websiteLink: websiteLink)
        : basePlan.deepLinks,
  );
}

String? pickDetailDescription(Map<String, dynamic> details) {
  final candidates = [
    details['description'],
    details['editorialSummary'],
    details['editorialSummary'] is Map<String, dynamic>
        ? (details['editorialSummary'] as Map<String, dynamic>)['text']
        : null,
    details['summary'],
    details['about'],
  ];

  for (final candidate in candidates) {
    final value = candidate?.toString().trim();
    if (value != null && value.isNotEmpty) {
      return value;
    }
  }
  return null;
}

List<PlanPhoto>? _photosFromDetail({
  required Map<String, dynamic> details,
  required ApiClient apiClient,
}) {
  final out = <PlanPhoto>[];
  final photos = details['photos'];
  if (photos is List) {
    for (final raw in photos) {
      if (raw is Map<String, dynamic>) {
        final token = raw['name']?.toString() ?? raw['photoReference']?.toString();
        final url = apiClient.buildPhotoUrl(raw['url']?.toString() ?? token);
        if (url != null && isHttpUrl(url)) {
          out.add(PlanPhoto(url: url, token: token));
        }
      } else {
        final token = raw?.toString();
        final url = apiClient.buildPhotoUrl(token);
        if (url != null && isHttpUrl(url)) {
          out.add(PlanPhoto(url: url, token: token));
        }
      }
    }
  }

  final fallbackUrl = apiClient.buildPhotoUrl(details['photoUrl']?.toString() ?? details['photo']?.toString());
  if (fallbackUrl != null && isHttpUrl(fallbackUrl) && out.every((item) => item.url != fallbackUrl)) {
    out.insert(0, PlanPhoto(url: fallbackUrl, token: details['photo']?.toString()));
  }

  return out.isEmpty ? null : out;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.xs),
        child,
      ],
    );
  }
}

double _haversineMeters(double fromLat, double fromLng, double toLat, double toLng) {
  const radius = 6371000.0;
  final dLat = _degreesToRadians(toLat - fromLat);
  final dLng = _degreesToRadians(toLng - fromLng);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_degreesToRadians(fromLat)) *
          math.cos(_degreesToRadians(toLat)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return radius * c;
}

double _degreesToRadians(double degrees) => degrees * (math.pi / 180);
