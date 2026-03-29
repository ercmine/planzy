// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'deck_batch.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

DeckSourceMix _$DeckSourceMixFromJson(Map<String, dynamic> json) {
  return _DeckSourceMix.fromJson(json);
}

/// @nodoc
mixin _$DeckSourceMix {
  List<String> get providersUsed => throw _privateConstructorUsedError;
  Map<String, int> get planSourceCounts => throw _privateConstructorUsedError;
  Map<String, int> get categoryCounts => throw _privateConstructorUsedError;
  int get sponsoredCount => throw _privateConstructorUsedError;

  /// Serializes this DeckSourceMix to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeckSourceMix
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeckSourceMixCopyWith<DeckSourceMix> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeckSourceMixCopyWith<$Res> {
  factory $DeckSourceMixCopyWith(
          DeckSourceMix value, $Res Function(DeckSourceMix) then) =
      _$DeckSourceMixCopyWithImpl<$Res, DeckSourceMix>;
  @useResult
  $Res call(
      {List<String> providersUsed,
      Map<String, int> planSourceCounts,
      Map<String, int> categoryCounts,
      int sponsoredCount});
}

/// @nodoc
class _$DeckSourceMixCopyWithImpl<$Res, $Val extends DeckSourceMix>
    implements $DeckSourceMixCopyWith<$Res> {
  _$DeckSourceMixCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeckSourceMix
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? providersUsed = null,
    Object? planSourceCounts = null,
    Object? categoryCounts = null,
    Object? sponsoredCount = null,
  }) {
    return _then(_value.copyWith(
      providersUsed: null == providersUsed
          ? _value.providersUsed
          : providersUsed // ignore: cast_nullable_to_non_nullable
              as List<String>,
      planSourceCounts: null == planSourceCounts
          ? _value.planSourceCounts
          : planSourceCounts // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      categoryCounts: null == categoryCounts
          ? _value.categoryCounts
          : categoryCounts // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      sponsoredCount: null == sponsoredCount
          ? _value.sponsoredCount
          : sponsoredCount // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DeckSourceMixImplCopyWith<$Res>
    implements $DeckSourceMixCopyWith<$Res> {
  factory _$$DeckSourceMixImplCopyWith(
          _$DeckSourceMixImpl value, $Res Function(_$DeckSourceMixImpl) then) =
      __$$DeckSourceMixImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<String> providersUsed,
      Map<String, int> planSourceCounts,
      Map<String, int> categoryCounts,
      int sponsoredCount});
}

/// @nodoc
class __$$DeckSourceMixImplCopyWithImpl<$Res>
    extends _$DeckSourceMixCopyWithImpl<$Res, _$DeckSourceMixImpl>
    implements _$$DeckSourceMixImplCopyWith<$Res> {
  __$$DeckSourceMixImplCopyWithImpl(
      _$DeckSourceMixImpl _value, $Res Function(_$DeckSourceMixImpl) _then)
      : super(_value, _then);

  /// Create a copy of DeckSourceMix
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? providersUsed = null,
    Object? planSourceCounts = null,
    Object? categoryCounts = null,
    Object? sponsoredCount = null,
  }) {
    return _then(_$DeckSourceMixImpl(
      providersUsed: null == providersUsed
          ? _value._providersUsed
          : providersUsed // ignore: cast_nullable_to_non_nullable
              as List<String>,
      planSourceCounts: null == planSourceCounts
          ? _value._planSourceCounts
          : planSourceCounts // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      categoryCounts: null == categoryCounts
          ? _value._categoryCounts
          : categoryCounts // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      sponsoredCount: null == sponsoredCount
          ? _value.sponsoredCount
          : sponsoredCount // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DeckSourceMixImpl implements _DeckSourceMix {
  const _$DeckSourceMixImpl(
      {final List<String> providersUsed = const <String>[],
      final Map<String, int> planSourceCounts = const <String, int>{},
      final Map<String, int> categoryCounts = const <String, int>{},
      this.sponsoredCount = 0})
      : _providersUsed = providersUsed,
        _planSourceCounts = planSourceCounts,
        _categoryCounts = categoryCounts;

  factory _$DeckSourceMixImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeckSourceMixImplFromJson(json);

  final List<String> _providersUsed;
  @override
  @JsonKey()
  List<String> get providersUsed {
    if (_providersUsed is EqualUnmodifiableListView) return _providersUsed;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_providersUsed);
  }

  final Map<String, int> _planSourceCounts;
  @override
  @JsonKey()
  Map<String, int> get planSourceCounts {
    if (_planSourceCounts is EqualUnmodifiableMapView) return _planSourceCounts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_planSourceCounts);
  }

  final Map<String, int> _categoryCounts;
  @override
  @JsonKey()
  Map<String, int> get categoryCounts {
    if (_categoryCounts is EqualUnmodifiableMapView) return _categoryCounts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_categoryCounts);
  }

  @override
  @JsonKey()
  final int sponsoredCount;

  @override
  String toString() {
    return 'DeckSourceMix(providersUsed: $providersUsed, planSourceCounts: $planSourceCounts, categoryCounts: $categoryCounts, sponsoredCount: $sponsoredCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeckSourceMixImpl &&
            const DeepCollectionEquality()
                .equals(other._providersUsed, _providersUsed) &&
            const DeepCollectionEquality()
                .equals(other._planSourceCounts, _planSourceCounts) &&
            const DeepCollectionEquality()
                .equals(other._categoryCounts, _categoryCounts) &&
            (identical(other.sponsoredCount, sponsoredCount) ||
                other.sponsoredCount == sponsoredCount));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_providersUsed),
      const DeepCollectionEquality().hash(_planSourceCounts),
      const DeepCollectionEquality().hash(_categoryCounts),
      sponsoredCount);

  /// Create a copy of DeckSourceMix
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeckSourceMixImplCopyWith<_$DeckSourceMixImpl> get copyWith =>
      __$$DeckSourceMixImplCopyWithImpl<_$DeckSourceMixImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DeckSourceMixImplToJson(
      this,
    );
  }
}

abstract class _DeckSourceMix implements DeckSourceMix {
  const factory _DeckSourceMix(
      {final List<String> providersUsed,
      final Map<String, int> planSourceCounts,
      final Map<String, int> categoryCounts,
      final int sponsoredCount}) = _$DeckSourceMixImpl;

  factory _DeckSourceMix.fromJson(Map<String, dynamic> json) =
      _$DeckSourceMixImpl.fromJson;

  @override
  List<String> get providersUsed;
  @override
  Map<String, int> get planSourceCounts;
  @override
  Map<String, int> get categoryCounts;
  @override
  int get sponsoredCount;

  /// Create a copy of DeckSourceMix
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeckSourceMixImplCopyWith<_$DeckSourceMixImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DeckDebug _$DeckDebugFromJson(Map<String, dynamic> json) {
  return _DeckDebug.fromJson(json);
}

/// @nodoc
mixin _$DeckDebug {
  String get requestId => throw _privateConstructorUsedError;
  bool? get cacheHit => throw _privateConstructorUsedError;

  /// Serializes this DeckDebug to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeckDebug
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeckDebugCopyWith<DeckDebug> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeckDebugCopyWith<$Res> {
  factory $DeckDebugCopyWith(DeckDebug value, $Res Function(DeckDebug) then) =
      _$DeckDebugCopyWithImpl<$Res, DeckDebug>;
  @useResult
  $Res call({String requestId, bool? cacheHit});
}

/// @nodoc
class _$DeckDebugCopyWithImpl<$Res, $Val extends DeckDebug>
    implements $DeckDebugCopyWith<$Res> {
  _$DeckDebugCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeckDebug
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? requestId = null,
    Object? cacheHit = freezed,
  }) {
    return _then(_value.copyWith(
      requestId: null == requestId
          ? _value.requestId
          : requestId // ignore: cast_nullable_to_non_nullable
              as String,
      cacheHit: freezed == cacheHit
          ? _value.cacheHit
          : cacheHit // ignore: cast_nullable_to_non_nullable
              as bool?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DeckDebugImplCopyWith<$Res>
    implements $DeckDebugCopyWith<$Res> {
  factory _$$DeckDebugImplCopyWith(
          _$DeckDebugImpl value, $Res Function(_$DeckDebugImpl) then) =
      __$$DeckDebugImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String requestId, bool? cacheHit});
}

/// @nodoc
class __$$DeckDebugImplCopyWithImpl<$Res>
    extends _$DeckDebugCopyWithImpl<$Res, _$DeckDebugImpl>
    implements _$$DeckDebugImplCopyWith<$Res> {
  __$$DeckDebugImplCopyWithImpl(
      _$DeckDebugImpl _value, $Res Function(_$DeckDebugImpl) _then)
      : super(_value, _then);

  /// Create a copy of DeckDebug
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? requestId = null,
    Object? cacheHit = freezed,
  }) {
    return _then(_$DeckDebugImpl(
      requestId: null == requestId
          ? _value.requestId
          : requestId // ignore: cast_nullable_to_non_nullable
              as String,
      cacheHit: freezed == cacheHit
          ? _value.cacheHit
          : cacheHit // ignore: cast_nullable_to_non_nullable
              as bool?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DeckDebugImpl implements _DeckDebug {
  const _$DeckDebugImpl({required this.requestId, this.cacheHit});

  factory _$DeckDebugImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeckDebugImplFromJson(json);

  @override
  final String requestId;
  @override
  final bool? cacheHit;

  @override
  String toString() {
    return 'DeckDebug(requestId: $requestId, cacheHit: $cacheHit)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeckDebugImpl &&
            (identical(other.requestId, requestId) ||
                other.requestId == requestId) &&
            (identical(other.cacheHit, cacheHit) ||
                other.cacheHit == cacheHit));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, requestId, cacheHit);

  /// Create a copy of DeckDebug
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeckDebugImplCopyWith<_$DeckDebugImpl> get copyWith =>
      __$$DeckDebugImplCopyWithImpl<_$DeckDebugImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DeckDebugImplToJson(
      this,
    );
  }
}

abstract class _DeckDebug implements DeckDebug {
  const factory _DeckDebug(
      {required final String requestId,
      final bool? cacheHit}) = _$DeckDebugImpl;

  factory _DeckDebug.fromJson(Map<String, dynamic> json) =
      _$DeckDebugImpl.fromJson;

  @override
  String get requestId;
  @override
  bool? get cacheHit;

  /// Create a copy of DeckDebug
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeckDebugImplCopyWith<_$DeckDebugImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DeckBatchResponse _$DeckBatchResponseFromJson(Map<String, dynamic> json) {
  return _DeckBatchResponse.fromJson(json);
}

/// @nodoc
mixin _$DeckBatchResponse {
  String get sessionId => throw _privateConstructorUsedError;
  List<Plan> get plans => throw _privateConstructorUsedError;
  String? get nextCursor => throw _privateConstructorUsedError;
  DeckSourceMix get mix => throw _privateConstructorUsedError;
  DeckDebug? get debug => throw _privateConstructorUsedError;

  /// Serializes this DeckBatchResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeckBatchResponseCopyWith<DeckBatchResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeckBatchResponseCopyWith<$Res> {
  factory $DeckBatchResponseCopyWith(
          DeckBatchResponse value, $Res Function(DeckBatchResponse) then) =
      _$DeckBatchResponseCopyWithImpl<$Res, DeckBatchResponse>;
  @useResult
  $Res call(
      {String sessionId,
      List<Plan> plans,
      String? nextCursor,
      DeckSourceMix mix,
      DeckDebug? debug});

  $DeckSourceMixCopyWith<$Res> get mix;
  $DeckDebugCopyWith<$Res>? get debug;
}

/// @nodoc
class _$DeckBatchResponseCopyWithImpl<$Res, $Val extends DeckBatchResponse>
    implements $DeckBatchResponseCopyWith<$Res> {
  _$DeckBatchResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? plans = null,
    Object? nextCursor = freezed,
    Object? mix = null,
    Object? debug = freezed,
  }) {
    return _then(_value.copyWith(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      plans: null == plans
          ? _value.plans
          : plans // ignore: cast_nullable_to_non_nullable
              as List<Plan>,
      nextCursor: freezed == nextCursor
          ? _value.nextCursor
          : nextCursor // ignore: cast_nullable_to_non_nullable
              as String?,
      mix: null == mix
          ? _value.mix
          : mix // ignore: cast_nullable_to_non_nullable
              as DeckSourceMix,
      debug: freezed == debug
          ? _value.debug
          : debug // ignore: cast_nullable_to_non_nullable
              as DeckDebug?,
    ) as $Val);
  }

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DeckSourceMixCopyWith<$Res> get mix {
    return $DeckSourceMixCopyWith<$Res>(_value.mix, (value) {
      return _then(_value.copyWith(mix: value) as $Val);
    });
  }

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DeckDebugCopyWith<$Res>? get debug {
    if (_value.debug == null) {
      return null;
    }

    return $DeckDebugCopyWith<$Res>(_value.debug!, (value) {
      return _then(_value.copyWith(debug: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$DeckBatchResponseImplCopyWith<$Res>
    implements $DeckBatchResponseCopyWith<$Res> {
  factory _$$DeckBatchResponseImplCopyWith(_$DeckBatchResponseImpl value,
          $Res Function(_$DeckBatchResponseImpl) then) =
      __$$DeckBatchResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String sessionId,
      List<Plan> plans,
      String? nextCursor,
      DeckSourceMix mix,
      DeckDebug? debug});

  @override
  $DeckSourceMixCopyWith<$Res> get mix;
  @override
  $DeckDebugCopyWith<$Res>? get debug;
}

/// @nodoc
class __$$DeckBatchResponseImplCopyWithImpl<$Res>
    extends _$DeckBatchResponseCopyWithImpl<$Res, _$DeckBatchResponseImpl>
    implements _$$DeckBatchResponseImplCopyWith<$Res> {
  __$$DeckBatchResponseImplCopyWithImpl(_$DeckBatchResponseImpl _value,
      $Res Function(_$DeckBatchResponseImpl) _then)
      : super(_value, _then);

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? plans = null,
    Object? nextCursor = freezed,
    Object? mix = null,
    Object? debug = freezed,
  }) {
    return _then(_$DeckBatchResponseImpl(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      plans: null == plans
          ? _value._plans
          : plans // ignore: cast_nullable_to_non_nullable
              as List<Plan>,
      nextCursor: freezed == nextCursor
          ? _value.nextCursor
          : nextCursor // ignore: cast_nullable_to_non_nullable
              as String?,
      mix: null == mix
          ? _value.mix
          : mix // ignore: cast_nullable_to_non_nullable
              as DeckSourceMix,
      debug: freezed == debug
          ? _value.debug
          : debug // ignore: cast_nullable_to_non_nullable
              as DeckDebug?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DeckBatchResponseImpl implements _DeckBatchResponse {
  const _$DeckBatchResponseImpl(
      {required this.sessionId,
      final List<Plan> plans = const <Plan>[],
      this.nextCursor,
      required this.mix,
      this.debug})
      : _plans = plans;

  factory _$DeckBatchResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeckBatchResponseImplFromJson(json);

  @override
  final String sessionId;
  final List<Plan> _plans;
  @override
  @JsonKey()
  List<Plan> get plans {
    if (_plans is EqualUnmodifiableListView) return _plans;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_plans);
  }

  @override
  final String? nextCursor;
  @override
  final DeckSourceMix mix;
  @override
  final DeckDebug? debug;

  @override
  String toString() {
    return 'DeckBatchResponse(sessionId: $sessionId, plans: $plans, nextCursor: $nextCursor, mix: $mix, debug: $debug)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeckBatchResponseImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            const DeepCollectionEquality().equals(other._plans, _plans) &&
            (identical(other.nextCursor, nextCursor) ||
                other.nextCursor == nextCursor) &&
            (identical(other.mix, mix) || other.mix == mix) &&
            (identical(other.debug, debug) || other.debug == debug));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, sessionId,
      const DeepCollectionEquality().hash(_plans), nextCursor, mix, debug);

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeckBatchResponseImplCopyWith<_$DeckBatchResponseImpl> get copyWith =>
      __$$DeckBatchResponseImplCopyWithImpl<_$DeckBatchResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DeckBatchResponseImplToJson(
      this,
    );
  }
}

abstract class _DeckBatchResponse implements DeckBatchResponse {
  const factory _DeckBatchResponse(
      {required final String sessionId,
      final List<Plan> plans,
      final String? nextCursor,
      required final DeckSourceMix mix,
      final DeckDebug? debug}) = _$DeckBatchResponseImpl;

  factory _DeckBatchResponse.fromJson(Map<String, dynamic> json) =
      _$DeckBatchResponseImpl.fromJson;

  @override
  String get sessionId;
  @override
  List<Plan> get plans;
  @override
  String? get nextCursor;
  @override
  DeckSourceMix get mix;
  @override
  DeckDebug? get debug;

  /// Create a copy of DeckBatchResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeckBatchResponseImplCopyWith<_$DeckBatchResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
