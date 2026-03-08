import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../app/theme/spacing.dart';
import 'ad_placement.dart';
import 'native_ad_controller.dart';

class SafeAdContainer extends StatelessWidget {
  const SafeAdContainer({
    required this.controller,
    required this.placement,
    super.key,
  });

  final NativeAdController controller;
  final AdPlacement placement;

  @override
  Widget build(BuildContext context) {
    final config = AdPlacements.of(placement);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.sizeOf(context).width;
        final height = config.resolveHeight(width);

        return ValueListenableBuilder<NativeAdLoadState>(
          valueListenable: controller.state,
          builder: (context, state, _) {
            if (state == NativeAdLoadState.hidden) {
              return const SizedBox.shrink();
            }
            if (state == NativeAdLoadState.failed) {
              return config.reserveSpaceOnFailure
                  ? const SizedBox(height: 24)
                  : const SizedBox.shrink();
            }
            return ConstrainedBox(
              constraints: BoxConstraints(minHeight: height, maxHeight: height),
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: config.insetPadding,
                  child: _buildChild(state, height),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildChild(NativeAdLoadState state, double height) {
    if (state == NativeAdLoadState.ready && controller.ad != null) {
      return SizedBox.expand(
        child: ClipRect(child: AdWidget(ad: controller.ad!)),
      );
    }
    return const Center(
      child: SizedBox(
        width: AppSpacing.l,
        height: AppSpacing.l,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }
}
