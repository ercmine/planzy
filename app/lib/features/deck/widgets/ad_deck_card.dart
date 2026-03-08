import 'package:flutter/material.dart';

import '../../../core/ads/ad_placement.dart';
import '../../../core/ads/native_ad_controller.dart';
import '../../../core/ads/safe_ad_container.dart';

class AdDeckCard extends StatefulWidget {
  const AdDeckCard({
    required this.controller,
    super.key,
  });

  final NativeAdController controller;

  @override
  State<AdDeckCard> createState() => _AdDeckCardState();
}

class _AdDeckCardState extends State<AdDeckCard> {
  @override
  void initState() {
    super.initState();
    widget.controller.load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeAdContainer(
      controller: widget.controller,
      placement: AdPlacement.deckInlineNative,
    );
  }
}
