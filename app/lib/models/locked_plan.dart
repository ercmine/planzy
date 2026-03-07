import 'package:freezed_annotation/freezed_annotation.dart';

import 'plan.dart';

part 'locked_plan.freezed.dart';
part 'locked_plan.g.dart';

@freezed
class LockedPlan with _$LockedPlan {
  const factory LockedPlan({
    required String sessionId,
    required String planId,
    required String lockedAtISO,
    Plan? planSnapshot,
  }) = _LockedPlan;

  factory LockedPlan.fromJson(Map<String, dynamic> json) =>
      _$LockedPlanFromJson(json);
}
