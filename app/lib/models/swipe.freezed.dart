// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'swipe.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

SwipeRecord _$SwipeRecordFromJson(Map<String, dynamic> json) {
  return _SwipeRecord.fromJson(json);
}

/// @nodoc
mixin _$SwipeRecord {
  String get sessionId => throw _privateConstructorUsedError;
  String get planId => throw _privateConstructorUsedError;
  SwipeAction get action => throw _privateConstructorUsedError;
  String get atISO => throw _privateConstructorUsedError;
  Plan? get planSnapshot => throw _privateConstructorUsedError;
  int? get position => throw _privateConstructorUsedError;

  /// Serializes this SwipeRecord to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SwipeRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SwipeRecordCopyWith<SwipeRecord> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SwipeRecordCopyWith<$Res> {
  factory $SwipeRecordCopyWith(
          SwipeRecord value, $Res Function(SwipeRecord) then) =
      _$SwipeRecordCopyWithImpl<$Res, SwipeRecord>;
  @useResult
  $Res call(
      {String sessionId,
      String planId,
      SwipeAction action,
      String atISO,
      Plan? planSnapshot,
      int? position});
}

/// @nodoc
class _$SwipeRecordCopyWithImpl<$Res, $Val extends SwipeRecord>
    implements $SwipeRecordCopyWith<$Res> {
  _$SwipeRecordCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SwipeRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? planId = null,
    Object? action = null,
    Object? atISO = null,
    Object? planSnapshot = freezed,
    Object? position = freezed,
  }) {
    return _then(_value.copyWith(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      action: null == action
          ? _value.action
          : action // ignore: cast_nullable_to_non_nullable
              as SwipeAction,
      atISO: null == atISO
          ? _value.atISO
          : atISO // ignore: cast_nullable_to_non_nullable
              as String,
      planSnapshot: freezed == planSnapshot
          ? _value.planSnapshot
          : planSnapshot // ignore: cast_nullable_to_non_nullable
              as Plan?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SwipeRecordImplCopyWith<$Res>
    implements $SwipeRecordCopyWith<$Res> {
  factory _$$SwipeRecordImplCopyWith(
          _$SwipeRecordImpl value, $Res Function(_$SwipeRecordImpl) then) =
      __$$SwipeRecordImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String sessionId,
      String planId,
      SwipeAction action,
      String atISO,
      Plan? planSnapshot,
      int? position});
}

/// @nodoc
class __$$SwipeRecordImplCopyWithImpl<$Res>
    extends _$SwipeRecordCopyWithImpl<$Res, _$SwipeRecordImpl>
    implements _$$SwipeRecordImplCopyWith<$Res> {
  __$$SwipeRecordImplCopyWithImpl(
      _$SwipeRecordImpl _value, $Res Function(_$SwipeRecordImpl) _then)
      : super(_value, _then);

  /// Create a copy of SwipeRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? planId = null,
    Object? action = null,
    Object? atISO = null,
    Object? planSnapshot = freezed,
    Object? position = freezed,
  }) {
    return _then(_$SwipeRecordImpl(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      action: null == action
          ? _value.action
          : action // ignore: cast_nullable_to_non_nullable
              as SwipeAction,
      atISO: null == atISO
          ? _value.atISO
          : atISO // ignore: cast_nullable_to_non_nullable
              as String,
      planSnapshot: freezed == planSnapshot
          ? _value.planSnapshot
          : planSnapshot // ignore: cast_nullable_to_non_nullable
              as Plan?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SwipeRecordImpl implements _SwipeRecord {
  const _$SwipeRecordImpl(
      {required this.sessionId,
      required this.planId,
      required this.action,
      required this.atISO,
      this.planSnapshot,
      this.position});

  factory _$SwipeRecordImpl.fromJson(Map<String, dynamic> json) =>
      _$$SwipeRecordImplFromJson(json);

  @override
  final String sessionId;
  @override
  final String planId;
  @override
  final SwipeAction action;
  @override
  final String atISO;
  @override
  final Plan? planSnapshot;
  @override
  final int? position;

  @override
  String toString() {
    return 'SwipeRecord(sessionId: $sessionId, planId: $planId, action: $action, atISO: $atISO, planSnapshot: $planSnapshot, position: $position)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SwipeRecordImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.action, action) || other.action == action) &&
            (identical(other.atISO, atISO) || other.atISO == atISO) &&
            (identical(other.planSnapshot, planSnapshot) ||
                other.planSnapshot == planSnapshot) &&
            (identical(other.position, position) ||
                other.position == position));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, sessionId, planId, action, atISO, planSnapshot, position);

  /// Create a copy of SwipeRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SwipeRecordImplCopyWith<_$SwipeRecordImpl> get copyWith =>
      __$$SwipeRecordImplCopyWithImpl<_$SwipeRecordImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SwipeRecordImplToJson(
      this,
    );
  }
}

abstract class _SwipeRecord implements SwipeRecord {
  const factory _SwipeRecord(
      {required final String sessionId,
      required final String planId,
      required final SwipeAction action,
      required final String atISO,
      final Plan? planSnapshot,
      final int? position}) = _$SwipeRecordImpl;

  factory _SwipeRecord.fromJson(Map<String, dynamic> json) =
      _$SwipeRecordImpl.fromJson;

  @override
  String get sessionId;
  @override
  String get planId;
  @override
  SwipeAction get action;
  @override
  String get atISO;
  @override
  Plan? get planSnapshot;
  @override
  int? get position;

  /// Create a copy of SwipeRecord
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SwipeRecordImplCopyWith<_$SwipeRecordImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
