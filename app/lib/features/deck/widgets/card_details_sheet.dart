import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/links/link_types.dart';
import '../../../models/plan.dart';
import '../../../providers/app_providers.dart';

typedef LinkTapCallback = void Function(String linkType);

class CardDetailsSheet extends ConsumerWidget {
  const CardDetailsSheet({
    required this.plan,
    required this.onLinkTap,
    super.key,
  });

  final Plan plan;
  final LinkTapCallback onLinkTap;

  static Future<void> show(
    BuildContext context, {
    required Plan plan,
    required LinkTapCallback onLinkTap,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => CardDetailsSheet(plan: plan, onLinkTap: onLinkTap),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(plan.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: AppSpacing.xs),
              Text(plan.category),
              const SizedBox(height: AppSpacing.m),
              _PhotosCarousel(photos: plan.photos ?? const []),
              if (plan.description != null) ...[
                const SizedBox(height: AppSpacing.m),
                Text(plan.description!),
              ],
              if (plan.location.address != null) ...[
                const SizedBox(height: AppSpacing.s),
                Text(plan.location.address!),
              ],
              const SizedBox(height: AppSpacing.m),
              Wrap(
                spacing: AppSpacing.s,
                runSpacing: AppSpacing.s,
                children: [
                  _LinkButton(
                    text: 'Maps',
                    link: plan.deepLinks?.mapsLink,
                    type: LinkType.maps,
                    planTitle: plan.title,
                    onLinkTap: onLinkTap,
                  ),
                  _LinkButton(
                    text: 'Website',
                    link: plan.deepLinks?.websiteLink,
                    type: LinkType.website,
                    planTitle: plan.title,
                    onLinkTap: onLinkTap,
                  ),
                  _LinkButton(
                    text: 'Call',
                    link: plan.deepLinks?.callLink,
                    type: LinkType.call,
                    planTitle: plan.title,
                    onLinkTap: onLinkTap,
                  ),
                  _LinkButton(
                    text: 'Booking',
                    link: plan.deepLinks?.bookingLink,
                    type: LinkType.booking,
                    planTitle: plan.title,
                    onLinkTap: onLinkTap,
                  ),
                  _LinkButton(
                    text: 'Tickets',
                    link: plan.deepLinks?.ticketLink,
                    type: LinkType.ticket,
                    planTitle: plan.title,
                    onLinkTap: onLinkTap,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.m),
              _SpecialsList(
                metadata: plan.metadata,
                planTitle: plan.title,
                onLinkTap: onLinkTap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotosCarousel extends StatelessWidget {
  const _PhotosCarousel({required this.photos});

  final List<PlanPhoto> photos;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) {
      return Container(
        height: 180,
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.photo_library_outlined),
      );
    }

    return SizedBox(
      height: 220,
      child: PageView.builder(
        itemCount: photos.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: photos[index].url,
                fit: BoxFit.cover,
                placeholder: (context, _) => Container(color: Colors.grey.shade300),
                errorWidget: (context, _, __) => Container(
                  color: Colors.grey.shade300,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _LinkButton extends ConsumerWidget {
  const _LinkButton({
    required this.text,
    required this.link,
    required this.type,
    required this.planTitle,
    required this.onLinkTap,
  });

  final String text;
  final String? link;
  final LinkType type;
  final String planTitle;
  final LinkTapCallback onLinkTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (link == null) {
      return const SizedBox.shrink();
    }

    return FilledButton.tonal(
      onPressed: () async {
        onLinkTap(type.name);
        await ref.read(linkLauncherProvider).openLink(
              context,
              uri: Uri.parse(link!),
              type: type,
              planTitle: planTitle,
            );
      },
      child: Text(text),
    );
  }
}

class _SpecialsList extends ConsumerWidget {
  const _SpecialsList({
    required this.metadata,
    required this.planTitle,
    required this.onLinkTap,
  });

  final Map<String, dynamic>? metadata;
  final String planTitle;
  final LinkTapCallback onLinkTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final specials = (metadata?['specials'] as List<dynamic>? ?? const [])
        .whereType<Map<dynamic, dynamic>>()
        .take(2)
        .map((entry) => entry.map((key, value) => MapEntry('$key', value)))
        .toList();

    if (specials.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Specials', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.s),
        ...specials.map(
          (special) => Card(
            child: ListTile(
              title: Text((special['headline'] as String?) ?? 'Offer'),
              subtitle: Text(
                [
                  (special['details'] as String?) ?? '',
                  if ((special['couponCode'] as String?) != null)
                    'Code: ${special['couponCode']}',
                ].where((value) => value.isNotEmpty).join('\n'),
              ),
              trailing: (special['bookingLink'] as String?) == null
                  ? null
                  : TextButton(
                      onPressed: () async {
                        final link = special['bookingLink'] as String;
                        onLinkTap(LinkType.booking.name);
                        await ref.read(linkLauncherProvider).openLink(
                              context,
                              uri: Uri.parse(link),
                              type: LinkType.booking,
                              planTitle: planTitle,
                            );
                      },
                      child: const Text('Book'),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
