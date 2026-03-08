import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../app/theme/spacing.dart';
import '../core/ads/native_ad_controller.dart';

class NativeAdCard extends StatefulWidget {
  const NativeAdCard({
    required this.controller,
    this.height = 320,
    super.key,
  });

  final NativeAdController controller;
  final double height;

  @override
  State<NativeAdCard> createState() => _NativeAdCardState();
}

class _NativeAdCardState extends State<NativeAdCard> {
  @override
  void initState() {
    super.initState();
    widget.controller.load();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.m),
          child: ValueListenableBuilder<NativeAdLoadState>(
            valueListenable: widget.controller.state,
            builder: (context, state, _) {
              if (state == NativeAdLoadState.ready && widget.controller.ad != null) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AdWidget(ad: widget.controller.ad!),
                );
              }

              if (state == NativeAdLoadState.failed) {
                return Center(
                  child: TextButton.icon(
                    onPressed: widget.controller.load,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry sponsored card'),
                  ),
                );
              }

              return const Center(child: CircularProgressIndicator());
            },
          ),
        ),
      ),
    );
  }
}
