// Run: flutter pub run build_runner build --delete-conflicting-outputs
import 'package:freezed_annotation/freezed_annotation.dart';

import 'session_filters.dart';
import 'session_member.dart';

part 'session.freezed.dart';
part 'session.g.dart';

@freezed
class Session with _$Session {
  const factory Session({
    required String sessionId,
    required String title,
    required String createdAtISO,
    required String updatedAtISO,
    required SessionFilters filters,
    @Default(<SessionMember>[]) List<SessionMember> members,
    @Default('active') String status,
    String? lastCursor,
  }) = _Session;

  factory Session.fromJson(Map<String, dynamic> json) =>
      _$SessionFromJson(<String, dynamic>{
        ...json,
        'sessionId': json['sessionId'] ?? json['id'],
      });
}

extension SessionCompatX on Session {
  String get id => sessionId;
}
