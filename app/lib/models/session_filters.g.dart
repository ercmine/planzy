// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_filters.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$SessionTimeWindowImpl _$$SessionTimeWindowImplFromJson(
        Map<String, dynamic> json) =>
    _$SessionTimeWindowImpl(
      startISO: json['startISO'] as String,
      endISO: json['endISO'] as String,
    );

Map<String, dynamic> _$$SessionTimeWindowImplToJson(
        _$SessionTimeWindowImpl instance) =>
    <String, dynamic>{
      'startISO': instance.startISO,
      'endISO': instance.endISO,
    };

_$SessionFiltersImpl _$$SessionFiltersImplFromJson(Map<String, dynamic> json) =>
    _$SessionFiltersImpl(
      radiusMeters: (json['radiusMeters'] as num?)?.toInt() ?? 5000,
      categories: (json['categories'] as List<dynamic>?)
              ?.map((e) => $enumDecode(_$CategoryEnumMap, e))
              .toList() ??
          const <Category>[],
      priceLevelMax: (json['priceLevelMax'] as num?)?.toInt(),
      openNow: json['openNow'] as bool? ?? false,
      timeWindow: json['timeWindow'] == null
          ? null
          : SessionTimeWindow.fromJson(
              json['timeWindow'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$SessionFiltersImplToJson(
        _$SessionFiltersImpl instance) =>
    <String, dynamic>{
      'radiusMeters': instance.radiusMeters,
      'categories':
          instance.categories.map((e) => _$CategoryEnumMap[e]!).toList(),
      'priceLevelMax': instance.priceLevelMax,
      'openNow': instance.openNow,
      'timeWindow': instance.timeWindow,
    };

const _$CategoryEnumMap = {
  Category.food: 'food',
  Category.drinks: 'drinks',
  Category.coffee: 'coffee',
  Category.outdoors: 'outdoors',
  Category.movies: 'movies',
  Category.music: 'music',
  Category.shopping: 'shopping',
  Category.wellness: 'wellness',
  Category.sports: 'sports',
  Category.other: 'other',
};
