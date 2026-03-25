import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../app/theme/tokens.dart';
import '../../app/theme/widgets.dart';
import 'map_discovery_models.dart';
import 'place_preview_card.dart';

class CollapsibleMapOverlay extends StatelessWidget {
  const CollapsibleMapOverlay({
    super.key,
    required this.title,
    required this.isCollapsed,
    required this.onToggle,
    required this.child,
    this.collapsedChild,
    this.trailing,
    this.padding = const EdgeInsets.all(12),
    this.icon,
    this.iconOnlyWhenCollapsed = false,
  });

  final String title;
  final bool isCollapsed;
  final VoidCallback onToggle;
  final Widget child;
  final Widget? collapsedChild;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;
  final IconData? icon;
  final bool iconOnlyWhenCollapsed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (isCollapsed && iconOnlyWhenCollapsed && icon != null) {
      return AppCard(
        glow: true,
        tone: AppCardTone.featured,
        padding: const EdgeInsets.all(6),
        child: IconButton(
          tooltip: 'Expand $title',
          onPressed: onToggle,
          icon: Icon(icon, size: 20),
          visualDensity: VisualDensity.compact,
        ),
      );
    }

    return AppCard(
      glow: true,
      tone: AppCardTone.featured,
      padding: padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
              ),
              if (trailing != null) ...[
                trailing!,
                const SizedBox(width: 8),
              ],
              IconButton(
                tooltip: isCollapsed ? 'Expand $title' : 'Collapse $title',
                onPressed: onToggle,
                icon: Icon(isCollapsed ? Icons.expand_more_rounded : Icons.expand_less_rounded),
              ),
            ],
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState: isCollapsed ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: child,
            secondChild: Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: collapsedChild ??
                    Text(
                      '$title collapsed',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class DiscoverySearchBar extends StatelessWidget {
  const DiscoverySearchBar({
    super.key,
    required this.controller,
    required this.onSubmit,
    required this.onRecenter,
    required this.onOpenSortSheet,
    required this.isLoading,
    required this.locationEnabled,
    this.areaLabel,
  });

  final TextEditingController controller;
  final VoidCallback onSubmit;
  final VoidCallback onRecenter;
  final VoidCallback onOpenSortSheet;
  final bool isLoading;
  final bool locationEnabled;
  final String? areaLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => onSubmit(),
                decoration: InputDecoration(
                  hintText: 'Search neighborhoods, landmarks, or a specific place',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: isLoading
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : IconButton(
                          tooltip: 'Search map',
                          onPressed: onSubmit,
                          icon: const Icon(Icons.arrow_forward_rounded),
                        ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _CircleActionButton(
              tooltip: locationEnabled ? 'Center on my location' : 'Enable location',
              icon: locationEnabled ? Icons.my_location_rounded : Icons.location_searching_rounded,
              onTap: onRecenter,
            ),
            const SizedBox(width: 8),
            _CircleActionButton(
              tooltip: 'Change sort',
              icon: Icons.tune_rounded,
              onTap: onOpenSortSheet,
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Text(
                areaLabel ?? 'Explore the map to surface the best nearby places.',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
            if (areaLabel != null)
              AppPill(
                label: 'Live area',
                icon: Icons.explore_rounded,
                backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
              ),
          ],
        ),
      ],
    );
  }
}

class DiscoveryFilterChips extends StatelessWidget {
  const DiscoveryFilterChips({
    super.key,
    required this.filters,
    required this.selectedIds,
    required this.onToggle,
  });

  final List<MapFilterOption> filters;
  final Set<String> selectedIds;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 46,
      child: ScrollConfiguration(
        behavior: const MaterialScrollBehavior().copyWith(
          dragDevices: {
            PointerDeviceKind.touch,
            PointerDeviceKind.mouse,
            PointerDeviceKind.stylus,
            PointerDeviceKind.invertedStylus,
            PointerDeviceKind.unknown,
          },
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              for (var index = 0; index < filters.length; index++) ...[
                if (index > 0) const SizedBox(width: 8),
                Builder(
                  builder: (context) {
                    final filter = filters[index];
                    final selected = selectedIds.contains(filter.id);
                    return FilterChip(
                      selected: selected,
                      onSelected: (_) => onToggle(filter.id),
                      avatar: filter.icon == null ? null : Icon(filter.icon, size: 16),
                      label: Text(filter.label),
                      labelStyle: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      showCheckmark: false,
                      side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.45)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class SearchAreaButton extends StatelessWidget {
  const SearchAreaButton({
    super.key,
    required this.visible,
    required this.onPressed,
    required this.isLoading,
    required this.resultCount,
  });

  final bool visible;
  final VoidCallback onPressed;
  final bool isLoading;
  final int resultCount;

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      duration: const Duration(milliseconds: 220),
      offset: visible ? Offset.zero : const Offset(0, -1.4),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 220),
        opacity: visible ? 1 : 0,
        child: FilledButton.icon(
          onPressed: isLoading ? null : onPressed,
          icon: isLoading
              ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.travel_explore_rounded),
          label: Text(resultCount > 0 ? 'Search this area • $resultCount spots' : 'Search this area'),
        ),
      ),
    );
  }
}

class PulsingSearchAreaButton extends StatefulWidget {
  const PulsingSearchAreaButton({
    super.key,
    required this.onPressed,
    required this.isLoading,
  });

  final VoidCallback onPressed;
  final bool isLoading;

  @override
  State<PulsingSearchAreaButton> createState() => _PulsingSearchAreaButtonState();
}

class _PulsingSearchAreaButtonState extends State<PulsingSearchAreaButton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat(reverse: true);
    _scale = Tween<double>(begin: 0.96, end: 1.04).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: FilledButton.icon(
        onPressed: widget.isLoading ? null : widget.onPressed,
        icon: widget.isLoading
            ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.radar_rounded),
        label: const Text('Pulse this area'),
      ),
    );
  }
}

class DiscoveryCountPill extends StatelessWidget {
  const DiscoveryCountPill({super.key, required this.count, required this.label});

  final int count;
  final String label;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.kpi,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.place_rounded, size: 18),
          const SizedBox(width: 8),
          Text('$count $label', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class NearbyPlacesSheet extends StatelessWidget {
  const NearbyPlacesSheet({
    super.key,
    required this.places,
    required this.selectedPlaceId,
    required this.onPlaceSelected,
    required this.onOpenPlace,
    required this.onToggleSave,
    required this.onReview,
    required this.onDirections,
    required this.onShare,
    required this.savedPlaceIds,
    required this.countLabel,
    required this.sort,
    required this.onOpenSortSheet,
    required this.loading,
    required this.emptyState,
    required this.permissionState,
    required this.errorState,
    required this.collectionSummary,
    required this.distanceLabelFor,
    required this.badgesFor,
  });

  final List<MapPin> places;
  final String? selectedPlaceId;
  final ValueChanged<MapPin> onPlaceSelected;
  final ValueChanged<MapPin> onOpenPlace;
  final ValueChanged<MapPin> onToggleSave;
  final ValueChanged<MapPin> onReview;
  final ValueChanged<MapPin> onDirections;
  final ValueChanged<MapPin> onShare;
  final Set<String> savedPlaceIds;
  final String countLabel;
  final MapDiscoverySort sort;
  final VoidCallback onOpenSortSheet;
  final bool loading;
  final Widget? emptyState;
  final Widget? permissionState;
  final Widget? errorState;
  final String? collectionSummary;
  final String? Function(MapPin place) distanceLabelFor;
  final List<PlaceBadge> Function(MapPin place) badgesFor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DraggableScrollableSheet(
      initialChildSize: 0.22,
      minChildSize: 0.14,
      maxChildSize: 0.82,
      snap: true,
      snapSizes: const [0.22, 0.46, 0.82],
      builder: (context, scrollController) {
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                theme.colorScheme.surface.withOpacity(0.98),
                theme.colorScheme.surfaceContainerLow.withOpacity(0.94),
              ],
            ),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(color: theme.colorScheme.shadow.withOpacity(0.22), blurRadius: 24, offset: const Offset(0, -10)),
            ],
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 5,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Nearby discovery', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                              const SizedBox(height: 2),
                              Text(countLabel, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: onOpenSortSheet,
                          icon: const Icon(Icons.swap_vert_rounded),
                          label: Text(_sortLabel(sort)),
                        ),
                      ],
                    ),
                    if (collectionSummary != null) ...[
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: AppPill(
                          label: collectionSummary!,
                          icon: Icons.collections_bookmark_outlined,
                          backgroundColor: theme.colorScheme.secondary.withOpacity(0.14),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Expanded(
                child: Builder(
                  builder: (context) {
                    if (permissionState != null) return permissionState!;
                    if (errorState != null) return errorState!;
                    if (emptyState != null) return emptyState!;
                    return ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      itemCount: places.length + (loading ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= places.length) {
                          return const LinearProgressIndicator();
                        }
                        final place = places[index];
                        final selected = place.canonicalPlaceId == selectedPlaceId;
                        return _PlaceListCard(
                          place: place,
                          selected: selected,
                          saved: savedPlaceIds.contains(place.canonicalPlaceId),
                          distanceLabel: distanceLabelFor(place),
                          badges: badgesFor(place),
                          onTap: () => onPlaceSelected(place),
                          onOpen: () => onOpenPlace(place),
                          onSave: () => onToggleSave(place),
                          onReview: () => onReview(place),
                          onDirections: () => onDirections(place),
                          onShare: () => onShare(place),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static String _sortLabel(MapDiscoverySort sort) {
    switch (sort) {
      case MapDiscoverySort.distance:
        return 'Distance';
      case MapDiscoverySort.rating:
        return 'Rating';
      case MapDiscoverySort.trending:
        return 'Trending';
      case MapDiscoverySort.activity:
        return 'Activity';
      case MapDiscoverySort.relevance:
        return 'Relevant';
    }
  }
}

class DiscoveryStateCard extends StatelessWidget {
  const DiscoveryStateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.actions = const <Widget>[],
  });

  final IconData icon;
  final String title;
  final String body;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: AppCard(
          tone: AppCardTone.featured,
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 36, color: theme.colorScheme.primary),
              const SizedBox(height: 12),
              Text(title, textAlign: TextAlign.center, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(body, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
              if (actions.isNotEmpty) ...[
                const SizedBox(height: 16),
                Wrap(alignment: WrapAlignment.center, spacing: 12, runSpacing: 12, children: actions),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class SelectedPlacePeekCard extends StatelessWidget {
  const SelectedPlacePeekCard({
    super.key,
    required this.place,
    required this.proximityState,
    required this.distanceMeters,
    required this.onOpenDetails,
    required this.onSave,
    required this.onShare,
    required this.onOpenMaps,
    required this.saved,
  });

  final MapPin place;
  final PlaceProximityState proximityState;
  final double? distanceMeters;
  final VoidCallback onOpenDetails;
  final VoidCallback onSave;
  final VoidCallback onShare;
  final VoidCallback onOpenMaps;
  final bool saved;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: PlacePreviewCard(
        place: place,
        proximityState: proximityState,
        distanceMeters: distanceMeters,
        saved: saved,
        onOpenDetails: onOpenDetails,
        onSave: onSave,
        onShare: onShare,
        onOpenMaps: onOpenMaps,
      ),
    );
  }
}

class _PlaceListCard extends StatelessWidget {
  const _PlaceListCard({
    required this.place,
    required this.selected,
    required this.saved,
    required this.distanceLabel,
    required this.badges,
    required this.onTap,
    required this.onOpen,
    required this.onSave,
    required this.onReview,
    required this.onDirections,
    required this.onShare,
  });

  final MapPin place;
  final bool selected;
  final bool saved;
  final String? distanceLabel;
  final List<PlaceBadge> badges;
  final VoidCallback onTap;
  final VoidCallback onOpen;
  final VoidCallback onSave;
  final VoidCallback onReview;
  final VoidCallback onDirections;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedContainer(
      duration: AppMotion.standard,
      curve: AppMotion.decelerate,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: selected ? theme.colorScheme.primary.withOpacity(0.7) : theme.colorScheme.outlineVariant.withOpacity(0.35),
          width: selected ? 1.4 : 1,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.surfaceContainerLow.withOpacity(selected ? 0.99 : 0.94),
            (selected ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest).withOpacity(selected ? 0.12 : 0.08),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: (selected ? theme.colorScheme.primary : Colors.black).withOpacity(selected ? 0.12 : 0.06),
            blurRadius: selected ? 18 : 12,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      width: 76,
                      height: 76,
                      child: place.thumbnailUrl?.isNotEmpty == true
                          ? CachedNetworkImage(imageUrl: place.thumbnailUrl!, fit: BoxFit.cover)
                          : DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    theme.colorScheme.primary.withOpacity(0.16),
                                    theme.colorScheme.secondary.withOpacity(0.14),
                                  ],
                                ),
                              ),
                              child: const Icon(Icons.photo_camera_back_outlined),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                place.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ),
                            if (saved) const Icon(Icons.bookmark_rounded, size: 18),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${place.categoryLabel} • ${place.neighborhoodLabel}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            AppPill(label: '★ ${place.rating.toStringAsFixed(1)}', icon: Icons.star_rounded),
                            if (distanceLabel != null) AppPill(label: distanceLabel!, icon: Icons.route_rounded, outlined: true),
                            if (place.openNow == true)
                              AppPill(
                                label: 'Open now',
                                icon: Icons.schedule_rounded,
                                backgroundColor: theme.colorScheme.tertiary.withOpacity(0.15),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (badges.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: badges.take(4).map((badge) => _BadgePill(badge: badge)).toList(growable: false),
                ),
              ],
              if ((place.descriptionSnippet ?? '').isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  place.descriptionSnippet!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _MiniAction(icon: saved ? Icons.bookmark_added_rounded : Icons.bookmark_border_rounded, label: saved ? 'Saved' : 'Save', onTap: onSave),
                        _MiniAction(icon: Icons.rate_review_outlined, label: 'Review', onTap: onReview),
                        _MiniAction(icon: Icons.directions_outlined, label: 'Directions', onTap: onDirections),
                        _MiniAction(icon: Icons.share_outlined, label: 'Share', onTap: onShare),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(onPressed: onOpen, child: const Text('Open')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgePill extends StatelessWidget {
  const _BadgePill({required this.badge});

  final PlaceBadge badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color background;
    final Color foreground;
    if (badge.tone == MapBadgeTone.brand) {
      background = theme.colorScheme.primary.withOpacity(0.14);
      foreground = theme.colorScheme.primary;
    } else if (badge.tone == MapBadgeTone.success) {
      background = theme.colorScheme.tertiary.withOpacity(0.16);
      foreground = theme.colorScheme.tertiary;
    } else if (badge.tone == MapBadgeTone.warning) {
      background = theme.colorScheme.secondary.withOpacity(0.18);
      foreground = theme.colorScheme.secondary;
    } else {
      background = theme.colorScheme.surfaceContainerHighest;
      foreground = theme.colorScheme.onSurface;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(999)),
      child: Text(badge.label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: foreground, fontWeight: FontWeight.w700)),
    );
  }
}

class _MiniAction extends StatelessWidget {
  const _MiniAction({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(avatar: Icon(icon, size: 16), label: Text(label), onPressed: onTap);
  }
}

class _CircleActionButton extends StatelessWidget {
  const _CircleActionButton({required this.icon, required this.onTap, required this.tooltip});

  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Tooltip(
      message: tooltip,
      child: Material(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            width: 50,
            height: 50,
            child: Icon(icon),
          ),
        ),
      ),
    );
  }
}
