// Run: flutter pub run build_runner build --delete-conflicting-outputs
import 'package:freezed_annotation/freezed_annotation.dart';

part 'session_filters.freezed.dart';
part 'session_filters.g.dart';

@JsonEnum(alwaysCreate: true)
enum Category {
  food,
  drinks,
  coffee,
  outdoors,
  movies,
  music,
  shopping,
  wellness,
  sports,
  other,
}

@freezed
class SessionTimeWindow with _$SessionTimeWindow {
  const factory SessionTimeWindow({
    required String startISO,
    required String endISO,
  }) = _SessionTimeWindow;

  factory SessionTimeWindow.fromJson(Map<String, dynamic> json) =>
      _$SessionTimeWindowFromJson(json);
}

@freezed
class SessionFilters with _$SessionFilters {
  const factory SessionFilters({
    @Default(5000) int radiusMeters,
    @Default(<Category>[]) List<Category> categories,
    int? priceLevelMax,
    @Default(false) bool openNow,
    SessionTimeWindow? timeWindow,
  }) = _SessionFilters;

  factory SessionFilters.fromJson(Map<String, dynamic> json) =>
      _$SessionFiltersFromJson(json);
}
