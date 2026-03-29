// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'deep_links.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

DeepLinks _$DeepLinksFromJson(Map<String, dynamic> json) {
  return _DeepLinks.fromJson(json);
}

/// @nodoc
mixin _$DeepLinks {
  String? get mapsLink => throw _privateConstructorUsedError;
  String? get websiteLink => throw _privateConstructorUsedError;
  String? get callLink => throw _privateConstructorUsedError;
  String? get bookingLink => throw _privateConstructorUsedError;
  String? get ticketLink => throw _privateConstructorUsedError;

  /// Serializes this DeepLinks to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeepLinks
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeepLinksCopyWith<DeepLinks> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeepLinksCopyWith<$Res> {
  factory $DeepLinksCopyWith(DeepLinks value, $Res Function(DeepLinks) then) =
      _$DeepLinksCopyWithImpl<$Res, DeepLinks>;
  @useResult
  $Res call(
      {String? mapsLink,
      String? websiteLink,
      String? callLink,
      String? bookingLink,
      String? ticketLink});
}

/// @nodoc
class _$DeepLinksCopyWithImpl<$Res, $Val extends DeepLinks>
    implements $DeepLinksCopyWith<$Res> {
  _$DeepLinksCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeepLinks
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? mapsLink = freezed,
    Object? websiteLink = freezed,
    Object? callLink = freezed,
    Object? bookingLink = freezed,
    Object? ticketLink = freezed,
  }) {
    return _then(_value.copyWith(
      mapsLink: freezed == mapsLink
          ? _value.mapsLink
          : mapsLink // ignore: cast_nullable_to_non_nullable
              as String?,
      websiteLink: freezed == websiteLink
          ? _value.websiteLink
          : websiteLink // ignore: cast_nullable_to_non_nullable
              as String?,
      callLink: freezed == callLink
          ? _value.callLink
          : callLink // ignore: cast_nullable_to_non_nullable
              as String?,
      bookingLink: freezed == bookingLink
          ? _value.bookingLink
          : bookingLink // ignore: cast_nullable_to_non_nullable
              as String?,
      ticketLink: freezed == ticketLink
          ? _value.ticketLink
          : ticketLink // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DeepLinksImplCopyWith<$Res>
    implements $DeepLinksCopyWith<$Res> {
  factory _$$DeepLinksImplCopyWith(
          _$DeepLinksImpl value, $Res Function(_$DeepLinksImpl) then) =
      __$$DeepLinksImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String? mapsLink,
      String? websiteLink,
      String? callLink,
      String? bookingLink,
      String? ticketLink});
}

/// @nodoc
class __$$DeepLinksImplCopyWithImpl<$Res>
    extends _$DeepLinksCopyWithImpl<$Res, _$DeepLinksImpl>
    implements _$$DeepLinksImplCopyWith<$Res> {
  __$$DeepLinksImplCopyWithImpl(
      _$DeepLinksImpl _value, $Res Function(_$DeepLinksImpl) _then)
      : super(_value, _then);

  /// Create a copy of DeepLinks
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? mapsLink = freezed,
    Object? websiteLink = freezed,
    Object? callLink = freezed,
    Object? bookingLink = freezed,
    Object? ticketLink = freezed,
  }) {
    return _then(_$DeepLinksImpl(
      mapsLink: freezed == mapsLink
          ? _value.mapsLink
          : mapsLink // ignore: cast_nullable_to_non_nullable
              as String?,
      websiteLink: freezed == websiteLink
          ? _value.websiteLink
          : websiteLink // ignore: cast_nullable_to_non_nullable
              as String?,
      callLink: freezed == callLink
          ? _value.callLink
          : callLink // ignore: cast_nullable_to_non_nullable
              as String?,
      bookingLink: freezed == bookingLink
          ? _value.bookingLink
          : bookingLink // ignore: cast_nullable_to_non_nullable
              as String?,
      ticketLink: freezed == ticketLink
          ? _value.ticketLink
          : ticketLink // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DeepLinksImpl implements _DeepLinks {
  const _$DeepLinksImpl(
      {this.mapsLink,
      this.websiteLink,
      this.callLink,
      this.bookingLink,
      this.ticketLink});

  factory _$DeepLinksImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeepLinksImplFromJson(json);

  @override
  final String? mapsLink;
  @override
  final String? websiteLink;
  @override
  final String? callLink;
  @override
  final String? bookingLink;
  @override
  final String? ticketLink;

  @override
  String toString() {
    return 'DeepLinks(mapsLink: $mapsLink, websiteLink: $websiteLink, callLink: $callLink, bookingLink: $bookingLink, ticketLink: $ticketLink)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeepLinksImpl &&
            (identical(other.mapsLink, mapsLink) ||
                other.mapsLink == mapsLink) &&
            (identical(other.websiteLink, websiteLink) ||
                other.websiteLink == websiteLink) &&
            (identical(other.callLink, callLink) ||
                other.callLink == callLink) &&
            (identical(other.bookingLink, bookingLink) ||
                other.bookingLink == bookingLink) &&
            (identical(other.ticketLink, ticketLink) ||
                other.ticketLink == ticketLink));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, mapsLink, websiteLink, callLink, bookingLink, ticketLink);

  /// Create a copy of DeepLinks
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeepLinksImplCopyWith<_$DeepLinksImpl> get copyWith =>
      __$$DeepLinksImplCopyWithImpl<_$DeepLinksImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DeepLinksImplToJson(
      this,
    );
  }
}

abstract class _DeepLinks implements DeepLinks {
  const factory _DeepLinks(
      {final String? mapsLink,
      final String? websiteLink,
      final String? callLink,
      final String? bookingLink,
      final String? ticketLink}) = _$DeepLinksImpl;

  factory _DeepLinks.fromJson(Map<String, dynamic> json) =
      _$DeepLinksImpl.fromJson;

  @override
  String? get mapsLink;
  @override
  String? get websiteLink;
  @override
  String? get callLink;
  @override
  String? get bookingLink;
  @override
  String? get ticketLink;

  /// Create a copy of DeepLinks
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeepLinksImplCopyWith<_$DeepLinksImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
