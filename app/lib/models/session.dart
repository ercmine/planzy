import 'session_filters.dart';
import 'session_member.dart';

class Session {
  const Session({
    required this.sessionId,
    required this.title,
    required this.createdAtISO,
    required this.updatedAtISO,
    required this.filters,
    this.members = const <SessionMember>[],
    this.status = 'active',
    this.lastCursor,
  });

  final String sessionId;
  final String title;
  final String createdAtISO;
  final String updatedAtISO;
  final SessionFilters filters;
  final List<SessionMember> members;
  final String status;
  final String? lastCursor;


  Session copyWith({
    String? sessionId,
    String? title,
    String? createdAtISO,
    String? updatedAtISO,
    SessionFilters? filters,
    List<SessionMember>? members,
    String? status,
    String? lastCursor,
  }) =>
      Session(
        sessionId: sessionId ?? this.sessionId,
        title: title ?? this.title,
        createdAtISO: createdAtISO ?? this.createdAtISO,
        updatedAtISO: updatedAtISO ?? this.updatedAtISO,
        filters: filters ?? this.filters,
        members: members ?? this.members,
        status: status ?? this.status,
        lastCursor: lastCursor ?? this.lastCursor,
      );
  factory Session.fromJson(Map<String, dynamic> json) => Session(
        sessionId: (json['sessionId'] ?? json['id'] ?? '').toString(),
        title: (json['title'] ?? '').toString(),
        createdAtISO: (json['createdAtISO'] ?? json['createdAt'] ?? '').toString(),
        updatedAtISO: (json['updatedAtISO'] ?? json['updatedAt'] ?? '').toString(),
        filters: SessionFilters.fromJson(
          (json['filters'] is Map ? (json['filters'] as Map).map((k, v) => MapEntry(k.toString(), v)) :
          <String, dynamic>{}),
        ),
        members: (json['members'] as List? ?? const [])
            .whereType<Map>()
            .map((item) => SessionMember.fromJson(item.map((k, v) => MapEntry(k.toString(), v))))
            .toList(growable: false),
        status: (json['status'] ?? 'active').toString(),
        lastCursor: json['lastCursor']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'title': title,
        'createdAtISO': createdAtISO,
        'updatedAtISO': updatedAtISO,
        'filters': filters.toJson(),
        'members': members.map((member) => member.toJson()).toList(growable: false),
        'status': status,
        'lastCursor': lastCursor,
      };
}

extension SessionCompatX on Session {
  String get id => sessionId;
}
