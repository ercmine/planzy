import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../models/session.dart';
import '../../models/session_filters.dart';
import '../../models/session_member.dart';

class SessionsStore {
  static const _sessionsKey = 'sessions_v1';

  Future<List<Session>> loadSessions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_sessionsKey);
    if (raw == null || raw.isEmpty) {
      return const <Session>[];
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return const <Session>[];
      }

      final sessions = decoded
          .whereType<Map<String, dynamic>>()
          .map(Session.fromJson)
          .toList(growable: false);
      sessions.sort((a, b) => b.updatedAtISO.compareTo(a.updatedAtISO));
      return sessions;
    } catch (_) {
      return const <Session>[];
    }
  }

  Future<void> upsertSession(Session session) async {
    final sessions = (await loadSessions()).toList(growable: true);
    final index = sessions.indexWhere((s) => s.sessionId == session.sessionId);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.add(session);
    }
    await _saveSessions(sessions);
  }

  Future<void> deleteSession(String sessionId) async {
    final sessions = (await loadSessions())
        .where((s) => s.sessionId != sessionId)
        .toList(growable: false);
    await _saveSessions(sessions);
  }

  Future<Session?> getSession(String sessionId) async {
    final sessions = await loadSessions();
    for (final session in sessions) {
      if (session.sessionId == sessionId) {
        return session;
      }
    }
    return null;
  }

  Future<void> updateSessionFilters(String sessionId, SessionFilters filters) async {
    final existing = await getSession(sessionId);
    if (existing == null) {
      return;
    }
    final updated = existing.copyWith(
      filters: filters,
      updatedAtISO: DateTime.now().toUtc().toIso8601String(),
    );
    await upsertSession(updated);
  }

  Future<void> updateSessionMembers(String sessionId, List<SessionMember> members) async {
    final existing = await getSession(sessionId);
    if (existing == null) {
      return;
    }
    final updated = existing.copyWith(
      members: members,
      updatedAtISO: DateTime.now().toUtc().toIso8601String(),
    );
    await upsertSession(updated);
  }

  Future<void> setLastCursor(String sessionId, String? cursor) async {
    final existing = await getSession(sessionId);
    if (existing == null) {
      return;
    }
    final updated = existing.copyWith(
      lastCursor: cursor,
      updatedAtISO: DateTime.now().toUtc().toIso8601String(),
    );
    await upsertSession(updated);
  }

  Future<void> _saveSessions(List<Session> sessions) async {
    sessions.sort((a, b) => b.updatedAtISO.compareTo(a.updatedAtISO));
    final prefs = await SharedPreferences.getInstance();
    final encoded = sessions.map((s) => s.toJson()).toList(growable: false);
    await prefs.setString(_sessionsKey, jsonEncode(encoded));
  }
}
