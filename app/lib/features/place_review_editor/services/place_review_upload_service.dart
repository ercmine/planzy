import 'dart:io';

import 'package:mime/mime.dart';
import 'package:path/path.dart' as p;

import '../../video_platform/video_repository.dart';
import '../models/place_review_video_draft.dart';
import 'place_review_export_service.dart';

class PlaceReviewUploadService {
  PlaceReviewUploadService({required this.videoRepository});

  final VideoRepository videoRepository;

  Future<ReviewPublishPayload> publishDraft({
    required PlaceReviewVideoDraft draft,
    required ReviewExportResult exportResult,
  }) async {
    final place = draft.metadata.place;
    if (place == null) {
      throw const FormatException('A place must be attached before publishing');
    }

    final draftVideo = draft.serverVideoId == null
        ? await videoRepository.createDraft(
            placeId: place.placeId,
            title: draft.metadata.title.isEmpty ? place.name : draft.metadata.title,
            caption: draft.metadata.caption,
            rating: draft.metadata.rating.overall,
          )
        : null;
    final serverVideoId = draft.serverVideoId ?? draftVideo?.videoId;
    if (serverVideoId == null || serverVideoId.isEmpty) {
      throw const FormatException('Unable to create review draft on server');
    }

    if (draft.serverVideoId != null) {
      await videoRepository.updateDraft(
        videoId: serverVideoId,
        placeId: place.placeId,
        title: draft.metadata.title.isEmpty ? place.name : draft.metadata.title,
        caption: draft.metadata.caption,
        rating: draft.metadata.rating.overall,
      );
    }

    final file = File(exportResult.exportPath);
    final sizeBytes = await file.length();
    final session = await videoRepository.requestUploadSession(
      videoId: serverVideoId,
      fileName: p.basename(exportResult.exportPath),
      contentType: lookupMimeType(exportResult.exportPath) ?? 'video/mp4',
      sizeBytes: sizeBytes,
    );
    await videoRepository.finalizeUpload(
      videoId: serverVideoId,
      uploadSessionId: session.id,
      durationMs: exportResult.durationMs,
    );
    await videoRepository.publish(videoId: serverVideoId);

    return ReviewPublishPayload(
      placeId: place.placeId,
      caption: draft.metadata.caption,
      ratingData: draft.metadata.rating,
      tags: draft.metadata.tags,
      videoAssetPath: exportResult.exportPath,
      thumbnailPath: exportResult.thumbnailPath,
      durationMs: exportResult.durationMs,
      aspectRatio: exportResult.aspectRatioLabel,
      createdAt: draft.createdAt.toIso8601String(),
      draftState: 'published',
      title: draft.metadata.title,
      uploadedUrl: serverVideoId,
    );
  }
}
