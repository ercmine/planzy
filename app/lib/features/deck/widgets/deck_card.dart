import 'package:cached_network_image/cached_network_image.dart';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/format/formatters.dart';
import '../../../models/plan.dart';
import '../../ideas/widgets/friend_idea_badge.dart';
import 'category_pill.dart';
import 'price_pill.dart';
import 'rating_row.dart';
import 'specials_badge.dart';
import 'sponsored_badge.dart';

class DeckCard extends StatefulWidget {
  const DeckCard({
    required this.plan,
    required this.onTap,
    this.prefetchImageUrls = const <String>[],
    this.isTopCard = false,
    super.key,
  });

  final Plan plan;
  final VoidCallback onTap;
  final List<String> prefetchImageUrls;
  final bool isTopCard;

  @override
  State<DeckCard> createState() => _DeckCardState();
}

class _DeckCardState extends State<DeckCard> {
  static final Set<String> _prefetchedForPlan = <String>{};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _prefetchUpcoming();
  }

  @override
  void didUpdateWidget(covariant DeckCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.plan.id != widget.plan.id || oldWidget.isTopCard != widget.isTopCard) {
      _prefetchUpcoming();
    }
  }

  void _prefetchUpcoming() {
    if (!widget.isTopCard || _prefetchedForPlan.contains(widget.plan.id)) {
      return;
    }
    _prefetchedForPlan.add(widget.plan.id);
    for (final url in widget.prefetchImageUrls.take(2)) {
      precacheImage(NetworkImage(url), context);
    }
  }

  bool get _isSponsored =>
      widget.plan.metadata?['sponsored'] == true || widget.plan.source.toLowerCase() == 'promoted';

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;
    final distance = formatDistanceMeters(plan.distanceMeters);
    final rating = formatRating(plan.rating, plan.reviewCount);
    final price = formatPriceLevel(plan.priceLevel);

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: Card(
        key: ValueKey(plan.id),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: widget.onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (plan.photos?.firstOrNull != null)
                      CachedNetworkImage(
                        imageUrl: plan.photos!.first.url,
                        fit: BoxFit.cover,
                        memCacheWidth: 800,
                        placeholder: (_, __) => ColoredBox(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        ),
                        errorWidget: (_, __, ___) => const SizedBox.shrink(),
                      )
                    else
                      Container(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        child: const Icon(Icons.photo, size: 56),
                      ),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.center,
                          colors: [Color(0x7A000000), Colors.transparent],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.m),
                child: _CardMeta(
                  plan: plan,
                  distance: distance,
                  price: price,
                  rating: rating,
                  isSponsored: _isSponsored,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardMeta extends StatelessWidget {
  const _CardMeta({
    required this.plan,
    required this.distance,
    required this.price,
    required this.rating,
    required this.isSponsored,
  });

  final Plan plan;
  final String distance;
  final String price;
  final String rating;
  final bool isSponsored;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          plan.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpacing.s),
        Wrap(
          spacing: AppSpacing.s,
          runSpacing: AppSpacing.s,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            CategoryPill(category: plan.category),
            if (distance.isNotEmpty) Text(distance),
            PricePill(label: price),
            RatingRow(text: rating),
            if (plan.hours?.openNow == true)
              const Text('Open now')
            else if (plan.hours?.openNow == false)
              const Text('Closed'),
            if (isFriendIdea(plan)) const FriendIdeaBadge(),
            if (isSponsored) const SponsoredBadge(),
            if (plan.hasSpecials) const SpecialsBadge(),
            if (plan.isVenueLike) const _ClaimBadge(),
          ],
        ),
      ],
    );
  }
}

class _ClaimBadge extends StatelessWidget {
  const _ClaimBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text('Claim'),
    );
  }
}
