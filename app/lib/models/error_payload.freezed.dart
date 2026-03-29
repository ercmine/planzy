// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'error_payload.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ErrorPayload _$ErrorPayloadFromJson(Map<String, dynamic> json) {
  switch (json['runtimeType']) {
    case 'validationError':
      return ValidationErrorPayload.fromJson(json);
    case 'providerError':
      return ProviderErrorPayload.fromJson(json);
    case 'policyViolation':
      return PolicyViolationPayload.fromJson(json);
    case 'unknown':
      return UnknownErrorPayload.fromJson(json);

    default:
      throw CheckedFromJsonException(json, 'runtimeType', 'ErrorPayload',
          'Invalid union type "${json['runtimeType']}"!');
  }
}

/// @nodoc
mixin _$ErrorPayload {
  String get error => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String error, List<String> details)
        validationError,
    required TResult Function(String error, String? code, bool? retryable)
        providerError,
    required TResult Function(String error, String? message) policyViolation,
    required TResult Function(
            String error, String? message, Map<String, dynamic>? raw)
        unknown,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String error, List<String> details)? validationError,
    TResult? Function(String error, String? code, bool? retryable)?
        providerError,
    TResult? Function(String error, String? message)? policyViolation,
    TResult? Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String error, List<String> details)? validationError,
    TResult Function(String error, String? code, bool? retryable)?
        providerError,
    TResult Function(String error, String? message)? policyViolation,
    TResult Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ValidationErrorPayload value) validationError,
    required TResult Function(ProviderErrorPayload value) providerError,
    required TResult Function(PolicyViolationPayload value) policyViolation,
    required TResult Function(UnknownErrorPayload value) unknown,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ValidationErrorPayload value)? validationError,
    TResult? Function(ProviderErrorPayload value)? providerError,
    TResult? Function(PolicyViolationPayload value)? policyViolation,
    TResult? Function(UnknownErrorPayload value)? unknown,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ValidationErrorPayload value)? validationError,
    TResult Function(ProviderErrorPayload value)? providerError,
    TResult Function(PolicyViolationPayload value)? policyViolation,
    TResult Function(UnknownErrorPayload value)? unknown,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  /// Serializes this ErrorPayload to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ErrorPayloadCopyWith<ErrorPayload> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ErrorPayloadCopyWith<$Res> {
  factory $ErrorPayloadCopyWith(
          ErrorPayload value, $Res Function(ErrorPayload) then) =
      _$ErrorPayloadCopyWithImpl<$Res, ErrorPayload>;
  @useResult
  $Res call({String error});
}

/// @nodoc
class _$ErrorPayloadCopyWithImpl<$Res, $Val extends ErrorPayload>
    implements $ErrorPayloadCopyWith<$Res> {
  _$ErrorPayloadCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = null,
  }) {
    return _then(_value.copyWith(
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ValidationErrorPayloadImplCopyWith<$Res>
    implements $ErrorPayloadCopyWith<$Res> {
  factory _$$ValidationErrorPayloadImplCopyWith(
          _$ValidationErrorPayloadImpl value,
          $Res Function(_$ValidationErrorPayloadImpl) then) =
      __$$ValidationErrorPayloadImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String error, List<String> details});
}

/// @nodoc
class __$$ValidationErrorPayloadImplCopyWithImpl<$Res>
    extends _$ErrorPayloadCopyWithImpl<$Res, _$ValidationErrorPayloadImpl>
    implements _$$ValidationErrorPayloadImplCopyWith<$Res> {
  __$$ValidationErrorPayloadImplCopyWithImpl(
      _$ValidationErrorPayloadImpl _value,
      $Res Function(_$ValidationErrorPayloadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = null,
    Object? details = null,
  }) {
    return _then(_$ValidationErrorPayloadImpl(
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
      details: null == details
          ? _value._details
          : details // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ValidationErrorPayloadImpl implements ValidationErrorPayload {
  const _$ValidationErrorPayloadImpl(
      {this.error = 'validation_error',
      final List<String> details = const <String>[],
      final String? $type})
      : _details = details,
        $type = $type ?? 'validationError';

  factory _$ValidationErrorPayloadImpl.fromJson(Map<String, dynamic> json) =>
      _$$ValidationErrorPayloadImplFromJson(json);

  @override
  @JsonKey()
  final String error;
  final List<String> _details;
  @override
  @JsonKey()
  List<String> get details {
    if (_details is EqualUnmodifiableListView) return _details;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_details);
  }

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ErrorPayload.validationError(error: $error, details: $details)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ValidationErrorPayloadImpl &&
            (identical(other.error, error) || other.error == error) &&
            const DeepCollectionEquality().equals(other._details, _details));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, error, const DeepCollectionEquality().hash(_details));

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ValidationErrorPayloadImplCopyWith<_$ValidationErrorPayloadImpl>
      get copyWith => __$$ValidationErrorPayloadImplCopyWithImpl<
          _$ValidationErrorPayloadImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String error, List<String> details)
        validationError,
    required TResult Function(String error, String? code, bool? retryable)
        providerError,
    required TResult Function(String error, String? message) policyViolation,
    required TResult Function(
            String error, String? message, Map<String, dynamic>? raw)
        unknown,
  }) {
    return validationError(error, details);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String error, List<String> details)? validationError,
    TResult? Function(String error, String? code, bool? retryable)?
        providerError,
    TResult? Function(String error, String? message)? policyViolation,
    TResult? Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
  }) {
    return validationError?.call(error, details);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String error, List<String> details)? validationError,
    TResult Function(String error, String? code, bool? retryable)?
        providerError,
    TResult Function(String error, String? message)? policyViolation,
    TResult Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
    required TResult orElse(),
  }) {
    if (validationError != null) {
      return validationError(error, details);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ValidationErrorPayload value) validationError,
    required TResult Function(ProviderErrorPayload value) providerError,
    required TResult Function(PolicyViolationPayload value) policyViolation,
    required TResult Function(UnknownErrorPayload value) unknown,
  }) {
    return validationError(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ValidationErrorPayload value)? validationError,
    TResult? Function(ProviderErrorPayload value)? providerError,
    TResult? Function(PolicyViolationPayload value)? policyViolation,
    TResult? Function(UnknownErrorPayload value)? unknown,
  }) {
    return validationError?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ValidationErrorPayload value)? validationError,
    TResult Function(ProviderErrorPayload value)? providerError,
    TResult Function(PolicyViolationPayload value)? policyViolation,
    TResult Function(UnknownErrorPayload value)? unknown,
    required TResult orElse(),
  }) {
    if (validationError != null) {
      return validationError(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ValidationErrorPayloadImplToJson(
      this,
    );
  }
}

abstract class ValidationErrorPayload implements ErrorPayload {
  const factory ValidationErrorPayload(
      {final String error,
      final List<String> details}) = _$ValidationErrorPayloadImpl;

  factory ValidationErrorPayload.fromJson(Map<String, dynamic> json) =
      _$ValidationErrorPayloadImpl.fromJson;

  @override
  String get error;
  List<String> get details;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ValidationErrorPayloadImplCopyWith<_$ValidationErrorPayloadImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ProviderErrorPayloadImplCopyWith<$Res>
    implements $ErrorPayloadCopyWith<$Res> {
  factory _$$ProviderErrorPayloadImplCopyWith(_$ProviderErrorPayloadImpl value,
          $Res Function(_$ProviderErrorPayloadImpl) then) =
      __$$ProviderErrorPayloadImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String error, String? code, bool? retryable});
}

/// @nodoc
class __$$ProviderErrorPayloadImplCopyWithImpl<$Res>
    extends _$ErrorPayloadCopyWithImpl<$Res, _$ProviderErrorPayloadImpl>
    implements _$$ProviderErrorPayloadImplCopyWith<$Res> {
  __$$ProviderErrorPayloadImplCopyWithImpl(_$ProviderErrorPayloadImpl _value,
      $Res Function(_$ProviderErrorPayloadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = null,
    Object? code = freezed,
    Object? retryable = freezed,
  }) {
    return _then(_$ProviderErrorPayloadImpl(
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
      code: freezed == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String?,
      retryable: freezed == retryable
          ? _value.retryable
          : retryable // ignore: cast_nullable_to_non_nullable
              as bool?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProviderErrorPayloadImpl implements ProviderErrorPayload {
  const _$ProviderErrorPayloadImpl(
      {this.error = 'provider_error',
      this.code,
      this.retryable,
      final String? $type})
      : $type = $type ?? 'providerError';

  factory _$ProviderErrorPayloadImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProviderErrorPayloadImplFromJson(json);

  @override
  @JsonKey()
  final String error;
  @override
  final String? code;
  @override
  final bool? retryable;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ErrorPayload.providerError(error: $error, code: $code, retryable: $retryable)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProviderErrorPayloadImpl &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.retryable, retryable) ||
                other.retryable == retryable));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, error, code, retryable);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProviderErrorPayloadImplCopyWith<_$ProviderErrorPayloadImpl>
      get copyWith =>
          __$$ProviderErrorPayloadImplCopyWithImpl<_$ProviderErrorPayloadImpl>(
              this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String error, List<String> details)
        validationError,
    required TResult Function(String error, String? code, bool? retryable)
        providerError,
    required TResult Function(String error, String? message) policyViolation,
    required TResult Function(
            String error, String? message, Map<String, dynamic>? raw)
        unknown,
  }) {
    return providerError(error, code, retryable);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String error, List<String> details)? validationError,
    TResult? Function(String error, String? code, bool? retryable)?
        providerError,
    TResult? Function(String error, String? message)? policyViolation,
    TResult? Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
  }) {
    return providerError?.call(error, code, retryable);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String error, List<String> details)? validationError,
    TResult Function(String error, String? code, bool? retryable)?
        providerError,
    TResult Function(String error, String? message)? policyViolation,
    TResult Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
    required TResult orElse(),
  }) {
    if (providerError != null) {
      return providerError(error, code, retryable);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ValidationErrorPayload value) validationError,
    required TResult Function(ProviderErrorPayload value) providerError,
    required TResult Function(PolicyViolationPayload value) policyViolation,
    required TResult Function(UnknownErrorPayload value) unknown,
  }) {
    return providerError(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ValidationErrorPayload value)? validationError,
    TResult? Function(ProviderErrorPayload value)? providerError,
    TResult? Function(PolicyViolationPayload value)? policyViolation,
    TResult? Function(UnknownErrorPayload value)? unknown,
  }) {
    return providerError?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ValidationErrorPayload value)? validationError,
    TResult Function(ProviderErrorPayload value)? providerError,
    TResult Function(PolicyViolationPayload value)? policyViolation,
    TResult Function(UnknownErrorPayload value)? unknown,
    required TResult orElse(),
  }) {
    if (providerError != null) {
      return providerError(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$ProviderErrorPayloadImplToJson(
      this,
    );
  }
}

abstract class ProviderErrorPayload implements ErrorPayload {
  const factory ProviderErrorPayload(
      {final String error,
      final String? code,
      final bool? retryable}) = _$ProviderErrorPayloadImpl;

  factory ProviderErrorPayload.fromJson(Map<String, dynamic> json) =
      _$ProviderErrorPayloadImpl.fromJson;

  @override
  String get error;
  String? get code;
  bool? get retryable;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProviderErrorPayloadImplCopyWith<_$ProviderErrorPayloadImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$PolicyViolationPayloadImplCopyWith<$Res>
    implements $ErrorPayloadCopyWith<$Res> {
  factory _$$PolicyViolationPayloadImplCopyWith(
          _$PolicyViolationPayloadImpl value,
          $Res Function(_$PolicyViolationPayloadImpl) then) =
      __$$PolicyViolationPayloadImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String error, String? message});
}

/// @nodoc
class __$$PolicyViolationPayloadImplCopyWithImpl<$Res>
    extends _$ErrorPayloadCopyWithImpl<$Res, _$PolicyViolationPayloadImpl>
    implements _$$PolicyViolationPayloadImplCopyWith<$Res> {
  __$$PolicyViolationPayloadImplCopyWithImpl(
      _$PolicyViolationPayloadImpl _value,
      $Res Function(_$PolicyViolationPayloadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = null,
    Object? message = freezed,
  }) {
    return _then(_$PolicyViolationPayloadImpl(
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PolicyViolationPayloadImpl implements PolicyViolationPayload {
  const _$PolicyViolationPayloadImpl(
      {this.error = 'policy_violation', this.message, final String? $type})
      : $type = $type ?? 'policyViolation';

  factory _$PolicyViolationPayloadImpl.fromJson(Map<String, dynamic> json) =>
      _$$PolicyViolationPayloadImplFromJson(json);

  @override
  @JsonKey()
  final String error;
  @override
  final String? message;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ErrorPayload.policyViolation(error: $error, message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PolicyViolationPayloadImpl &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.message, message) || other.message == message));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, error, message);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PolicyViolationPayloadImplCopyWith<_$PolicyViolationPayloadImpl>
      get copyWith => __$$PolicyViolationPayloadImplCopyWithImpl<
          _$PolicyViolationPayloadImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String error, List<String> details)
        validationError,
    required TResult Function(String error, String? code, bool? retryable)
        providerError,
    required TResult Function(String error, String? message) policyViolation,
    required TResult Function(
            String error, String? message, Map<String, dynamic>? raw)
        unknown,
  }) {
    return policyViolation(error, message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String error, List<String> details)? validationError,
    TResult? Function(String error, String? code, bool? retryable)?
        providerError,
    TResult? Function(String error, String? message)? policyViolation,
    TResult? Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
  }) {
    return policyViolation?.call(error, message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String error, List<String> details)? validationError,
    TResult Function(String error, String? code, bool? retryable)?
        providerError,
    TResult Function(String error, String? message)? policyViolation,
    TResult Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
    required TResult orElse(),
  }) {
    if (policyViolation != null) {
      return policyViolation(error, message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ValidationErrorPayload value) validationError,
    required TResult Function(ProviderErrorPayload value) providerError,
    required TResult Function(PolicyViolationPayload value) policyViolation,
    required TResult Function(UnknownErrorPayload value) unknown,
  }) {
    return policyViolation(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ValidationErrorPayload value)? validationError,
    TResult? Function(ProviderErrorPayload value)? providerError,
    TResult? Function(PolicyViolationPayload value)? policyViolation,
    TResult? Function(UnknownErrorPayload value)? unknown,
  }) {
    return policyViolation?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ValidationErrorPayload value)? validationError,
    TResult Function(ProviderErrorPayload value)? providerError,
    TResult Function(PolicyViolationPayload value)? policyViolation,
    TResult Function(UnknownErrorPayload value)? unknown,
    required TResult orElse(),
  }) {
    if (policyViolation != null) {
      return policyViolation(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$PolicyViolationPayloadImplToJson(
      this,
    );
  }
}

abstract class PolicyViolationPayload implements ErrorPayload {
  const factory PolicyViolationPayload(
      {final String error,
      final String? message}) = _$PolicyViolationPayloadImpl;

  factory PolicyViolationPayload.fromJson(Map<String, dynamic> json) =
      _$PolicyViolationPayloadImpl.fromJson;

  @override
  String get error;
  String? get message;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PolicyViolationPayloadImplCopyWith<_$PolicyViolationPayloadImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$UnknownErrorPayloadImplCopyWith<$Res>
    implements $ErrorPayloadCopyWith<$Res> {
  factory _$$UnknownErrorPayloadImplCopyWith(_$UnknownErrorPayloadImpl value,
          $Res Function(_$UnknownErrorPayloadImpl) then) =
      __$$UnknownErrorPayloadImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String error, String? message, Map<String, dynamic>? raw});
}

/// @nodoc
class __$$UnknownErrorPayloadImplCopyWithImpl<$Res>
    extends _$ErrorPayloadCopyWithImpl<$Res, _$UnknownErrorPayloadImpl>
    implements _$$UnknownErrorPayloadImplCopyWith<$Res> {
  __$$UnknownErrorPayloadImplCopyWithImpl(_$UnknownErrorPayloadImpl _value,
      $Res Function(_$UnknownErrorPayloadImpl) _then)
      : super(_value, _then);

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? error = null,
    Object? message = freezed,
    Object? raw = freezed,
  }) {
    return _then(_$UnknownErrorPayloadImpl(
      error: null == error
          ? _value.error
          : error // ignore: cast_nullable_to_non_nullable
              as String,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
      raw: freezed == raw
          ? _value._raw
          : raw // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UnknownErrorPayloadImpl implements UnknownErrorPayload {
  const _$UnknownErrorPayloadImpl(
      {this.error = 'unknown',
      this.message,
      final Map<String, dynamic>? raw,
      final String? $type})
      : _raw = raw,
        $type = $type ?? 'unknown';

  factory _$UnknownErrorPayloadImpl.fromJson(Map<String, dynamic> json) =>
      _$$UnknownErrorPayloadImplFromJson(json);

  @override
  @JsonKey()
  final String error;
  @override
  final String? message;
  final Map<String, dynamic>? _raw;
  @override
  Map<String, dynamic>? get raw {
    final value = _raw;
    if (value == null) return null;
    if (_raw is EqualUnmodifiableMapView) return _raw;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'ErrorPayload.unknown(error: $error, message: $message, raw: $raw)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UnknownErrorPayloadImpl &&
            (identical(other.error, error) || other.error == error) &&
            (identical(other.message, message) || other.message == message) &&
            const DeepCollectionEquality().equals(other._raw, _raw));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, error, message, const DeepCollectionEquality().hash(_raw));

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UnknownErrorPayloadImplCopyWith<_$UnknownErrorPayloadImpl> get copyWith =>
      __$$UnknownErrorPayloadImplCopyWithImpl<_$UnknownErrorPayloadImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String error, List<String> details)
        validationError,
    required TResult Function(String error, String? code, bool? retryable)
        providerError,
    required TResult Function(String error, String? message) policyViolation,
    required TResult Function(
            String error, String? message, Map<String, dynamic>? raw)
        unknown,
  }) {
    return unknown(error, message, raw);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String error, List<String> details)? validationError,
    TResult? Function(String error, String? code, bool? retryable)?
        providerError,
    TResult? Function(String error, String? message)? policyViolation,
    TResult? Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
  }) {
    return unknown?.call(error, message, raw);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String error, List<String> details)? validationError,
    TResult Function(String error, String? code, bool? retryable)?
        providerError,
    TResult Function(String error, String? message)? policyViolation,
    TResult Function(String error, String? message, Map<String, dynamic>? raw)?
        unknown,
    required TResult orElse(),
  }) {
    if (unknown != null) {
      return unknown(error, message, raw);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ValidationErrorPayload value) validationError,
    required TResult Function(ProviderErrorPayload value) providerError,
    required TResult Function(PolicyViolationPayload value) policyViolation,
    required TResult Function(UnknownErrorPayload value) unknown,
  }) {
    return unknown(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ValidationErrorPayload value)? validationError,
    TResult? Function(ProviderErrorPayload value)? providerError,
    TResult? Function(PolicyViolationPayload value)? policyViolation,
    TResult? Function(UnknownErrorPayload value)? unknown,
  }) {
    return unknown?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ValidationErrorPayload value)? validationError,
    TResult Function(ProviderErrorPayload value)? providerError,
    TResult Function(PolicyViolationPayload value)? policyViolation,
    TResult Function(UnknownErrorPayload value)? unknown,
    required TResult orElse(),
  }) {
    if (unknown != null) {
      return unknown(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$UnknownErrorPayloadImplToJson(
      this,
    );
  }
}

abstract class UnknownErrorPayload implements ErrorPayload {
  const factory UnknownErrorPayload(
      {final String error,
      final String? message,
      final Map<String, dynamic>? raw}) = _$UnknownErrorPayloadImpl;

  factory UnknownErrorPayload.fromJson(Map<String, dynamic> json) =
      _$UnknownErrorPayloadImpl.fromJson;

  @override
  String get error;
  String? get message;
  Map<String, dynamic>? get raw;

  /// Create a copy of ErrorPayload
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UnknownErrorPayloadImplCopyWith<_$UnknownErrorPayloadImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
