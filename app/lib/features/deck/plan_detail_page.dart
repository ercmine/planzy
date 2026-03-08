import 'dart:math' as math;

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
import '../../models/plan.dart';
import '../../providers/app_providers.dart';
import 'widgets/category_pill.dart';

class PlanDetailPage extends ConsumerStatefulWidget {
  const PlanDetailPage({
    required this.plan,
    required this.sessionId,
    this.sessionLat,
    this.sessionLng,
    super.key,
  });

  final Plan plan;
  final String sessionId;
  final double? sessionLat;
  final double? sessionLng;

  @override
  ConsumerState<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends ConsumerState<PlanDetailPage> {
  late Plan _plan;
  bool _isLoadingDetails = false;

  @override
  void initState() {
    super.initState();
    _plan = widget.plan;
    _loadDetailsIfNeeded();
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

    setState(() => _isLoadingDetails = true);
    try {
      final detailJson = await apiClient.fetchPlanDetail(_plan.id) ??
          await apiClient.fetchPlaceDetail(_plan.sourceId);
      if (!mounted || detailJson == null) {
        return;
      }
      final merged = _mergePlanWithDetails(
        basePlan: _plan,
        details: detailJson,
        apiClient: apiClient,
      );
      setState(() => _plan = merged);
    } catch (_) {
      // Fall back to existing plan data; page remains usable.
    } finally {
      if (mounted) {
        setState(() => _isLoadingDetails = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final plan = _plan;
    final photos = plan.photos ?? const <PlanPhoto>[];
    final address = plan.location.address;
    final distance = _distanceLabel(plan);

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
          _buildHeroPhoto(context, photos),
          if (photos.length > 1) ...[
            const SizedBox(height: AppSpacing.s),
            SizedBox(
              height: 84,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: photos.length,
                separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.s),
                itemBuilder: (_, index) {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: _buildNetworkImage(photos[index].url),
                    ),
                  );
                },
              ),
            ),
          ],
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
                if (plan.priceLevel != null)
                  Text('Price ${formatPriceLevel(plan.priceLevel)}'),
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
            child: Text(
              plan.description?.trim().isNotEmpty == true
                  ? plan.description!
                  : 'No description available yet.',
            ),
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
          if (_isLoadingDetails) ...[
            const SizedBox(height: AppSpacing.m),
            const LinearProgressIndicator(),
          ],
        ],
      ),
    );
  }

  Widget _buildHeroPhoto(BuildContext context, List<PlanPhoto> photos) {
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

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(height: 220, child: _buildNetworkImage(photos.first.url)),
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

Plan _mergePlanWithDetails({
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

  return basePlan.copyWith(
    description: details['description']?.toString() ?? basePlan.description,
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
        parseOpeningHoursText(details['openingHoursText'] ?? details['openingHours']) ??
            basePlan.openingHoursText,
    photos: mergedPhotos,
    deepLinks: (mapsLink?.isNotEmpty == true || websiteLink?.isNotEmpty == true)
        ? DeepLinks(mapsLink: mapsLink, websiteLink: websiteLink)
        : basePlan.deepLinks,
  );
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
