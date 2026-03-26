import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:video_thumbnail/video_thumbnail.dart';

import '../models/place_review_video_draft.dart';

class ReviewExportResult {
  const ReviewExportResult({
    required this.exportPath,
    required this.thumbnailPath,
    required this.durationMs,
    required this.aspectRatioLabel,
  });

  final String exportPath;
  final String thumbnailPath;
  final int durationMs;
  final String aspectRatioLabel;
}

class PlaceReviewExportService {
  Future<ReviewExportResult> exportDraft(PlaceReviewVideoDraft draft) async {
    final clip = draft.selectedClip;
    if (clip == null) {
      throw const FormatException('No clip selected for export');
    }
    final tempDir = await getTemporaryDirectory();
    final exportDir = Directory(p.join(tempDir.path, 'dryad-review-exports'));
    if (!await exportDir.exists()) {
      await exportDir.create(recursive: true);
    }
    final extension = p.extension(clip.filePath).isEmpty ? '.mp4' : p.extension(clip.filePath);
    final exportPath = p.join(exportDir.path, '${draft.id}$extension');
    final sourceFile = File(clip.filePath);
    if (!await sourceFile.exists()) {
      throw const FileSystemException('Selected clip is no longer available on device');
    }
    await sourceFile.copy(exportPath);

    final thumbnailPath = await VideoThumbnail.thumbnailFile(
          video: clip.filePath,
          thumbnailPath: exportDir.path,
          imageFormat: ImageFormat.JPEG,
          maxHeight: 480,
          quality: 80,
        ) ??
        '';
    if (thumbnailPath.isEmpty) {
      throw const FileSystemException('Unable to generate a thumbnail for this video');
    }

    return ReviewExportResult(
      exportPath: exportPath,
      thumbnailPath: thumbnailPath,
      durationMs: draft.totalDurationMs,
      aspectRatioLabel: _aspectRatioLabel(draft.transform.aspectRatio),
    );
  }

  String _aspectRatioLabel(ReviewAspectRatio value) {
    switch (value) {
      case ReviewAspectRatio.ratio9x16:
        return '9:16';
      case ReviewAspectRatio.ratio1x1:
        return '1:1';
      case ReviewAspectRatio.ratio4x5:
        return '4:5';
      case ReviewAspectRatio.ratio16x9:
        return '16:9';
    }
  }
}
