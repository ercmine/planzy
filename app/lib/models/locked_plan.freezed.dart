// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'locked_plan.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

LockedPlan _$LockedPlanFromJson(Map<String, dynamic> json) {
  return _LockedPlan.fromJson(json);
}

/// @nodoc
mixin _$LockedPlan {
  String get sessionId => throw _privateConstructorUsedError;
  String get planId => throw _privateConstructorUsedError;
  String get lockedAtISO => throw _privateConstructorUsedError;
  Plan? get planSnapshot => throw _privateConstructorUsedError;

  /// Serializes this LockedPlan to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LockedPlan
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LockedPlanCopyWith<LockedPlan> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LockedPlanCopyWith<$Res> {
  factory $LockedPlanCopyWith(
          LockedPlan value, $Res Function(LockedPlan) then) =
      _$LockedPlanCopyWithImpl<$Res, LockedPlan>;
  @useResult
  $Res call(
      {String sessionId,
      String planId,
      String lockedAtISO,
      Plan? planSnapshot});
}

/// @nodoc
class _$LockedPlanCopyWithImpl<$Res, $Val extends LockedPlan>
    implements $LockedPlanCopyWith<$Res> {
  _$LockedPlanCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LockedPlan
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? planId = null,
    Object? lockedAtISO = null,
    Object? planSnapshot = freezed,
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
      lockedAtISO: null == lockedAtISO
          ? _value.lockedAtISO
          : lockedAtISO // ignore: cast_nullable_to_non_nullable
              as String,
      planSnapshot: freezed == planSnapshot
          ? _value.planSnapshot
          : planSnapshot // ignore: cast_nullable_to_non_nullable
              as Plan?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LockedPlanImplCopyWith<$Res>
    implements $LockedPlanCopyWith<$Res> {
  factory _$$LockedPlanImplCopyWith(
          _$LockedPlanImpl value, $Res Function(_$LockedPlanImpl) then) =
      __$$LockedPlanImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String sessionId,
      String planId,
      String lockedAtISO,
      Plan? planSnapshot});
}

/// @nodoc
class __$$LockedPlanImplCopyWithImpl<$Res>
    extends _$LockedPlanCopyWithImpl<$Res, _$LockedPlanImpl>
    implements _$$LockedPlanImplCopyWith<$Res> {
  __$$LockedPlanImplCopyWithImpl(
      _$LockedPlanImpl _value, $Res Function(_$LockedPlanImpl) _then)
      : super(_value, _then);

  /// Create a copy of LockedPlan
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? planId = null,
    Object? lockedAtISO = null,
    Object? planSnapshot = freezed,
  }) {
    return _then(_$LockedPlanImpl(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      lockedAtISO: null == lockedAtISO
          ? _value.lockedAtISO
          : lockedAtISO // ignore: cast_nullable_to_non_nullable
              as String,
      planSnapshot: freezed == planSnapshot
          ? _value.planSnapshot
          : planSnapshot // ignore: cast_nullable_to_non_nullable
              as Plan?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LockedPlanImpl implements _LockedPlan {
  const _$LockedPlanImpl(
      {required this.sessionId,
      required this.planId,
      required this.lockedAtISO,
      this.planSnapshot});

  factory _$LockedPlanImpl.fromJson(Map<String, dynamic> json) =>
      _$$LockedPlanImplFromJson(json);

  @override
  final String sessionId;
  @override
  final String planId;
  @override
  final String lockedAtISO;
  @override
  final Plan? planSnapshot;

  @override
  String toString() {
    return 'LockedPlan(sessionId: $sessionId, planId: $planId, lockedAtISO: $lockedAtISO, planSnapshot: $planSnapshot)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LockedPlanImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.lockedAtISO, lockedAtISO) ||
                other.lockedAtISO == lockedAtISO) &&
            (identical(other.planSnapshot, planSnapshot) ||
                other.planSnapshot == planSnapshot));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, sessionId, planId, lockedAtISO, planSnapshot);

  /// Create a copy of LockedPlan
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LockedPlanImplCopyWith<_$LockedPlanImpl> get copyWith =>
      __$$LockedPlanImplCopyWithImpl<_$LockedPlanImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LockedPlanImplToJson(
      this,
    );
  }
}

abstract class _LockedPlan implements LockedPlan {
  const factory _LockedPlan(
      {required final String sessionId,
      required final String planId,
      required final String lockedAtISO,
      final Plan? planSnapshot}) = _$LockedPlanImpl;

  factory _LockedPlan.fromJson(Map<String, dynamic> json) =
      _$LockedPlanImpl.fromJson;

  @override
  String get sessionId;
  @override
  String get planId;
  @override
  String get lockedAtISO;
  @override
  Plan? get planSnapshot;

  /// Create a copy of LockedPlan
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LockedPlanImplCopyWith<_$LockedPlanImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
