import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/links/link_launcher.dart';
import '../../../core/links/link_types.dart';
import '../../../models/plan.dart';
import '../../../providers/app_providers.dart';
import '../../ideas/widgets/friend_idea_badge.dart';
import 'category_pill.dart';

class CardDetailsSheet extends ConsumerWidget {
  const CardDetailsSheet({
    required this.plan,
    required this.onLinkTap,
    super.key,
  });

  final Plan plan;
  final Future<void> Function({required Plan plan, required String linkType}) onLinkTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final launcher = ref.watch(linkLauncherProvider);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(plan.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: AppSpacing.s),
            Wrap(
              spacing: AppSpacing.s,
              runSpacing: AppSpacing.s,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                CategoryPill(category: plan.category),
                if (isFriendIdea(plan)) const FriendIdeaBadge(),
              ],
            ),
            if (isFriendIdea(plan)) ...[
              const SizedBox(height: AppSpacing.s),
              MaterialBanner(
                content: const Text('Added by someone in your session'),
                leading: const Icon(Icons.groups_2_outlined),
                actions: const [SizedBox.shrink()],
              ),
            ],
            const SizedBox(height: AppSpacing.m),
            if ((plan.photos ?? const <PlanPhoto>[]).isNotEmpty)
              SizedBox(
                height: 220,
                child: PageView.builder(
                  itemCount: plan.photos!.length,
                  itemBuilder: (_, index) {
                    final photo = plan.photos![index];
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: photo.url,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
                      ),
                    );
                  },
                ),
              ),
            if (plan.description?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.m),
              Text(plan.description!),
            ],
            if (plan.location.address?.isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.m),
              Text(plan.location.address!),
            ],
            const SizedBox(height: AppSpacing.m),
            Wrap(
              spacing: AppSpacing.s,
              runSpacing: AppSpacing.s,
              children: _buildLinkButtons(context, launcher),
            ),
            ..._buildSpecials(context, launcher),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildLinkButtons(BuildContext context, LinkLauncher launcher) {
    final links = plan.deepLinks;
    final widgets = <Widget>[];

    void addButton(String label, LinkType type, String? rawUrl) {
      if (rawUrl == null || rawUrl.isEmpty) {
        return;
      }
      widgets.add(
        FilledButton.tonal(
          onPressed: () async {
            await onLinkTap(plan: plan, linkType: label.toLowerCase());
            if (!context.mounted) {
              return;
            }
            await launcher.openLink(
              context,
              uri: Uri.parse(rawUrl),
              type: type,
              planTitle: plan.title,
            );
          },
          child: Text(label),
        ),
      );
    }

    final mapsLink = links?.mapsLink ?? _fallbackMapsLink();

    addButton('Maps', LinkType.maps, mapsLink);
    addButton('Website', LinkType.website, links?.websiteLink);
    addButton('Call', LinkType.call, links?.callLink);
    addButton('Booking', LinkType.booking, links?.bookingLink);
    addButton('Tickets', LinkType.ticket, links?.ticketLink);

    return widgets;
  }

  String _fallbackMapsLink() {
    final address = plan.location.address;
    if (address != null && address.isNotEmpty) {
      return 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}';
    }

    return 'https://www.google.com/maps/search/?api=1&query=${plan.location.lat},${plan.location.lng}';
  }

  List<Widget> _buildSpecials(BuildContext context, LinkLauncher launcher) {
    final specialsRaw = plan.metadata?['specials'];
    if (specialsRaw is! List || specialsRaw.isEmpty) {
      return const <Widget>[];
    }

    final topSpecials = specialsRaw.take(2).toList(growable: false);

    return [
      const SizedBox(height: AppSpacing.l),
      Text('Specials', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: AppSpacing.s),
      ...topSpecials.map((dynamic item) {
        if (item is! Map) {
          return const SizedBox.shrink();
        }
        final headline = item['headline']?.toString() ?? 'Special offer';
        final details = item['details']?.toString();
        final couponCode = item['couponCode']?.toString();
        final bookingLink = item['bookingLink']?.toString();

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.m),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(headline, style: Theme.of(context).textTheme.titleSmall),
                if (details != null && details.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(details),
                ],
                if (couponCode != null && couponCode.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text('Code: $couponCode'),
                ],
                if (bookingLink != null && bookingLink.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s),
                  OutlinedButton(
                    onPressed: () async {
                      await onLinkTap(plan: plan, linkType: 'booking');
                      if (!context.mounted) {
                        return;
                      }
                      await launcher.openLink(
                        context,
                        uri: Uri.parse(bookingLink),
                        type: LinkType.booking,
                        planTitle: plan.title,
                      );
                    },
                    child: const Text('Book special'),
                  ),
                ],
              ],
            ),
          ),
        );
      }),
    ];
  }
}
