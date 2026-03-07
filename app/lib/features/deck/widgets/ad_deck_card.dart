import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/ads/native_ad_controller.dart';

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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.m),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Text('Ad'),
                ),
                const SizedBox(width: AppSpacing.s),
                IconButton(
                  tooltip: 'Why am I seeing this?',
                  onPressed: () => _showWhy(context),
                  icon: const Icon(Icons.info_outline),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s),
            ValueListenableBuilder<NativeAdLoadState>(
              valueListenable: widget.controller.state,
              builder: (context, state, _) {
                if (state == NativeAdLoadState.ready && widget.controller.ad != null) {
                  return Expanded(
                    child: AdWidget(ad: widget.controller.ad!),
                  );
                }
                return Expanded(
                  child: Center(
                    child: state == NativeAdLoadState.failed
                        ? const Text('Sponsored suggestion unavailable.')
                        : const CircularProgressIndicator(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showWhy(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => const Padding(
        padding: EdgeInsets.all(AppSpacing.m),
        child: Text('Ads help keep Perbug free.'),
      ),
    );
  }
}
