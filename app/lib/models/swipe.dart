import 'package:freezed_annotation/freezed_annotation.dart';

import 'plan.dart';

part 'swipe.freezed.dart';
part 'swipe.g.dart';

@JsonEnum(fieldRename: FieldRename.snake)
enum SwipeAction { yes, no, maybe }

@freezed
class SwipeRecord with _$SwipeRecord {
  const factory SwipeRecord({
    required String sessionId,
    required String planId,
    required SwipeAction action,
    required String atISO,
    Plan? planSnapshot,
    int? position,
  }) = _SwipeRecord;

  factory SwipeRecord.fromJson(Map<String, dynamic> json) =>
      _$SwipeRecordFromJson(json);
}
