import 'package:flutter/material.dart';

import '../models/place_review_video_draft.dart';

class TrimTimeline extends StatelessWidget {
  const TrimTimeline({
    required this.clip,
    required this.positionMs,
    required this.onTrimChanged,
    required this.onScrub,
    super.key,
  });

  final ReviewClipItem clip;
  final int positionMs;
  final void Function(int startMs, int endMs) onTrimChanged;
  final ValueChanged<int> onScrub;

  @override
  Widget build(BuildContext context) {
    final endMs = clip.effectiveTrimEndMs;
    final total = clip.durationMs == 0 ? 1 : clip.durationMs;
    final trimStart = clip.trimStartMs / total;
    final trimEnd = endMs / total;
    final playhead = positionMs.clamp(0, clip.durationMs) / total;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(_formatMs(positionMs)),
            Text('${_formatMs(clip.trimmedDurationMs)} / ${_formatMs(clip.durationMs)}'),
          ],
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            return SizedBox(
              height: 74,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        child: Row(
                          children: List.generate(
                            12,
                            (index) => Expanded(
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 2),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [
                                      Theme.of(context).colorScheme.primary.withOpacity(0.75 - (index * 0.03)),
                                      Theme.of(context).colorScheme.primaryContainer,
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: trimStart * width,
                    width: (trimEnd - trimStart) * width,
                    top: 0,
                    bottom: 0,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: (playhead * width).clamp(0, width - 2),
                    top: 0,
                    bottom: 0,
                    child: Container(width: 2, color: Colors.white),
                  ),
                  _Handle(
                    alignment: Alignment.centerLeft,
                    left: (trimStart * width - 12).clamp(0, width - 24),
                    onDrag: (delta) {
                      final updated = (((trimStart * width) + delta) / width * total).round();
                      onTrimChanged(updated.clamp(0, endMs - 300), endMs);
                    },
                  ),
                  _Handle(
                    alignment: Alignment.centerRight,
                    left: (trimEnd * width - 12).clamp(0, width - 24),
                    onDrag: (delta) {
                      final updated = (((trimEnd * width) + delta) / width * total).round();
                      onTrimChanged(clip.trimStartMs, updated.clamp(clip.trimStartMs + 300, clip.durationMs));
                    },
                  ),
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onHorizontalDragUpdate: (details) {
                        final localX = (details.localPosition.dx).clamp(0, width);
                        onScrub(((localX / width) * total).round());
                      },
                      onTapDown: (details) {
                        final localX = details.localPosition.dx.clamp(0, width);
                        onScrub(((localX / width) * total).round());
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  String _formatMs(int ms) {
    final duration = Duration(milliseconds: ms);
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}

class _Handle extends StatelessWidget {
  const _Handle({required this.left, required this.alignment, required this.onDrag});

  final double left;
  final Alignment alignment;
  final ValueChanged<double> onDrag;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left,
      top: 14,
      bottom: 14,
      child: GestureDetector(
        onHorizontalDragUpdate: (details) => onDrag(details.delta.dx),
        child: Container(
          width: 24,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Align(
            alignment: alignment,
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Icon(Icons.drag_handle, size: 16, color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}
