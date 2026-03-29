// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'session_filters.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

SessionTimeWindow _$SessionTimeWindowFromJson(Map<String, dynamic> json) {
  return _SessionTimeWindow.fromJson(json);
}

/// @nodoc
mixin _$SessionTimeWindow {
  String get startISO => throw _privateConstructorUsedError;
  String get endISO => throw _privateConstructorUsedError;

  /// Serializes this SessionTimeWindow to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SessionTimeWindow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SessionTimeWindowCopyWith<SessionTimeWindow> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionTimeWindowCopyWith<$Res> {
  factory $SessionTimeWindowCopyWith(
          SessionTimeWindow value, $Res Function(SessionTimeWindow) then) =
      _$SessionTimeWindowCopyWithImpl<$Res, SessionTimeWindow>;
  @useResult
  $Res call({String startISO, String endISO});
}

/// @nodoc
class _$SessionTimeWindowCopyWithImpl<$Res, $Val extends SessionTimeWindow>
    implements $SessionTimeWindowCopyWith<$Res> {
  _$SessionTimeWindowCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SessionTimeWindow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? startISO = null,
    Object? endISO = null,
  }) {
    return _then(_value.copyWith(
      startISO: null == startISO
          ? _value.startISO
          : startISO // ignore: cast_nullable_to_non_nullable
              as String,
      endISO: null == endISO
          ? _value.endISO
          : endISO // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SessionTimeWindowImplCopyWith<$Res>
    implements $SessionTimeWindowCopyWith<$Res> {
  factory _$$SessionTimeWindowImplCopyWith(_$SessionTimeWindowImpl value,
          $Res Function(_$SessionTimeWindowImpl) then) =
      __$$SessionTimeWindowImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String startISO, String endISO});
}

/// @nodoc
class __$$SessionTimeWindowImplCopyWithImpl<$Res>
    extends _$SessionTimeWindowCopyWithImpl<$Res, _$SessionTimeWindowImpl>
    implements _$$SessionTimeWindowImplCopyWith<$Res> {
  __$$SessionTimeWindowImplCopyWithImpl(_$SessionTimeWindowImpl _value,
      $Res Function(_$SessionTimeWindowImpl) _then)
      : super(_value, _then);

  /// Create a copy of SessionTimeWindow
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? startISO = null,
    Object? endISO = null,
  }) {
    return _then(_$SessionTimeWindowImpl(
      startISO: null == startISO
          ? _value.startISO
          : startISO // ignore: cast_nullable_to_non_nullable
              as String,
      endISO: null == endISO
          ? _value.endISO
          : endISO // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SessionTimeWindowImpl implements _SessionTimeWindow {
  const _$SessionTimeWindowImpl({required this.startISO, required this.endISO});

  factory _$SessionTimeWindowImpl.fromJson(Map<String, dynamic> json) =>
      _$$SessionTimeWindowImplFromJson(json);

  @override
  final String startISO;
  @override
  final String endISO;

  @override
  String toString() {
    return 'SessionTimeWindow(startISO: $startISO, endISO: $endISO)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionTimeWindowImpl &&
            (identical(other.startISO, startISO) ||
                other.startISO == startISO) &&
            (identical(other.endISO, endISO) || other.endISO == endISO));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, startISO, endISO);

  /// Create a copy of SessionTimeWindow
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionTimeWindowImplCopyWith<_$SessionTimeWindowImpl> get copyWith =>
      __$$SessionTimeWindowImplCopyWithImpl<_$SessionTimeWindowImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SessionTimeWindowImplToJson(
      this,
    );
  }
}

abstract class _SessionTimeWindow implements SessionTimeWindow {
  const factory _SessionTimeWindow(
      {required final String startISO,
      required final String endISO}) = _$SessionTimeWindowImpl;

  factory _SessionTimeWindow.fromJson(Map<String, dynamic> json) =
      _$SessionTimeWindowImpl.fromJson;

  @override
  String get startISO;
  @override
  String get endISO;

  /// Create a copy of SessionTimeWindow
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SessionTimeWindowImplCopyWith<_$SessionTimeWindowImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SessionFilters _$SessionFiltersFromJson(Map<String, dynamic> json) {
  return _SessionFilters.fromJson(json);
}

/// @nodoc
mixin _$SessionFilters {
  int get radiusMeters => throw _privateConstructorUsedError;
  List<Category> get categories => throw _privateConstructorUsedError;
  int? get priceLevelMax => throw _privateConstructorUsedError;
  bool get openNow => throw _privateConstructorUsedError;
  SessionTimeWindow? get timeWindow => throw _privateConstructorUsedError;

  /// Serializes this SessionFilters to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SessionFiltersCopyWith<SessionFilters> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionFiltersCopyWith<$Res> {
  factory $SessionFiltersCopyWith(
          SessionFilters value, $Res Function(SessionFilters) then) =
      _$SessionFiltersCopyWithImpl<$Res, SessionFilters>;
  @useResult
  $Res call(
      {int radiusMeters,
      List<Category> categories,
      int? priceLevelMax,
      bool openNow,
      SessionTimeWindow? timeWindow});

  $SessionTimeWindowCopyWith<$Res>? get timeWindow;
}

/// @nodoc
class _$SessionFiltersCopyWithImpl<$Res, $Val extends SessionFilters>
    implements $SessionFiltersCopyWith<$Res> {
  _$SessionFiltersCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? radiusMeters = null,
    Object? categories = null,
    Object? priceLevelMax = freezed,
    Object? openNow = null,
    Object? timeWindow = freezed,
  }) {
    return _then(_value.copyWith(
      radiusMeters: null == radiusMeters
          ? _value.radiusMeters
          : radiusMeters // ignore: cast_nullable_to_non_nullable
              as int,
      categories: null == categories
          ? _value.categories
          : categories // ignore: cast_nullable_to_non_nullable
              as List<Category>,
      priceLevelMax: freezed == priceLevelMax
          ? _value.priceLevelMax
          : priceLevelMax // ignore: cast_nullable_to_non_nullable
              as int?,
      openNow: null == openNow
          ? _value.openNow
          : openNow // ignore: cast_nullable_to_non_nullable
              as bool,
      timeWindow: freezed == timeWindow
          ? _value.timeWindow
          : timeWindow // ignore: cast_nullable_to_non_nullable
              as SessionTimeWindow?,
    ) as $Val);
  }

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $SessionTimeWindowCopyWith<$Res>? get timeWindow {
    if (_value.timeWindow == null) {
      return null;
    }

    return $SessionTimeWindowCopyWith<$Res>(_value.timeWindow!, (value) {
      return _then(_value.copyWith(timeWindow: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$SessionFiltersImplCopyWith<$Res>
    implements $SessionFiltersCopyWith<$Res> {
  factory _$$SessionFiltersImplCopyWith(_$SessionFiltersImpl value,
          $Res Function(_$SessionFiltersImpl) then) =
      __$$SessionFiltersImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int radiusMeters,
      List<Category> categories,
      int? priceLevelMax,
      bool openNow,
      SessionTimeWindow? timeWindow});

  @override
  $SessionTimeWindowCopyWith<$Res>? get timeWindow;
}

/// @nodoc
class __$$SessionFiltersImplCopyWithImpl<$Res>
    extends _$SessionFiltersCopyWithImpl<$Res, _$SessionFiltersImpl>
    implements _$$SessionFiltersImplCopyWith<$Res> {
  __$$SessionFiltersImplCopyWithImpl(
      _$SessionFiltersImpl _value, $Res Function(_$SessionFiltersImpl) _then)
      : super(_value, _then);

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? radiusMeters = null,
    Object? categories = null,
    Object? priceLevelMax = freezed,
    Object? openNow = null,
    Object? timeWindow = freezed,
  }) {
    return _then(_$SessionFiltersImpl(
      radiusMeters: null == radiusMeters
          ? _value.radiusMeters
          : radiusMeters // ignore: cast_nullable_to_non_nullable
              as int,
      categories: null == categories
          ? _value._categories
          : categories // ignore: cast_nullable_to_non_nullable
              as List<Category>,
      priceLevelMax: freezed == priceLevelMax
          ? _value.priceLevelMax
          : priceLevelMax // ignore: cast_nullable_to_non_nullable
              as int?,
      openNow: null == openNow
          ? _value.openNow
          : openNow // ignore: cast_nullable_to_non_nullable
              as bool,
      timeWindow: freezed == timeWindow
          ? _value.timeWindow
          : timeWindow // ignore: cast_nullable_to_non_nullable
              as SessionTimeWindow?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SessionFiltersImpl implements _SessionFilters {
  const _$SessionFiltersImpl(
      {this.radiusMeters = 5000,
      final List<Category> categories = const <Category>[],
      this.priceLevelMax,
      this.openNow = false,
      this.timeWindow})
      : _categories = categories;

  factory _$SessionFiltersImpl.fromJson(Map<String, dynamic> json) =>
      _$$SessionFiltersImplFromJson(json);

  @override
  @JsonKey()
  final int radiusMeters;
  final List<Category> _categories;
  @override
  @JsonKey()
  List<Category> get categories {
    if (_categories is EqualUnmodifiableListView) return _categories;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_categories);
  }

  @override
  final int? priceLevelMax;
  @override
  @JsonKey()
  final bool openNow;
  @override
  final SessionTimeWindow? timeWindow;

  @override
  String toString() {
    return 'SessionFilters(radiusMeters: $radiusMeters, categories: $categories, priceLevelMax: $priceLevelMax, openNow: $openNow, timeWindow: $timeWindow)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionFiltersImpl &&
            (identical(other.radiusMeters, radiusMeters) ||
                other.radiusMeters == radiusMeters) &&
            const DeepCollectionEquality()
                .equals(other._categories, _categories) &&
            (identical(other.priceLevelMax, priceLevelMax) ||
                other.priceLevelMax == priceLevelMax) &&
            (identical(other.openNow, openNow) || other.openNow == openNow) &&
            (identical(other.timeWindow, timeWindow) ||
                other.timeWindow == timeWindow));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      radiusMeters,
      const DeepCollectionEquality().hash(_categories),
      priceLevelMax,
      openNow,
      timeWindow);

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionFiltersImplCopyWith<_$SessionFiltersImpl> get copyWith =>
      __$$SessionFiltersImplCopyWithImpl<_$SessionFiltersImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SessionFiltersImplToJson(
      this,
    );
  }
}

abstract class _SessionFilters implements SessionFilters {
  const factory _SessionFilters(
      {final int radiusMeters,
      final List<Category> categories,
      final int? priceLevelMax,
      final bool openNow,
      final SessionTimeWindow? timeWindow}) = _$SessionFiltersImpl;

  factory _SessionFilters.fromJson(Map<String, dynamic> json) =
      _$SessionFiltersImpl.fromJson;

  @override
  int get radiusMeters;
  @override
  List<Category> get categories;
  @override
  int? get priceLevelMax;
  @override
  bool get openNow;
  @override
  SessionTimeWindow? get timeWindow;

  /// Create a copy of SessionFilters
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SessionFiltersImplCopyWith<_$SessionFiltersImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
