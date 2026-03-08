import 'package:flutter/material.dart';

enum AdPlacement {
  resultsInlineBanner,
  resultsFooterBanner,
  deckInlineNative,
  placeDetailInlineBanner,
  placeDetailFooterBanner,
  homeFeedInlineBanner,
  creatorFeedInlineBanner,
  bookmarksInlineBanner,
  guidePageInlineBanner,
  cityPageInlineBanner,
  trendingInlineBanner,
}

enum AdFormat { native, banner }

@immutable
class AdSlotConfig {
  const AdSlotConfig({
    required this.placement,
    required this.format,
    required this.minHeight,
    required this.maxHeight,
    required this.insetPadding,
    required this.reserveSpaceOnFailure,
    this.firstAdAfterItem,
    this.frequency,
    this.maxAdsPerWindow,
    this.adsWindowSize,
  });

  final AdPlacement placement;
  final AdFormat format;
  final double minHeight;
  final double maxHeight;
  final EdgeInsets insetPadding;
  final bool reserveSpaceOnFailure;
  final int? firstAdAfterItem;
  final int? frequency;
  final int? maxAdsPerWindow;
  final int? adsWindowSize;

  double resolveHeight(double availableWidth) {
    final responsive = availableWidth * 0.55;
    return responsive.clamp(minHeight, maxHeight);
  }
}

class AdPlacements {
  const AdPlacements._();

  static const Map<AdPlacement, AdSlotConfig> configs = {
    AdPlacement.resultsInlineBanner: AdSlotConfig(
      placement: AdPlacement.resultsInlineBanner,
      format: AdFormat.native,
      minHeight: 180,
      maxHeight: 320,
      insetPadding: EdgeInsets.all(12),
      reserveSpaceOnFailure: false,
      firstAdAfterItem: 3,
      frequency: 8,
      maxAdsPerWindow: 3,
      adsWindowSize: 50,
    ),
    AdPlacement.deckInlineNative: AdSlotConfig(
      placement: AdPlacement.deckInlineNative,
      format: AdFormat.native,
      minHeight: 220,
      maxHeight: 360,
      insetPadding: EdgeInsets.all(12),
      reserveSpaceOnFailure: false,
      firstAdAfterItem: 3,
      frequency: 8,
      maxAdsPerWindow: 3,
      adsWindowSize: 50,
    ),
    AdPlacement.placeDetailInlineBanner: AdSlotConfig(
      placement: AdPlacement.placeDetailInlineBanner,
      format: AdFormat.native,
      minHeight: 180,
      maxHeight: 300,
      insetPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      reserveSpaceOnFailure: false,
    ),
  };

  static AdSlotConfig of(AdPlacement placement) {
    return configs[placement] ??
        const AdSlotConfig(
          placement: AdPlacement.resultsInlineBanner,
          format: AdFormat.native,
          minHeight: 180,
          maxHeight: 320,
          insetPadding: EdgeInsets.all(12),
          reserveSpaceOnFailure: false,
        );
  }
}
