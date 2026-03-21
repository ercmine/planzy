import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';
import '../video_platform/video_repository.dart';

const _reportReasons = <({String code, String label})>[
  (code: "sexual_explicit", label: "Nudity / sexual content"),
  (code: "graphic_violent", label: "Violence / graphic content"),
  (code: "harassment_bullying", label: "Harassment / abuse"),
  (code: "hate_abusive_language", label: "Hate or offensive content"),
  (code: "spam", label: "Spam / scam"),
  (code: "other", label: "Other"),
];

class PlaceVideoDetailPage extends ConsumerWidget {
  const PlaceVideoDetailPage({required this.placeId, required this.placeName, super.key});

  final String placeId;
  final String placeName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(videoFeedProvider(FeedScope.local));
    return Scaffold(
      appBar: AppBar(title: Text(placeName)),
      body: feed.when(
        data: (items) {
          final placeVideos = items.where((item) => item.placeId == placeId).toList(growable: false);
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Text(placeName, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 6),
              const Text('Place review video coverage'),
              const SizedBox(height: 12),
              if (placeVideos.isEmpty)
                const Card(
                  child: ListTile(
                    title: Text('No place videos available yet'),
                    subtitle: Text('Be the first to add a review or creator video for this place.'),
                  ),
                ),
              ...placeVideos.map(
                (video) => Card(
                  child: ListTile(
                    title: Text(video.caption.isEmpty ? video.placeName : video.caption),
                    subtitle: Text(video.creatorHandle),
                    trailing: IconButton(
                      tooltip: "Report video",
                      icon: const Icon(Icons.flag_outlined),
                      onPressed: () => _showReportSheet(context, ref, video),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        error: (_, __) => const Center(child: Text('No place videos available')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}


Future<void> _showReportSheet(BuildContext context, WidgetRef ref, PlaceVideoFeedItem video) async {
  final repo = await ref.read(videoRepositoryProvider.future);
  final noteController = TextEditingController();
  String selected = _reportReasons.first.code;
  final submitted = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => Padding(
        padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Report video', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._reportReasons.map((reason) => RadioListTile<String>(value: reason.code, groupValue: selected, onChanged: (value) => setState(() => selected = value ?? selected), title: Text(reason.label))),
            TextField(controller: noteController, maxLines: 3, decoration: const InputDecoration(labelText: 'Optional note')),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () async {
                await repo.submitVideoReport(videoId: video.videoId, reasonCode: selected, note: noteController.text);
                if (context.mounted) Navigator.of(context).pop(true);
              },
              child: const Text('Submit report'),
            ),
          ],
        ),
      ),
    ),
  );
  noteController.dispose();
  if (submitted == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report received. Our safety team will review it.')));
  }
}
