import '../core/store/sessions_store.dart';
import '../core/utils/uuid.dart';
import '../models/session.dart';
import '../models/session_filters.dart';
import '../models/session_member.dart';

class SessionsRepository {
  SessionsRepository({required SessionsStore sessionsStore})
      : _sessionsStore = sessionsStore;

  final SessionsStore _sessionsStore;

  Future<List<Session>> listActive() async {
    final sessions = await _sessionsStore.loadSessions();
    return sessions.where((s) => s.status != 'archived').toList(growable: false);
  }

  Future<Session?> getById(String sessionId) {
    return _sessionsStore.getSession(sessionId);
  }

  Future<Session> createLocalSession({
    required String title,
    required SessionFilters filters,
    required List<SessionMember> members,
  }) async {
    final nowISO = DateTime.now().toUtc().toIso8601String();
    final session = Session(
      sessionId: Uuid.v4(),
      title: title,
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
      filters: filters,
      members: members,
    );
    await _sessionsStore.upsertSession(session);
    return session;
  }

  Future<Session> joinSession(String sessionId) async {
    final existing = await _sessionsStore.getSession(sessionId);
    if (existing != null) {
      return existing;
    }

    final nowISO = DateTime.now().toUtc().toIso8601String();
    final joined = Session(
      sessionId: sessionId,
      title: 'Joined Session',
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
      filters: const SessionFilters(),
    );
    await _sessionsStore.upsertSession(joined);
    return joined;
  }

  Future<void> leaveSession(String sessionId) {
    return _sessionsStore.deleteSession(sessionId);
  }

  Future<void> deleteLocalSession(String sessionId) {
    return _sessionsStore.deleteSession(sessionId);
  }

  Future<void> updateFilters(String sessionId, SessionFilters filters) {
    return _sessionsStore.updateSessionFilters(sessionId, filters);
  }

  Future<void> updateMembers(String sessionId, List<SessionMember> members) {
    return _sessionsStore.updateSessionMembers(sessionId, members);
  }

  Future<void> setLastCursor(String sessionId, String? cursor) {
    return _sessionsStore.setLastCursor(sessionId, cursor);
  }
}
