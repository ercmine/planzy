import 'package:freezed_annotation/freezed_annotation.dart';

import 'deep_links.dart';

part 'plan.freezed.dart';
part 'plan.g.dart';

@freezed
class PlanLocation with _$PlanLocation {
  const factory PlanLocation({
    required double lat,
    required double lng,
    String? address,
  }) = _PlanLocation;

  factory PlanLocation.fromJson(Map<String, dynamic> json) =>
      _$PlanLocationFromJson(json);
}

@freezed
class PlanPhoto with _$PlanPhoto {
  const factory PlanPhoto({
    required String url,
    int? width,
    int? height,
  }) = _PlanPhoto;

  factory PlanPhoto.fromJson(Map<String, dynamic> json) =>
      _$PlanPhotoFromJson(json);
}

@freezed
class PlanHours with _$PlanHours {
  const factory PlanHours({
    bool? openNow,
    List<String>? weekdayText,
  }) = _PlanHours;

  factory PlanHours.fromJson(Map<String, dynamic> json) =>
      _$PlanHoursFromJson(json);
}

@freezed
class Plan with _$Plan {
  const factory Plan({
    required String id,
    required String source,
    required String sourceId,
    required String title,
    required String category,
    String? description,
    required PlanLocation location,
    double? distanceMeters,
    int? priceLevel,
    double? rating,
    int? reviewCount,
    List<PlanPhoto>? photos,
    PlanHours? hours,
    DeepLinks? deepLinks,
    Map<String, dynamic>? metadata,
  }) = _Plan;

  factory Plan.fromJson(Map<String, dynamic> json) => _$PlanFromJson(json);
}
