// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'session_member.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

SessionMember _$SessionMemberFromJson(Map<String, dynamic> json) {
  return _SessionMember.fromJson(json);
}

/// @nodoc
mixin _$SessionMember {
  String get id => throw _privateConstructorUsedError;
  String get displayName => throw _privateConstructorUsedError;
  List<String> get phonesE164 => throw _privateConstructorUsedError;

  /// Serializes this SessionMember to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SessionMember
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SessionMemberCopyWith<SessionMember> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionMemberCopyWith<$Res> {
  factory $SessionMemberCopyWith(
          SessionMember value, $Res Function(SessionMember) then) =
      _$SessionMemberCopyWithImpl<$Res, SessionMember>;
  @useResult
  $Res call({String id, String displayName, List<String> phonesE164});
}

/// @nodoc
class _$SessionMemberCopyWithImpl<$Res, $Val extends SessionMember>
    implements $SessionMemberCopyWith<$Res> {
  _$SessionMemberCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SessionMember
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? displayName = null,
    Object? phonesE164 = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      displayName: null == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String,
      phonesE164: null == phonesE164
          ? _value.phonesE164
          : phonesE164 // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SessionMemberImplCopyWith<$Res>
    implements $SessionMemberCopyWith<$Res> {
  factory _$$SessionMemberImplCopyWith(
          _$SessionMemberImpl value, $Res Function(_$SessionMemberImpl) then) =
      __$$SessionMemberImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String id, String displayName, List<String> phonesE164});
}

/// @nodoc
class __$$SessionMemberImplCopyWithImpl<$Res>
    extends _$SessionMemberCopyWithImpl<$Res, _$SessionMemberImpl>
    implements _$$SessionMemberImplCopyWith<$Res> {
  __$$SessionMemberImplCopyWithImpl(
      _$SessionMemberImpl _value, $Res Function(_$SessionMemberImpl) _then)
      : super(_value, _then);

  /// Create a copy of SessionMember
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? displayName = null,
    Object? phonesE164 = null,
  }) {
    return _then(_$SessionMemberImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      displayName: null == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String,
      phonesE164: null == phonesE164
          ? _value._phonesE164
          : phonesE164 // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SessionMemberImpl implements _SessionMember {
  const _$SessionMemberImpl(
      {required this.id,
      required this.displayName,
      final List<String> phonesE164 = const <String>[]})
      : _phonesE164 = phonesE164;

  factory _$SessionMemberImpl.fromJson(Map<String, dynamic> json) =>
      _$$SessionMemberImplFromJson(json);

  @override
  final String id;
  @override
  final String displayName;
  final List<String> _phonesE164;
  @override
  @JsonKey()
  List<String> get phonesE164 {
    if (_phonesE164 is EqualUnmodifiableListView) return _phonesE164;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_phonesE164);
  }

  @override
  String toString() {
    return 'SessionMember(id: $id, displayName: $displayName, phonesE164: $phonesE164)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionMemberImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.displayName, displayName) ||
                other.displayName == displayName) &&
            const DeepCollectionEquality()
                .equals(other._phonesE164, _phonesE164));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, displayName,
      const DeepCollectionEquality().hash(_phonesE164));

  /// Create a copy of SessionMember
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionMemberImplCopyWith<_$SessionMemberImpl> get copyWith =>
      __$$SessionMemberImplCopyWithImpl<_$SessionMemberImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SessionMemberImplToJson(
      this,
    );
  }
}

abstract class _SessionMember implements SessionMember {
  const factory _SessionMember(
      {required final String id,
      required final String displayName,
      final List<String> phonesE164}) = _$SessionMemberImpl;

  factory _SessionMember.fromJson(Map<String, dynamic> json) =
      _$SessionMemberImpl.fromJson;

  @override
  String get id;
  @override
  String get displayName;
  @override
  List<String> get phonesE164;

  /// Create a copy of SessionMember
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SessionMemberImplCopyWith<_$SessionMemberImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
