import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../app/theme/spacing.dart';
import '../../core/format/formatters.dart';
import '../../core/json_parsers.dart';
import '../../core/validation/url.dart';
import '../../models/deep_links.dart';
import '../../models/place_review.dart';
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'widgets/category_pill.dart';

class PlanDetailPage extends ConsumerStatefulWidget {
  const PlanDetailPage({
    required this.plan,
    required this.sessionId,
    this.sessionLat,
    this.sessionLng,
    this.heroTag,
    super.key,
  });

  final Plan plan;
  final String sessionId;
  final double? sessionLat;
  final double? sessionLng;
  final Object? heroTag;

  @override
  ConsumerState<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends ConsumerState<PlanDetailPage> {
  late Plan _plan;
  bool _isLoadingDetails = false;
  String? _detailsError;
  int _selectedPhotoIndex = 0;

  bool _isLoadingReviews = false;
  bool _isSubmittingReview = false;
  String? _reviewsError;
  List<PlaceReview> _reviews = const <PlaceReview>[];

  final _reviewFormKey = GlobalKey<FormState>();
  final _reviewTextController = TextEditingController();
  final _displayNameController = TextEditingController();
  int _selectedRating = 0;
  bool _anonymous = false;

  @override
  void initState() {
    super.initState();
    _plan = widget.plan;
    _loadDetailsIfNeeded();
    _loadReviews();
  }

  @override
  void dispose() {
    _reviewTextController.dispose();
    _displayNameController.dispose();
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
      final detailJson = await apiClient.fetchPlanDetail(_plan.id) ?? await apiClient.fetchPlaceDetail(_plan.sourceId);
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
        _selectedPhotoIndex = 0;
      });
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Plan detail load failed: $error');
      }
      setState(() => _detailsError = 'Could not load extra details.');
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
      setState(() => _reviewsError = 'Could not load reviews.');
    } finally {
      if (mounted) {
        setState(() => _isLoadingReviews = false);
      }
    }
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
        rating: _selectedRating,
        text: text,
        displayName: displayName,
        anonymous: _anonymous,
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

  @override
  Widget build(BuildContext context) {
    final plan = _plan;
    final photos = plan.photos ?? const <PlanPhoto>[];
    final address = plan.location.address;
    final distance = _distanceLabel(plan);
    final description = plan.description?.trim();

    return Scaffold(
      appBar: AppBar(title: const Text('Plan details')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.m),
        children: [
          Text(plan.title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.s),
          Wrap(
            spacing: AppSpacing.s,
            runSpacing: AppSpacing.s,
            children: [
              CategoryPill(category: plan.category),
              if (plan.source.trim().isNotEmpty) Chip(label: Text(plan.source)),
            ],
          ),
          const SizedBox(height: AppSpacing.m),
          _buildPhotoGallery(context, photos),
          const SizedBox(height: AppSpacing.m),
          _Section(
            title: 'Details',
            child: Wrap(
              spacing: AppSpacing.m,
              runSpacing: AppSpacing.s,
              children: [
                if (plan.rating != null)
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(plan.rating!.toStringAsFixed(1)),
                    const SizedBox(width: 4),
                    const Icon(Icons.star, size: 16, color: Colors.amber),
                    if (plan.reviewCount != null) Text(' (${plan.reviewCount})'),
                  ]),
                if (plan.priceLevel != null) Text('Price ${formatPriceLevel(plan.priceLevel)}'),
                if (distance != null) Text(distance),
              ],
            ),
          ),
          if (address != null && address.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Location',
              child: SelectableText(address),
            ),
          ],
          const SizedBox(height: AppSpacing.m),
          _Section(
            title: 'About',
            child: _isLoadingDetails && (description == null || description.isEmpty)
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    child: LinearProgressIndicator(),
                  )
                : Text((description != null && description.isNotEmpty)
                    ? description
                    : 'Description is not provided by this place source.'),
          ),
          if (plan.phone?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(title: 'Phone', child: Text(plan.phone!)),
          ],
          if (plan.openingHoursText?.isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.m),
            _Section(
              title: 'Hours',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: plan.openingHoursText!
                    .map((line) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(line),
                        ))
                    .toList(),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.m),
          _buildReviewsSection(context),
          const SizedBox(height: AppSpacing.m),
          Wrap(
            spacing: AppSpacing.s,
            runSpacing: AppSpacing.s,
            children: [
              FilledButton.icon(
                onPressed: () => _openMaps(context, plan),
                icon: const Icon(Icons.map_outlined),
                label: const Text('Open in Maps'),
              ),
              if (plan.deepLinks?.websiteLink?.isNotEmpty == true)
                FilledButton.tonal(
                  onPressed: () => _launchUri(context, Uri.tryParse(plan.deepLinks!.websiteLink!)),
                  child: const Text('Website'),
                ),
              FilledButton.tonal(
                onPressed: () => _share(plan),
                child: const Text('Share'),
              ),
            ],
          ),
          if (_detailsError != null) ...[
            const SizedBox(height: AppSpacing.s),
            Text(_detailsError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
        ],
      ),
    );
  }

  Widget _buildPhotoGallery(BuildContext context, List<PlanPhoto> photos) {
    if (photos.isEmpty) {
      return Container(
        height: 220,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Icon(Icons.photo, size: 56)),
      );
    }

    final selected = photos[_selectedPhotoIndex.clamp(0, photos.length - 1)];
    return Column(
      children: [
        Hero(
          tag: widget.heroTag ?? 'plan-photo-${_plan.id}',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(height: 220, width: double.infinity, child: _buildNetworkImage(selected.url)),
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
                      child: AspectRatio(
                        aspectRatio: 1,
                        child: _buildNetworkImage(photo.url),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildReviewsSection(BuildContext context) {
    final average = _reviews.isEmpty
        ? null
        : _reviews.map((review) => review.rating).reduce((a, b) => a + b) / _reviews.length;

    return _Section(
      title: 'Perbug Limited Reviews',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isLoadingReviews) const LinearProgressIndicator(),
          if (_reviewsError != null)
            Text(_reviewsError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (average != null) ...[
            Text('Average ${average.toStringAsFixed(1)} (${_reviews.length})'),
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
                    Text('${review.displayName} • ${review.rating}/5'),
                    const SizedBox(height: 4),
                    Text(review.text),
                    const SizedBox(height: 4),
                    Text(
                      _formatReviewDate(review.createdAt),
                      style: Theme.of(context).textTheme.bodySmall,
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
    if (uri == null || !(uri.hasScheme && uri.host.isNotEmpty)) {
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
        ? DeepLinks(mapsLink: mapsLink, websiteLink: websiteLink)
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
