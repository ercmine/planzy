import 'package:flutter/material.dart';

import '../core/ads/ad_placement.dart';
import '../core/ads/native_ad_controller.dart';
import '../core/ads/safe_ad_container.dart';

class NativeAdCard extends StatefulWidget {
  const NativeAdCard({
    required this.controller,
    required this.placement,
    super.key,
  });

  final NativeAdController controller;
  final AdPlacement placement;

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
    return SafeAdContainer(
      controller: widget.controller,
      placement: widget.placement,
    );
  }
}
