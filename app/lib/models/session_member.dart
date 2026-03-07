// Run: flutter pub run build_runner build --delete-conflicting-outputs
import 'package:freezed_annotation/freezed_annotation.dart';

part 'session_member.freezed.dart';
part 'session_member.g.dart';

@freezed
class SessionMember with _$SessionMember {
  const factory SessionMember({
    required String id,
    required String displayName,
    @Default(<String>[]) List<String> phonesE164,
  }) = _SessionMember;

  factory SessionMember.fromJson(Map<String, dynamic> json) =>
      _$SessionMemberFromJson(json);
}
