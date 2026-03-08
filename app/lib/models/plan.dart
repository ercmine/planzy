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

double? parseNullableDouble(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value.trim());
  }
  return null;
}

double parseRequiredDouble(Object? value) {
  final parsed = parseNullableDouble(value);
  if (parsed == null) {
    throw const FormatException('Expected a non-null double value.');
  }
  return parsed;
}

@freezed
class PlanLocation with _$PlanLocation {
  const factory PlanLocation({
    @JsonKey(fromJson: parseRequiredDouble) required double lat,
    @JsonKey(fromJson: parseRequiredDouble) required double lng,
    String? address,
  }) = _PlanLocation;

  factory PlanLocation.fromJson(Map<String, dynamic> json) =>
      _$PlanLocationFromJson(json);
}

@freezed
class PlanPhoto with _$PlanPhoto {
  const factory PlanPhoto({
    required String url,
    String? token,
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
    required PlanLocation location,
    String? description,
    @JsonKey(fromJson: parseNullableDouble) double? distanceMeters,
    PlanHours? hours,
    @JsonKey(fromJson: parseOpeningHoursText) List<String>? openingHoursText,
    String? phone,
    DeepLinks? deepLinks,
    List<PlanPhoto>? photos,
    @JsonKey(fromJson: parseInt) int? priceLevel,
    @JsonKey(fromJson: parseNullableDouble) double? rating,
    @JsonKey(fromJson: parseInt) int? reviewCount,
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
