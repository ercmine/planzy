import 'package:freezed_annotation/freezed_annotation.dart';

import '../core/json_parsers.dart';
import 'deep_links.dart';
import 'special.dart';

part 'plan.freezed.dart';
part 'plan.g.dart';

List<String>? parseOpeningHoursText(Object? value) {
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : <String>[trimmed];
  }
  return parseStringList(value);
}

@freezed
class PlanLocation with _$PlanLocation {
  const factory PlanLocation({
    @JsonKey(fromJson: parseDouble) required double lat,
    @JsonKey(fromJson: parseDouble) required double lng,
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
    String? token,
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
    @JsonKey(fromJson: parseDouble) double? distanceMeters,
    @JsonKey(fromJson: parseInt) int? priceLevel,
    @JsonKey(fromJson: parseDouble) double? rating,
    @JsonKey(fromJson: parseInt) int? reviewCount,
    List<PlanPhoto>? photos,
    PlanHours? hours,
    String? phone,
    @JsonKey(fromJson: parseOpeningHoursText) List<String>? openingHoursText,
    DeepLinks? deepLinks,
    Map<String, dynamic>? metadata,
  }) = _Plan;

  factory Plan.fromJson(Map<String, dynamic> json) => _$PlanFromJson(json);
}

extension PlanVenueHooksX on Plan {
  List<Special> get specials => Special.fromPlanMetadata(metadata);

  bool get hasSpecials => specials.isNotEmpty;

  bool get isVenueLike {
    const sources = <String>{'google', 'yelp', 'promoted', 'deduped'};
    final sourceNormalized = source.toLowerCase();
    final kind = metadata?['kind']?.toString().toLowerCase();
    final hasAddress = location.address?.trim().isNotEmpty == true;

    return hasAddress || sources.contains(sourceNormalized) || kind == 'theater';
  }
}
