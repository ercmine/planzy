import 'dart:convert';

import '../../video_platform/video_models.dart';

enum ReviewPrivacy { public, followersOnly, privateDraft }
enum ReviewAspectRatio { ratio9x16, ratio1x1, ratio4x5, ratio16x9 }
enum OverlayType { text, ratingSticker, placeCard, presetCallout }
enum ClipFit { fit, fill }

class ReviewClipItem {
  const ReviewClipItem({
    required this.id,
    required this.filePath,
    required this.fileName,
    required this.durationMs,
    this.width,
    this.height,
    this.trimStartMs = 0,
    this.trimEndMs,
    this.muted = false,
    this.volume = 1,
  });

  final String id;
  final String filePath;
  final String fileName;
  final int durationMs;
  final int? width;
  final int? height;
  final int trimStartMs;
  final int? trimEndMs;
  final bool muted;
  final double volume;

  int get effectiveTrimEndMs => trimEndMs ?? durationMs;
  int get trimmedDurationMs => (effectiveTrimEndMs - trimStartMs).clamp(0, durationMs);

  ReviewClipItem copyWith({
    String? id,
    String? filePath,
    String? fileName,
    int? durationMs,
    int? width,
    int? height,
    int? trimStartMs,
    int? trimEndMs,
    bool? muted,
    double? volume,
  }) {
    return ReviewClipItem(
      id: id ?? this.id,
      filePath: filePath ?? this.filePath,
      fileName: fileName ?? this.fileName,
      durationMs: durationMs ?? this.durationMs,
      width: width ?? this.width,
      height: height ?? this.height,
      trimStartMs: trimStartMs ?? this.trimStartMs,
      trimEndMs: trimEndMs ?? this.trimEndMs,
      muted: muted ?? this.muted,
      volume: volume ?? this.volume,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'filePath': filePath,
        'fileName': fileName,
        'durationMs': durationMs,
        'width': width,
        'height': height,
        'trimStartMs': trimStartMs,
        'trimEndMs': trimEndMs,
        'muted': muted,
        'volume': volume,
      };

  factory ReviewClipItem.fromJson(Map<String, dynamic> json) => ReviewClipItem(
        id: (json['id'] ?? '').toString(),
        filePath: (json['filePath'] ?? '').toString(),
        fileName: (json['fileName'] ?? '').toString(),
        durationMs: (json['durationMs'] as num?)?.toInt() ?? 0,
        width: (json['width'] as num?)?.toInt(),
        height: (json['height'] as num?)?.toInt(),
        trimStartMs: (json['trimStartMs'] as num?)?.toInt() ?? 0,
        trimEndMs: (json['trimEndMs'] as num?)?.toInt(),
        muted: json['muted'] == true,
        volume: (json['volume'] as num?)?.toDouble() ?? 1,
      );
}

class EditorTransformSettings {
  const EditorTransformSettings({
    this.rotationTurns = 0,
    this.zoom = 1,
    this.offsetX = 0,
    this.offsetY = 0,
    this.mirrored = false,
    this.aspectRatio = ReviewAspectRatio.ratio9x16,
    this.fit = ClipFit.fill,
    this.brightness = 0,
    this.contrast = 1,
    this.saturation = 1,
    this.warmth = 0,
    this.sharpness = 0,
    this.highlights = 0,
    this.shadows = 0,
    this.filterId = 'natural',
    this.autoEnhance = false,
  });

  final int rotationTurns;
  final double zoom;
  final double offsetX;
  final double offsetY;
  final bool mirrored;
  final ReviewAspectRatio aspectRatio;
  final ClipFit fit;
  final double brightness;
  final double contrast;
  final double saturation;
  final double warmth;
  final double sharpness;
  final double highlights;
  final double shadows;
  final String filterId;
  final bool autoEnhance;

  EditorTransformSettings copyWith({
    int? rotationTurns,
    double? zoom,
    double? offsetX,
    double? offsetY,
    bool? mirrored,
    ReviewAspectRatio? aspectRatio,
    ClipFit? fit,
    double? brightness,
    double? contrast,
    double? saturation,
    double? warmth,
    double? sharpness,
    double? highlights,
    double? shadows,
    String? filterId,
    bool? autoEnhance,
  }) {
    return EditorTransformSettings(
      rotationTurns: rotationTurns ?? this.rotationTurns,
      zoom: zoom ?? this.zoom,
      offsetX: offsetX ?? this.offsetX,
      offsetY: offsetY ?? this.offsetY,
      mirrored: mirrored ?? this.mirrored,
      aspectRatio: aspectRatio ?? this.aspectRatio,
      fit: fit ?? this.fit,
      brightness: brightness ?? this.brightness,
      contrast: contrast ?? this.contrast,
      saturation: saturation ?? this.saturation,
      warmth: warmth ?? this.warmth,
      sharpness: sharpness ?? this.sharpness,
      highlights: highlights ?? this.highlights,
      shadows: shadows ?? this.shadows,
      filterId: filterId ?? this.filterId,
      autoEnhance: autoEnhance ?? this.autoEnhance,
    );
  }

  Map<String, dynamic> toJson() => {
        'rotationTurns': rotationTurns,
        'zoom': zoom,
        'offsetX': offsetX,
        'offsetY': offsetY,
        'mirrored': mirrored,
        'aspectRatio': aspectRatio.name,
        'fit': fit.name,
        'brightness': brightness,
        'contrast': contrast,
        'saturation': saturation,
        'warmth': warmth,
        'sharpness': sharpness,
        'highlights': highlights,
        'shadows': shadows,
        'filterId': filterId,
        'autoEnhance': autoEnhance,
      };

  factory EditorTransformSettings.fromJson(Map<String, dynamic> json) => EditorTransformSettings(
        rotationTurns: (json['rotationTurns'] as num?)?.toInt() ?? 0,
        zoom: (json['zoom'] as num?)?.toDouble() ?? 1,
        offsetX: (json['offsetX'] as num?)?.toDouble() ?? 0,
        offsetY: (json['offsetY'] as num?)?.toDouble() ?? 0,
        mirrored: json['mirrored'] == true,
        aspectRatio: ReviewAspectRatio.values.firstWhere(
          (value) => value.name == json['aspectRatio'],
          orElse: () => ReviewAspectRatio.ratio9x16,
        ),
        fit: ClipFit.values.firstWhere(
          (value) => value.name == json['fit'],
          orElse: () => ClipFit.fill,
        ),
        brightness: (json['brightness'] as num?)?.toDouble() ?? 0,
        contrast: (json['contrast'] as num?)?.toDouble() ?? 1,
        saturation: (json['saturation'] as num?)?.toDouble() ?? 1,
        warmth: (json['warmth'] as num?)?.toDouble() ?? 0,
        sharpness: (json['sharpness'] as num?)?.toDouble() ?? 0,
        highlights: (json['highlights'] as num?)?.toDouble() ?? 0,
        shadows: (json['shadows'] as num?)?.toDouble() ?? 0,
        filterId: (json['filterId'] ?? 'natural').toString(),
        autoEnhance: json['autoEnhance'] == true,
      );
}

class EditorAudioSettings {
  const EditorAudioSettings({
    this.muteOriginal = false,
    this.originalVolume = 1,
    this.musicVolume = 0.4,
    this.musicTrackName,
    this.musicTrackAsset,
    this.voiceoverEnabled = false,
    this.fadeIn = false,
    this.fadeOut = false,
  });

  final bool muteOriginal;
  final double originalVolume;
  final double musicVolume;
  final String? musicTrackName;
  final String? musicTrackAsset;
  final bool voiceoverEnabled;
  final bool fadeIn;
  final bool fadeOut;

  EditorAudioSettings copyWith({
    bool? muteOriginal,
    double? originalVolume,
    double? musicVolume,
    String? musicTrackName,
    String? musicTrackAsset,
    bool clearMusic = false,
    bool? voiceoverEnabled,
    bool? fadeIn,
    bool? fadeOut,
  }) {
    return EditorAudioSettings(
      muteOriginal: muteOriginal ?? this.muteOriginal,
      originalVolume: originalVolume ?? this.originalVolume,
      musicVolume: musicVolume ?? this.musicVolume,
      musicTrackName: clearMusic ? null : musicTrackName ?? this.musicTrackName,
      musicTrackAsset: clearMusic ? null : musicTrackAsset ?? this.musicTrackAsset,
      voiceoverEnabled: voiceoverEnabled ?? this.voiceoverEnabled,
      fadeIn: fadeIn ?? this.fadeIn,
      fadeOut: fadeOut ?? this.fadeOut,
    );
  }

  Map<String, dynamic> toJson() => {
        'muteOriginal': muteOriginal,
        'originalVolume': originalVolume,
        'musicVolume': musicVolume,
        'musicTrackName': musicTrackName,
        'musicTrackAsset': musicTrackAsset,
        'voiceoverEnabled': voiceoverEnabled,
        'fadeIn': fadeIn,
        'fadeOut': fadeOut,
      };

  factory EditorAudioSettings.fromJson(Map<String, dynamic> json) => EditorAudioSettings(
        muteOriginal: json['muteOriginal'] == true,
        originalVolume: (json['originalVolume'] as num?)?.toDouble() ?? 1,
        musicVolume: (json['musicVolume'] as num?)?.toDouble() ?? 0.4,
        musicTrackName: json['musicTrackName']?.toString(),
        musicTrackAsset: json['musicTrackAsset']?.toString(),
        voiceoverEnabled: json['voiceoverEnabled'] == true,
        fadeIn: json['fadeIn'] == true,
        fadeOut: json['fadeOut'] == true,
      );
}

class ReviewOverlayItem {
  const ReviewOverlayItem({
    required this.id,
    required this.type,
    required this.text,
    this.colorHex = '#FFFFFF',
    this.fontScale = 1,
    this.alignmentX = 0,
    this.alignmentY = 0,
    this.startMs = 0,
    this.endMs,
  });

  final String id;
  final OverlayType type;
  final String text;
  final String colorHex;
  final double fontScale;
  final double alignmentX;
  final double alignmentY;
  final int startMs;
  final int? endMs;

  ReviewOverlayItem copyWith({
    String? id,
    OverlayType? type,
    String? text,
    String? colorHex,
    double? fontScale,
    double? alignmentX,
    double? alignmentY,
    int? startMs,
    int? endMs,
  }) {
    return ReviewOverlayItem(
      id: id ?? this.id,
      type: type ?? this.type,
      text: text ?? this.text,
      colorHex: colorHex ?? this.colorHex,
      fontScale: fontScale ?? this.fontScale,
      alignmentX: alignmentX ?? this.alignmentX,
      alignmentY: alignmentY ?? this.alignmentY,
      startMs: startMs ?? this.startMs,
      endMs: endMs ?? this.endMs,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'text': text,
        'colorHex': colorHex,
        'fontScale': fontScale,
        'alignmentX': alignmentX,
        'alignmentY': alignmentY,
        'startMs': startMs,
        'endMs': endMs,
      };

  factory ReviewOverlayItem.fromJson(Map<String, dynamic> json) => ReviewOverlayItem(
        id: (json['id'] ?? '').toString(),
        type: OverlayType.values.firstWhere((value) => value.name == json['type'], orElse: () => OverlayType.text),
        text: (json['text'] ?? '').toString(),
        colorHex: (json['colorHex'] ?? '#FFFFFF').toString(),
        fontScale: (json['fontScale'] as num?)?.toDouble() ?? 1,
        alignmentX: (json['alignmentX'] as num?)?.toDouble() ?? 0,
        alignmentY: (json['alignmentY'] as num?)?.toDouble() ?? 0,
        startMs: (json['startMs'] as num?)?.toInt() ?? 0,
        endMs: (json['endMs'] as num?)?.toInt(),
      );
}

class ReviewRatingData {
  const ReviewRatingData({
    this.overall = 0,
    this.food = 0,
    this.drinks = 0,
    this.service = 0,
    this.vibe = 0,
    this.value = 0,
    this.recommend = true,
  });

  final int overall;
  final int food;
  final int drinks;
  final int service;
  final int vibe;
  final int value;
  final bool recommend;

  ReviewRatingData copyWith({
    int? overall,
    int? food,
    int? drinks,
    int? service,
    int? vibe,
    int? value,
    bool? recommend,
  }) {
    return ReviewRatingData(
      overall: overall ?? this.overall,
      food: food ?? this.food,
      drinks: drinks ?? this.drinks,
      service: service ?? this.service,
      vibe: vibe ?? this.vibe,
      value: value ?? this.value,
      recommend: recommend ?? this.recommend,
    );
  }

  Map<String, dynamic> toJson() => {
        'overall': overall,
        'food': food,
        'drinks': drinks,
        'service': service,
        'vibe': vibe,
        'value': value,
        'recommend': recommend,
      };

  factory ReviewRatingData.fromJson(Map<String, dynamic> json) => ReviewRatingData(
        overall: (json['overall'] as num?)?.toInt() ?? 0,
        food: (json['food'] as num?)?.toInt() ?? 0,
        drinks: (json['drinks'] as num?)?.toInt() ?? 0,
        service: (json['service'] as num?)?.toInt() ?? 0,
        vibe: (json['vibe'] as num?)?.toInt() ?? 0,
        value: (json['value'] as num?)?.toInt() ?? 0,
        recommend: json['recommend'] != false,
      );
}

class PlaceReviewMetadata {
  const PlaceReviewMetadata({
    this.place,
    this.title = '',
    this.caption = '',
    this.tags = const [],
    this.quickReactions = const [],
    this.whatToOrder = '',
    this.bestTimeToGo = '',
    this.reviewSummary = '',
    this.visitDate,
    this.currentlyHere = false,
    this.companions = const [],
    this.hashtags = const [],
    this.categories = const [],
    this.rating = const ReviewRatingData(),
    this.privacy = ReviewPrivacy.public,
    this.coverPath,
    this.neighborhood = '',
    this.city = '',
  });

  final PlaceSearchResult? place;
  final String title;
  final String caption;
  final List<String> tags;
  final List<String> quickReactions;
  final String whatToOrder;
  final String bestTimeToGo;
  final String reviewSummary;
  final DateTime? visitDate;
  final bool currentlyHere;
  final List<String> companions;
  final List<String> hashtags;
  final List<String> categories;
  final ReviewRatingData rating;
  final ReviewPrivacy privacy;
  final String? coverPath;
  final String neighborhood;
  final String city;

  PlaceReviewMetadata copyWith({
    PlaceSearchResult? place,
    bool clearPlace = false,
    String? title,
    String? caption,
    List<String>? tags,
    List<String>? quickReactions,
    String? whatToOrder,
    String? bestTimeToGo,
    String? reviewSummary,
    DateTime? visitDate,
    bool clearVisitDate = false,
    bool? currentlyHere,
    List<String>? companions,
    List<String>? hashtags,
    List<String>? categories,
    ReviewRatingData? rating,
    ReviewPrivacy? privacy,
    String? coverPath,
    bool clearCover = false,
    String? neighborhood,
    String? city,
  }) {
    return PlaceReviewMetadata(
      place: clearPlace ? null : place ?? this.place,
      title: title ?? this.title,
      caption: caption ?? this.caption,
      tags: tags ?? this.tags,
      quickReactions: quickReactions ?? this.quickReactions,
      whatToOrder: whatToOrder ?? this.whatToOrder,
      bestTimeToGo: bestTimeToGo ?? this.bestTimeToGo,
      reviewSummary: reviewSummary ?? this.reviewSummary,
      visitDate: clearVisitDate ? null : visitDate ?? this.visitDate,
      currentlyHere: currentlyHere ?? this.currentlyHere,
      companions: companions ?? this.companions,
      hashtags: hashtags ?? this.hashtags,
      categories: categories ?? this.categories,
      rating: rating ?? this.rating,
      privacy: privacy ?? this.privacy,
      coverPath: clearCover ? null : coverPath ?? this.coverPath,
      neighborhood: neighborhood ?? this.neighborhood,
      city: city ?? this.city,
    );
  }

  Map<String, dynamic> toJson() => {
        'place': place == null
            ? null
            : {
                'placeId': place!.placeId,
                'name': place!.name,
                'category': place!.category,
                'regionLabel': place!.regionLabel,
                'addressSnippet': place!.addressSnippet,
                'distanceKm': place!.distanceKm,
                'thumbnailUrl': place!.thumbnailUrl,
              },
        'title': title,
        'caption': caption,
        'tags': tags,
        'quickReactions': quickReactions,
        'whatToOrder': whatToOrder,
        'bestTimeToGo': bestTimeToGo,
        'reviewSummary': reviewSummary,
        'visitDate': visitDate?.toIso8601String(),
        'currentlyHere': currentlyHere,
        'companions': companions,
        'hashtags': hashtags,
        'categories': categories,
        'rating': rating.toJson(),
        'privacy': privacy.name,
        'coverPath': coverPath,
        'neighborhood': neighborhood,
        'city': city,
      };

  factory PlaceReviewMetadata.fromJson(Map<String, dynamic> json) => PlaceReviewMetadata(
        place: json['place'] is Map<String, dynamic> ? PlaceSearchResult.fromJson(json['place'] as Map<String, dynamic>) : null,
        title: (json['title'] ?? '').toString(),
        caption: (json['caption'] ?? '').toString(),
        tags: (json['tags'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const [],
        quickReactions: (json['quickReactions'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const [],
        whatToOrder: (json['whatToOrder'] ?? '').toString(),
        bestTimeToGo: (json['bestTimeToGo'] ?? '').toString(),
        reviewSummary: (json['reviewSummary'] ?? '').toString(),
        visitDate: DateTime.tryParse((json['visitDate'] ?? '').toString()),
        currentlyHere: json['currentlyHere'] == true,
        companions: (json['companions'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const [],
        hashtags: (json['hashtags'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const [],
        categories: (json['categories'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const [],
        rating: json['rating'] is Map<String, dynamic> ? ReviewRatingData.fromJson(json['rating'] as Map<String, dynamic>) : const ReviewRatingData(),
        privacy: ReviewPrivacy.values.firstWhere((value) => value.name == json['privacy'], orElse: () => ReviewPrivacy.public),
        coverPath: json['coverPath']?.toString(),
        neighborhood: (json['neighborhood'] ?? '').toString(),
        city: (json['city'] ?? '').toString(),
      );
}

class ReviewExportSettings {
  const ReviewExportSettings({
    this.maxDurationMs = 60000,
    this.targetWidth = 1080,
    this.targetHeight = 1920,
    this.bitrateMbps = 8,
    this.generateThumbnail = true,
  });

  final int maxDurationMs;
  final int targetWidth;
  final int targetHeight;
  final int bitrateMbps;
  final bool generateThumbnail;

  Map<String, dynamic> toJson() => {
        'maxDurationMs': maxDurationMs,
        'targetWidth': targetWidth,
        'targetHeight': targetHeight,
        'bitrateMbps': bitrateMbps,
        'generateThumbnail': generateThumbnail,
      };

  factory ReviewExportSettings.fromJson(Map<String, dynamic> json) => ReviewExportSettings(
        maxDurationMs: (json['maxDurationMs'] as num?)?.toInt() ?? 60000,
        targetWidth: (json['targetWidth'] as num?)?.toInt() ?? 1080,
        targetHeight: (json['targetHeight'] as num?)?.toInt() ?? 1920,
        bitrateMbps: (json['bitrateMbps'] as num?)?.toInt() ?? 8,
        generateThumbnail: json['generateThumbnail'] != false,
      );
}

class ReviewPublishPayload {
  const ReviewPublishPayload({
    required this.placeId,
    required this.caption,
    required this.ratingData,
    required this.tags,
    required this.videoAssetPath,
    required this.thumbnailPath,
    required this.durationMs,
    required this.aspectRatio,
    required this.createdAt,
    required this.draftState,
    this.locationCoordinates,
    this.uploadedUrl,
    this.title,
  });

  final String placeId;
  final String caption;
  final ReviewRatingData ratingData;
  final List<String> tags;
  final String videoAssetPath;
  final String thumbnailPath;
  final int durationMs;
  final String aspectRatio;
  final String createdAt;
  final String draftState;
  final List<double>? locationCoordinates;
  final String? uploadedUrl;
  final String? title;

  Map<String, dynamic> toJson() => {
        'placeId': placeId,
        'caption': caption,
        'ratingData': ratingData.toJson(),
        'tags': tags,
        'videoAssetPath': videoAssetPath,
        'uploadedUrl': uploadedUrl,
        'thumbnail': thumbnailPath,
        'duration': durationMs,
        'aspectRatio': aspectRatio,
        'locationCoordinates': locationCoordinates,
        'createdAt': createdAt,
        'draftState': draftState,
        'title': title,
      };
}

class PlaceReviewVideoDraft {
  const PlaceReviewVideoDraft({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    this.serverVideoId,
    this.clips = const [],
    this.selectedClipIndex = 0,
    this.transform = const EditorTransformSettings(),
    this.audio = const EditorAudioSettings(),
    this.overlays = const [],
    this.metadata = const PlaceReviewMetadata(),
    this.exportSettings = const ReviewExportSettings(),
    this.lastPreviewPositionMs = 0,
    this.isDraft = true,
    this.recovered = false,
  });

  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? serverVideoId;
  final List<ReviewClipItem> clips;
  final int selectedClipIndex;
  final EditorTransformSettings transform;
  final EditorAudioSettings audio;
  final List<ReviewOverlayItem> overlays;
  final PlaceReviewMetadata metadata;
  final ReviewExportSettings exportSettings;
  final int lastPreviewPositionMs;
  final bool isDraft;
  final bool recovered;

  ReviewClipItem? get selectedClip => clips.isEmpty ? null : clips[selectedClipIndex.clamp(0, clips.length - 1)];
  int get totalDurationMs => clips.fold<int>(0, (total, clip) => total + clip.trimmedDurationMs);

  PlaceReviewVideoDraft copyWith({
    String? id,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? serverVideoId,
    bool clearServerVideoId = false,
    List<ReviewClipItem>? clips,
    int? selectedClipIndex,
    EditorTransformSettings? transform,
    EditorAudioSettings? audio,
    List<ReviewOverlayItem>? overlays,
    PlaceReviewMetadata? metadata,
    ReviewExportSettings? exportSettings,
    int? lastPreviewPositionMs,
    bool? isDraft,
    bool? recovered,
  }) {
    return PlaceReviewVideoDraft(
      id: id ?? this.id,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      serverVideoId: clearServerVideoId ? null : serverVideoId ?? this.serverVideoId,
      clips: clips ?? this.clips,
      selectedClipIndex: selectedClipIndex ?? this.selectedClipIndex,
      transform: transform ?? this.transform,
      audio: audio ?? this.audio,
      overlays: overlays ?? this.overlays,
      metadata: metadata ?? this.metadata,
      exportSettings: exportSettings ?? this.exportSettings,
      lastPreviewPositionMs: lastPreviewPositionMs ?? this.lastPreviewPositionMs,
      isDraft: isDraft ?? this.isDraft,
      recovered: recovered ?? this.recovered,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'serverVideoId': serverVideoId,
        'clips': clips.map((clip) => clip.toJson()).toList(growable: false),
        'selectedClipIndex': selectedClipIndex,
        'transform': transform.toJson(),
        'audio': audio.toJson(),
        'overlays': overlays.map((overlay) => overlay.toJson()).toList(growable: false),
        'metadata': metadata.toJson(),
        'exportSettings': exportSettings.toJson(),
        'lastPreviewPositionMs': lastPreviewPositionMs,
        'isDraft': isDraft,
        'recovered': recovered,
      };

  String encode() => jsonEncode(toJson());

  factory PlaceReviewVideoDraft.fromJson(Map<String, dynamic> json) => PlaceReviewVideoDraft(
        id: (json['id'] ?? '').toString(),
        createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
        updatedAt: DateTime.tryParse((json['updatedAt'] ?? '').toString()) ?? DateTime.now(),
        serverVideoId: json['serverVideoId']?.toString(),
        clips: (json['clips'] as List?)?.whereType<Map<String, dynamic>>().map(ReviewClipItem.fromJson).toList(growable: false) ?? const [],
        selectedClipIndex: (json['selectedClipIndex'] as num?)?.toInt() ?? 0,
        transform: json['transform'] is Map<String, dynamic> ? EditorTransformSettings.fromJson(json['transform'] as Map<String, dynamic>) : const EditorTransformSettings(),
        audio: json['audio'] is Map<String, dynamic> ? EditorAudioSettings.fromJson(json['audio'] as Map<String, dynamic>) : const EditorAudioSettings(),
        overlays: (json['overlays'] as List?)?.whereType<Map<String, dynamic>>().map(ReviewOverlayItem.fromJson).toList(growable: false) ?? const [],
        metadata: json['metadata'] is Map<String, dynamic> ? PlaceReviewMetadata.fromJson(json['metadata'] as Map<String, dynamic>) : const PlaceReviewMetadata(),
        exportSettings: json['exportSettings'] is Map<String, dynamic> ? ReviewExportSettings.fromJson(json['exportSettings'] as Map<String, dynamic>) : const ReviewExportSettings(),
        lastPreviewPositionMs: (json['lastPreviewPositionMs'] as num?)?.toInt() ?? 0,
        isDraft: json['isDraft'] != false,
        recovered: json['recovered'] == true,
      );
}
