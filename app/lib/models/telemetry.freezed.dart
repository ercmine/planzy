// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'telemetry.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TelemetryEventInput _$TelemetryEventInputFromJson(Map<String, dynamic> json) {
  switch (json['runtimeType']) {
    case 'deckLoaded':
      return DeckLoadedEventInput.fromJson(json);
    case 'cardViewed':
      return CardViewedEventInput.fromJson(json);
    case 'cardOpened':
      return CardOpenedEventInput.fromJson(json);
    case 'swipe':
      return SwipeEventInput.fromJson(json);
    case 'outboundLinkClicked':
      return OutboundLinkClickedEventInput.fromJson(json);

    default:
      throw CheckedFromJsonException(json, 'runtimeType', 'TelemetryEventInput',
          'Invalid union type "${json['runtimeType']}"!');
  }
}

/// @nodoc
mixin _$TelemetryEventInput {
  String get event => throw _privateConstructorUsedError;
  String? get clientAtISO => throw _privateConstructorUsedError;
  String? get deckKey => throw _privateConstructorUsedError;
  String? get cursor => throw _privateConstructorUsedError;
  int? get position => throw _privateConstructorUsedError;
  String? get source => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  /// Serializes this TelemetryEventInput to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TelemetryEventInputCopyWith<TelemetryEventInput> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TelemetryEventInputCopyWith<$Res> {
  factory $TelemetryEventInputCopyWith(
          TelemetryEventInput value, $Res Function(TelemetryEventInput) then) =
      _$TelemetryEventInputCopyWithImpl<$Res, TelemetryEventInput>;
  @useResult
  $Res call(
      {String event,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class _$TelemetryEventInputCopyWithImpl<$Res, $Val extends TelemetryEventInput>
    implements $TelemetryEventInputCopyWith<$Res> {
  _$TelemetryEventInputCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_value.copyWith(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DeckLoadedEventInputImplCopyWith<$Res>
    implements $TelemetryEventInputCopyWith<$Res> {
  factory _$$DeckLoadedEventInputImplCopyWith(_$DeckLoadedEventInputImpl value,
          $Res Function(_$DeckLoadedEventInputImpl) then) =
      __$$DeckLoadedEventInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String event,
      int batchSize,
      int returned,
      bool nextCursorPresent,
      Map<String, int>? planSourceCounts,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class __$$DeckLoadedEventInputImplCopyWithImpl<$Res>
    extends _$TelemetryEventInputCopyWithImpl<$Res, _$DeckLoadedEventInputImpl>
    implements _$$DeckLoadedEventInputImplCopyWith<$Res> {
  __$$DeckLoadedEventInputImplCopyWithImpl(_$DeckLoadedEventInputImpl _value,
      $Res Function(_$DeckLoadedEventInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? batchSize = null,
    Object? returned = null,
    Object? nextCursorPresent = null,
    Object? planSourceCounts = freezed,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_$DeckLoadedEventInputImpl(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      batchSize: null == batchSize
          ? _value.batchSize
          : batchSize // ignore: cast_nullable_to_non_nullable
              as int,
      returned: null == returned
          ? _value.returned
          : returned // ignore: cast_nullable_to_non_nullable
              as int,
      nextCursorPresent: null == nextCursorPresent
          ? _value.nextCursorPresent
          : nextCursorPresent // ignore: cast_nullable_to_non_nullable
              as bool,
      planSourceCounts: freezed == planSourceCounts
          ? _value._planSourceCounts
          : planSourceCounts // ignore: cast_nullable_to_non_nullable
              as Map<String, int>?,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DeckLoadedEventInputImpl implements DeckLoadedEventInput {
  const _$DeckLoadedEventInputImpl(
      {this.event = 'deck_loaded',
      required this.batchSize,
      required this.returned,
      required this.nextCursorPresent,
      final Map<String, int>? planSourceCounts,
      this.clientAtISO,
      this.deckKey,
      this.cursor,
      this.position,
      this.source,
      final String? $type})
      : _planSourceCounts = planSourceCounts,
        $type = $type ?? 'deckLoaded';

  factory _$DeckLoadedEventInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeckLoadedEventInputImplFromJson(json);

  @override
  @JsonKey()
  final String event;
  @override
  final int batchSize;
  @override
  final int returned;
  @override
  final bool nextCursorPresent;
  final Map<String, int>? _planSourceCounts;
  @override
  Map<String, int>? get planSourceCounts {
    final value = _planSourceCounts;
    if (value == null) return null;
    if (_planSourceCounts is EqualUnmodifiableMapView) return _planSourceCounts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final String? clientAtISO;
  @override
  final String? deckKey;
  @override
  final String? cursor;
  @override
  final int? position;
  @override
  final String? source;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'TelemetryEventInput.deckLoaded(event: $event, batchSize: $batchSize, returned: $returned, nextCursorPresent: $nextCursorPresent, planSourceCounts: $planSourceCounts, clientAtISO: $clientAtISO, deckKey: $deckKey, cursor: $cursor, position: $position, source: $source)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeckLoadedEventInputImpl &&
            (identical(other.event, event) || other.event == event) &&
            (identical(other.batchSize, batchSize) ||
                other.batchSize == batchSize) &&
            (identical(other.returned, returned) ||
                other.returned == returned) &&
            (identical(other.nextCursorPresent, nextCursorPresent) ||
                other.nextCursorPresent == nextCursorPresent) &&
            const DeepCollectionEquality()
                .equals(other._planSourceCounts, _planSourceCounts) &&
            (identical(other.clientAtISO, clientAtISO) ||
                other.clientAtISO == clientAtISO) &&
            (identical(other.deckKey, deckKey) || other.deckKey == deckKey) &&
            (identical(other.cursor, cursor) || other.cursor == cursor) &&
            (identical(other.position, position) ||
                other.position == position) &&
            (identical(other.source, source) || other.source == source));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      event,
      batchSize,
      returned,
      nextCursorPresent,
      const DeepCollectionEquality().hash(_planSourceCounts),
      clientAtISO,
      deckKey,
      cursor,
      position,
      source);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeckLoadedEventInputImplCopyWith<_$DeckLoadedEventInputImpl>
      get copyWith =>
          __$$DeckLoadedEventInputImplCopyWithImpl<_$DeckLoadedEventInputImpl>(
              this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) {
    return deckLoaded(event, batchSize, returned, nextCursorPresent,
        planSourceCounts, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) {
    return deckLoaded?.call(event, batchSize, returned, nextCursorPresent,
        planSourceCounts, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (deckLoaded != null) {
      return deckLoaded(event, batchSize, returned, nextCursorPresent,
          planSourceCounts, clientAtISO, deckKey, cursor, position, source);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) {
    return deckLoaded(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) {
    return deckLoaded?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (deckLoaded != null) {
      return deckLoaded(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$DeckLoadedEventInputImplToJson(
      this,
    );
  }
}

abstract class DeckLoadedEventInput implements TelemetryEventInput {
  const factory DeckLoadedEventInput(
      {final String event,
      required final int batchSize,
      required final int returned,
      required final bool nextCursorPresent,
      final Map<String, int>? planSourceCounts,
      final String? clientAtISO,
      final String? deckKey,
      final String? cursor,
      final int? position,
      final String? source}) = _$DeckLoadedEventInputImpl;

  factory DeckLoadedEventInput.fromJson(Map<String, dynamic> json) =
      _$DeckLoadedEventInputImpl.fromJson;

  @override
  String get event;
  int get batchSize;
  int get returned;
  bool get nextCursorPresent;
  Map<String, int>? get planSourceCounts;
  @override
  String? get clientAtISO;
  @override
  String? get deckKey;
  @override
  String? get cursor;
  @override
  int? get position;
  @override
  String? get source;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeckLoadedEventInputImplCopyWith<_$DeckLoadedEventInputImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$CardViewedEventInputImplCopyWith<$Res>
    implements $TelemetryEventInputCopyWith<$Res> {
  factory _$$CardViewedEventInputImplCopyWith(_$CardViewedEventInputImpl value,
          $Res Function(_$CardViewedEventInputImpl) then) =
      __$$CardViewedEventInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String event,
      String planId,
      int? viewMs,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class __$$CardViewedEventInputImplCopyWithImpl<$Res>
    extends _$TelemetryEventInputCopyWithImpl<$Res, _$CardViewedEventInputImpl>
    implements _$$CardViewedEventInputImplCopyWith<$Res> {
  __$$CardViewedEventInputImplCopyWithImpl(_$CardViewedEventInputImpl _value,
      $Res Function(_$CardViewedEventInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? planId = null,
    Object? viewMs = freezed,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_$CardViewedEventInputImpl(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      viewMs: freezed == viewMs
          ? _value.viewMs
          : viewMs // ignore: cast_nullable_to_non_nullable
              as int?,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CardViewedEventInputImpl implements CardViewedEventInput {
  const _$CardViewedEventInputImpl(
      {this.event = 'card_viewed',
      required this.planId,
      this.viewMs,
      this.clientAtISO,
      this.deckKey,
      this.cursor,
      this.position,
      this.source,
      final String? $type})
      : $type = $type ?? 'cardViewed';

  factory _$CardViewedEventInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$CardViewedEventInputImplFromJson(json);

  @override
  @JsonKey()
  final String event;
  @override
  final String planId;
  @override
  final int? viewMs;
  @override
  final String? clientAtISO;
  @override
  final String? deckKey;
  @override
  final String? cursor;
  @override
  final int? position;
  @override
  final String? source;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'TelemetryEventInput.cardViewed(event: $event, planId: $planId, viewMs: $viewMs, clientAtISO: $clientAtISO, deckKey: $deckKey, cursor: $cursor, position: $position, source: $source)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CardViewedEventInputImpl &&
            (identical(other.event, event) || other.event == event) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.viewMs, viewMs) || other.viewMs == viewMs) &&
            (identical(other.clientAtISO, clientAtISO) ||
                other.clientAtISO == clientAtISO) &&
            (identical(other.deckKey, deckKey) || other.deckKey == deckKey) &&
            (identical(other.cursor, cursor) || other.cursor == cursor) &&
            (identical(other.position, position) ||
                other.position == position) &&
            (identical(other.source, source) || other.source == source));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, event, planId, viewMs,
      clientAtISO, deckKey, cursor, position, source);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CardViewedEventInputImplCopyWith<_$CardViewedEventInputImpl>
      get copyWith =>
          __$$CardViewedEventInputImplCopyWithImpl<_$CardViewedEventInputImpl>(
              this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) {
    return cardViewed(
        event, planId, viewMs, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) {
    return cardViewed?.call(
        event, planId, viewMs, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (cardViewed != null) {
      return cardViewed(event, planId, viewMs, clientAtISO, deckKey, cursor,
          position, source);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) {
    return cardViewed(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) {
    return cardViewed?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (cardViewed != null) {
      return cardViewed(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$CardViewedEventInputImplToJson(
      this,
    );
  }
}

abstract class CardViewedEventInput implements TelemetryEventInput {
  const factory CardViewedEventInput(
      {final String event,
      required final String planId,
      final int? viewMs,
      final String? clientAtISO,
      final String? deckKey,
      final String? cursor,
      final int? position,
      final String? source}) = _$CardViewedEventInputImpl;

  factory CardViewedEventInput.fromJson(Map<String, dynamic> json) =
      _$CardViewedEventInputImpl.fromJson;

  @override
  String get event;
  String get planId;
  int? get viewMs;
  @override
  String? get clientAtISO;
  @override
  String? get deckKey;
  @override
  String? get cursor;
  @override
  int? get position;
  @override
  String? get source;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CardViewedEventInputImplCopyWith<_$CardViewedEventInputImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$CardOpenedEventInputImplCopyWith<$Res>
    implements $TelemetryEventInputCopyWith<$Res> {
  factory _$$CardOpenedEventInputImplCopyWith(_$CardOpenedEventInputImpl value,
          $Res Function(_$CardOpenedEventInputImpl) then) =
      __$$CardOpenedEventInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String event,
      String planId,
      String? section,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class __$$CardOpenedEventInputImplCopyWithImpl<$Res>
    extends _$TelemetryEventInputCopyWithImpl<$Res, _$CardOpenedEventInputImpl>
    implements _$$CardOpenedEventInputImplCopyWith<$Res> {
  __$$CardOpenedEventInputImplCopyWithImpl(_$CardOpenedEventInputImpl _value,
      $Res Function(_$CardOpenedEventInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? planId = null,
    Object? section = freezed,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_$CardOpenedEventInputImpl(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      section: freezed == section
          ? _value.section
          : section // ignore: cast_nullable_to_non_nullable
              as String?,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CardOpenedEventInputImpl implements CardOpenedEventInput {
  const _$CardOpenedEventInputImpl(
      {this.event = 'card_opened',
      required this.planId,
      this.section,
      this.clientAtISO,
      this.deckKey,
      this.cursor,
      this.position,
      this.source,
      final String? $type})
      : $type = $type ?? 'cardOpened';

  factory _$CardOpenedEventInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$CardOpenedEventInputImplFromJson(json);

  @override
  @JsonKey()
  final String event;
  @override
  final String planId;
  @override
  final String? section;
  @override
  final String? clientAtISO;
  @override
  final String? deckKey;
  @override
  final String? cursor;
  @override
  final int? position;
  @override
  final String? source;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'TelemetryEventInput.cardOpened(event: $event, planId: $planId, section: $section, clientAtISO: $clientAtISO, deckKey: $deckKey, cursor: $cursor, position: $position, source: $source)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CardOpenedEventInputImpl &&
            (identical(other.event, event) || other.event == event) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.section, section) || other.section == section) &&
            (identical(other.clientAtISO, clientAtISO) ||
                other.clientAtISO == clientAtISO) &&
            (identical(other.deckKey, deckKey) || other.deckKey == deckKey) &&
            (identical(other.cursor, cursor) || other.cursor == cursor) &&
            (identical(other.position, position) ||
                other.position == position) &&
            (identical(other.source, source) || other.source == source));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, event, planId, section,
      clientAtISO, deckKey, cursor, position, source);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CardOpenedEventInputImplCopyWith<_$CardOpenedEventInputImpl>
      get copyWith =>
          __$$CardOpenedEventInputImplCopyWithImpl<_$CardOpenedEventInputImpl>(
              this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) {
    return cardOpened(
        event, planId, section, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) {
    return cardOpened?.call(
        event, planId, section, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (cardOpened != null) {
      return cardOpened(event, planId, section, clientAtISO, deckKey, cursor,
          position, source);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) {
    return cardOpened(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) {
    return cardOpened?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (cardOpened != null) {
      return cardOpened(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$CardOpenedEventInputImplToJson(
      this,
    );
  }
}

abstract class CardOpenedEventInput implements TelemetryEventInput {
  const factory CardOpenedEventInput(
      {final String event,
      required final String planId,
      final String? section,
      final String? clientAtISO,
      final String? deckKey,
      final String? cursor,
      final int? position,
      final String? source}) = _$CardOpenedEventInputImpl;

  factory CardOpenedEventInput.fromJson(Map<String, dynamic> json) =
      _$CardOpenedEventInputImpl.fromJson;

  @override
  String get event;
  String get planId;
  String? get section;
  @override
  String? get clientAtISO;
  @override
  String? get deckKey;
  @override
  String? get cursor;
  @override
  int? get position;
  @override
  String? get source;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CardOpenedEventInputImplCopyWith<_$CardOpenedEventInputImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$SwipeEventInputImplCopyWith<$Res>
    implements $TelemetryEventInputCopyWith<$Res> {
  factory _$$SwipeEventInputImplCopyWith(_$SwipeEventInputImpl value,
          $Res Function(_$SwipeEventInputImpl) then) =
      __$$SwipeEventInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String event,
      String planId,
      String action,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class __$$SwipeEventInputImplCopyWithImpl<$Res>
    extends _$TelemetryEventInputCopyWithImpl<$Res, _$SwipeEventInputImpl>
    implements _$$SwipeEventInputImplCopyWith<$Res> {
  __$$SwipeEventInputImplCopyWithImpl(
      _$SwipeEventInputImpl _value, $Res Function(_$SwipeEventInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? planId = null,
    Object? action = null,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_$SwipeEventInputImpl(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      action: null == action
          ? _value.action
          : action // ignore: cast_nullable_to_non_nullable
              as String,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SwipeEventInputImpl implements SwipeEventInput {
  const _$SwipeEventInputImpl(
      {this.event = 'swipe',
      required this.planId,
      required this.action,
      this.clientAtISO,
      this.deckKey,
      this.cursor,
      this.position,
      this.source,
      final String? $type})
      : $type = $type ?? 'swipe';

  factory _$SwipeEventInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$SwipeEventInputImplFromJson(json);

  @override
  @JsonKey()
  final String event;
  @override
  final String planId;
  @override
  final String action;
  @override
  final String? clientAtISO;
  @override
  final String? deckKey;
  @override
  final String? cursor;
  @override
  final int? position;
  @override
  final String? source;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'TelemetryEventInput.swipe(event: $event, planId: $planId, action: $action, clientAtISO: $clientAtISO, deckKey: $deckKey, cursor: $cursor, position: $position, source: $source)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SwipeEventInputImpl &&
            (identical(other.event, event) || other.event == event) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.action, action) || other.action == action) &&
            (identical(other.clientAtISO, clientAtISO) ||
                other.clientAtISO == clientAtISO) &&
            (identical(other.deckKey, deckKey) || other.deckKey == deckKey) &&
            (identical(other.cursor, cursor) || other.cursor == cursor) &&
            (identical(other.position, position) ||
                other.position == position) &&
            (identical(other.source, source) || other.source == source));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, event, planId, action,
      clientAtISO, deckKey, cursor, position, source);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SwipeEventInputImplCopyWith<_$SwipeEventInputImpl> get copyWith =>
      __$$SwipeEventInputImplCopyWithImpl<_$SwipeEventInputImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) {
    return swipe(
        event, planId, action, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) {
    return swipe?.call(
        event, planId, action, clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (swipe != null) {
      return swipe(event, planId, action, clientAtISO, deckKey, cursor,
          position, source);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) {
    return swipe(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) {
    return swipe?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (swipe != null) {
      return swipe(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$SwipeEventInputImplToJson(
      this,
    );
  }
}

abstract class SwipeEventInput implements TelemetryEventInput {
  const factory SwipeEventInput(
      {final String event,
      required final String planId,
      required final String action,
      final String? clientAtISO,
      final String? deckKey,
      final String? cursor,
      final int? position,
      final String? source}) = _$SwipeEventInputImpl;

  factory SwipeEventInput.fromJson(Map<String, dynamic> json) =
      _$SwipeEventInputImpl.fromJson;

  @override
  String get event;
  String get planId;
  String get action;
  @override
  String? get clientAtISO;
  @override
  String? get deckKey;
  @override
  String? get cursor;
  @override
  int? get position;
  @override
  String? get source;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SwipeEventInputImplCopyWith<_$SwipeEventInputImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$OutboundLinkClickedEventInputImplCopyWith<$Res>
    implements $TelemetryEventInputCopyWith<$Res> {
  factory _$$OutboundLinkClickedEventInputImplCopyWith(
          _$OutboundLinkClickedEventInputImpl value,
          $Res Function(_$OutboundLinkClickedEventInputImpl) then) =
      __$$OutboundLinkClickedEventInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String event,
      String planId,
      String linkType,
      bool? affiliate,
      String? clientAtISO,
      String? deckKey,
      String? cursor,
      int? position,
      String? source});
}

/// @nodoc
class __$$OutboundLinkClickedEventInputImplCopyWithImpl<$Res>
    extends _$TelemetryEventInputCopyWithImpl<$Res,
        _$OutboundLinkClickedEventInputImpl>
    implements _$$OutboundLinkClickedEventInputImplCopyWith<$Res> {
  __$$OutboundLinkClickedEventInputImplCopyWithImpl(
      _$OutboundLinkClickedEventInputImpl _value,
      $Res Function(_$OutboundLinkClickedEventInputImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? event = null,
    Object? planId = null,
    Object? linkType = null,
    Object? affiliate = freezed,
    Object? clientAtISO = freezed,
    Object? deckKey = freezed,
    Object? cursor = freezed,
    Object? position = freezed,
    Object? source = freezed,
  }) {
    return _then(_$OutboundLinkClickedEventInputImpl(
      event: null == event
          ? _value.event
          : event // ignore: cast_nullable_to_non_nullable
              as String,
      planId: null == planId
          ? _value.planId
          : planId // ignore: cast_nullable_to_non_nullable
              as String,
      linkType: null == linkType
          ? _value.linkType
          : linkType // ignore: cast_nullable_to_non_nullable
              as String,
      affiliate: freezed == affiliate
          ? _value.affiliate
          : affiliate // ignore: cast_nullable_to_non_nullable
              as bool?,
      clientAtISO: freezed == clientAtISO
          ? _value.clientAtISO
          : clientAtISO // ignore: cast_nullable_to_non_nullable
              as String?,
      deckKey: freezed == deckKey
          ? _value.deckKey
          : deckKey // ignore: cast_nullable_to_non_nullable
              as String?,
      cursor: freezed == cursor
          ? _value.cursor
          : cursor // ignore: cast_nullable_to_non_nullable
              as String?,
      position: freezed == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as int?,
      source: freezed == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OutboundLinkClickedEventInputImpl
    implements OutboundLinkClickedEventInput {
  const _$OutboundLinkClickedEventInputImpl(
      {this.event = 'outbound_link_clicked',
      required this.planId,
      required this.linkType,
      this.affiliate,
      this.clientAtISO,
      this.deckKey,
      this.cursor,
      this.position,
      this.source,
      final String? $type})
      : $type = $type ?? 'outboundLinkClicked';

  factory _$OutboundLinkClickedEventInputImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$OutboundLinkClickedEventInputImplFromJson(json);

  @override
  @JsonKey()
  final String event;
  @override
  final String planId;
  @override
  final String linkType;
  @override
  final bool? affiliate;
  @override
  final String? clientAtISO;
  @override
  final String? deckKey;
  @override
  final String? cursor;
  @override
  final int? position;
  @override
  final String? source;

  @JsonKey(name: 'runtimeType')
  final String $type;

  @override
  String toString() {
    return 'TelemetryEventInput.outboundLinkClicked(event: $event, planId: $planId, linkType: $linkType, affiliate: $affiliate, clientAtISO: $clientAtISO, deckKey: $deckKey, cursor: $cursor, position: $position, source: $source)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OutboundLinkClickedEventInputImpl &&
            (identical(other.event, event) || other.event == event) &&
            (identical(other.planId, planId) || other.planId == planId) &&
            (identical(other.linkType, linkType) ||
                other.linkType == linkType) &&
            (identical(other.affiliate, affiliate) ||
                other.affiliate == affiliate) &&
            (identical(other.clientAtISO, clientAtISO) ||
                other.clientAtISO == clientAtISO) &&
            (identical(other.deckKey, deckKey) || other.deckKey == deckKey) &&
            (identical(other.cursor, cursor) || other.cursor == cursor) &&
            (identical(other.position, position) ||
                other.position == position) &&
            (identical(other.source, source) || other.source == source));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, event, planId, linkType,
      affiliate, clientAtISO, deckKey, cursor, position, source);

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OutboundLinkClickedEventInputImplCopyWith<
          _$OutboundLinkClickedEventInputImpl>
      get copyWith => __$$OutboundLinkClickedEventInputImplCopyWithImpl<
          _$OutboundLinkClickedEventInputImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        deckLoaded,
    required TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardViewed,
    required TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        cardOpened,
    required TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        swipe,
    required TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)
        outboundLinkClicked,
  }) {
    return outboundLinkClicked(event, planId, linkType, affiliate, clientAtISO,
        deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult? Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult? Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult? Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult? Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
  }) {
    return outboundLinkClicked?.call(event, planId, linkType, affiliate,
        clientAtISO, deckKey, cursor, position, source);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(
            String event,
            int batchSize,
            int returned,
            bool nextCursorPresent,
            Map<String, int>? planSourceCounts,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        deckLoaded,
    TResult Function(
            String event,
            String planId,
            int? viewMs,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardViewed,
    TResult Function(
            String event,
            String planId,
            String? section,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        cardOpened,
    TResult Function(
            String event,
            String planId,
            String action,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        swipe,
    TResult Function(
            String event,
            String planId,
            String linkType,
            bool? affiliate,
            String? clientAtISO,
            String? deckKey,
            String? cursor,
            int? position,
            String? source)?
        outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (outboundLinkClicked != null) {
      return outboundLinkClicked(event, planId, linkType, affiliate,
          clientAtISO, deckKey, cursor, position, source);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(DeckLoadedEventInput value) deckLoaded,
    required TResult Function(CardViewedEventInput value) cardViewed,
    required TResult Function(CardOpenedEventInput value) cardOpened,
    required TResult Function(SwipeEventInput value) swipe,
    required TResult Function(OutboundLinkClickedEventInput value)
        outboundLinkClicked,
  }) {
    return outboundLinkClicked(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(DeckLoadedEventInput value)? deckLoaded,
    TResult? Function(CardViewedEventInput value)? cardViewed,
    TResult? Function(CardOpenedEventInput value)? cardOpened,
    TResult? Function(SwipeEventInput value)? swipe,
    TResult? Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
  }) {
    return outboundLinkClicked?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(DeckLoadedEventInput value)? deckLoaded,
    TResult Function(CardViewedEventInput value)? cardViewed,
    TResult Function(CardOpenedEventInput value)? cardOpened,
    TResult Function(SwipeEventInput value)? swipe,
    TResult Function(OutboundLinkClickedEventInput value)? outboundLinkClicked,
    required TResult orElse(),
  }) {
    if (outboundLinkClicked != null) {
      return outboundLinkClicked(this);
    }
    return orElse();
  }

  @override
  Map<String, dynamic> toJson() {
    return _$$OutboundLinkClickedEventInputImplToJson(
      this,
    );
  }
}

abstract class OutboundLinkClickedEventInput implements TelemetryEventInput {
  const factory OutboundLinkClickedEventInput(
      {final String event,
      required final String planId,
      required final String linkType,
      final bool? affiliate,
      final String? clientAtISO,
      final String? deckKey,
      final String? cursor,
      final int? position,
      final String? source}) = _$OutboundLinkClickedEventInputImpl;

  factory OutboundLinkClickedEventInput.fromJson(Map<String, dynamic> json) =
      _$OutboundLinkClickedEventInputImpl.fromJson;

  @override
  String get event;
  String get planId;
  String get linkType;
  bool? get affiliate;
  @override
  String? get clientAtISO;
  @override
  String? get deckKey;
  @override
  String? get cursor;
  @override
  int? get position;
  @override
  String? get source;

  /// Create a copy of TelemetryEventInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OutboundLinkClickedEventInputImplCopyWith<
          _$OutboundLinkClickedEventInputImpl>
      get copyWith => throw _privateConstructorUsedError;
}

TelemetryBatchRequest _$TelemetryBatchRequestFromJson(
    Map<String, dynamic> json) {
  return _TelemetryBatchRequest.fromJson(json);
}

/// @nodoc
mixin _$TelemetryBatchRequest {
  List<TelemetryEventInput> get events => throw _privateConstructorUsedError;

  /// Serializes this TelemetryBatchRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TelemetryBatchRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TelemetryBatchRequestCopyWith<TelemetryBatchRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TelemetryBatchRequestCopyWith<$Res> {
  factory $TelemetryBatchRequestCopyWith(TelemetryBatchRequest value,
          $Res Function(TelemetryBatchRequest) then) =
      _$TelemetryBatchRequestCopyWithImpl<$Res, TelemetryBatchRequest>;
  @useResult
  $Res call({List<TelemetryEventInput> events});
}

/// @nodoc
class _$TelemetryBatchRequestCopyWithImpl<$Res,
        $Val extends TelemetryBatchRequest>
    implements $TelemetryBatchRequestCopyWith<$Res> {
  _$TelemetryBatchRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TelemetryBatchRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? events = null,
  }) {
    return _then(_value.copyWith(
      events: null == events
          ? _value.events
          : events // ignore: cast_nullable_to_non_nullable
              as List<TelemetryEventInput>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TelemetryBatchRequestImplCopyWith<$Res>
    implements $TelemetryBatchRequestCopyWith<$Res> {
  factory _$$TelemetryBatchRequestImplCopyWith(
          _$TelemetryBatchRequestImpl value,
          $Res Function(_$TelemetryBatchRequestImpl) then) =
      __$$TelemetryBatchRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<TelemetryEventInput> events});
}

/// @nodoc
class __$$TelemetryBatchRequestImplCopyWithImpl<$Res>
    extends _$TelemetryBatchRequestCopyWithImpl<$Res,
        _$TelemetryBatchRequestImpl>
    implements _$$TelemetryBatchRequestImplCopyWith<$Res> {
  __$$TelemetryBatchRequestImplCopyWithImpl(_$TelemetryBatchRequestImpl _value,
      $Res Function(_$TelemetryBatchRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of TelemetryBatchRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? events = null,
  }) {
    return _then(_$TelemetryBatchRequestImpl(
      events: null == events
          ? _value._events
          : events // ignore: cast_nullable_to_non_nullable
              as List<TelemetryEventInput>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TelemetryBatchRequestImpl implements _TelemetryBatchRequest {
  const _$TelemetryBatchRequestImpl(
      {required final List<TelemetryEventInput> events})
      : _events = events;

  factory _$TelemetryBatchRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$TelemetryBatchRequestImplFromJson(json);

  final List<TelemetryEventInput> _events;
  @override
  List<TelemetryEventInput> get events {
    if (_events is EqualUnmodifiableListView) return _events;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_events);
  }

  @override
  String toString() {
    return 'TelemetryBatchRequest(events: $events)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TelemetryBatchRequestImpl &&
            const DeepCollectionEquality().equals(other._events, _events));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_events));

  /// Create a copy of TelemetryBatchRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TelemetryBatchRequestImplCopyWith<_$TelemetryBatchRequestImpl>
      get copyWith => __$$TelemetryBatchRequestImplCopyWithImpl<
          _$TelemetryBatchRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TelemetryBatchRequestImplToJson(
      this,
    );
  }
}

abstract class _TelemetryBatchRequest implements TelemetryBatchRequest {
  const factory _TelemetryBatchRequest(
          {required final List<TelemetryEventInput> events}) =
      _$TelemetryBatchRequestImpl;

  factory _TelemetryBatchRequest.fromJson(Map<String, dynamic> json) =
      _$TelemetryBatchRequestImpl.fromJson;

  @override
  List<TelemetryEventInput> get events;

  /// Create a copy of TelemetryBatchRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TelemetryBatchRequestImplCopyWith<_$TelemetryBatchRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}
