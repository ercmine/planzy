import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../utils/uuid.dart';

class LocalStore {
  LocalStore(this._prefs);

  static const _userIdKey = 'user_id';
  static const _recentSessionsKey = 'recent_sessions';
  static const _lastSessionIdKey = 'last_session_id';
  static const _sessionCursorPrefix = 'session_cursor_';
  static const _deckKeyPrefix = 'session_deck_key_';

  final SharedPreferences _prefs;

  static Future<LocalStore> create() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStore(prefs);
  }

  Future<String> getOrCreateUserId() async {
    final existing = _prefs.getString(_userIdKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final generated = Uuid.v4();
    await _prefs.setString(_userIdKey, generated);
    return generated;
  }

  Future<void> saveRecentSessions(List<String> sessionIds) {
    return _prefs.setString(_recentSessionsKey, jsonEncode(sessionIds.take(20).toList()));
  }

  List<String> loadRecentSessions() {
    final value = _prefs.getString(_recentSessionsKey);
    if (value == null || value.isEmpty) {
      return const <String>[];
    }
    try {
      final decoded = jsonDecode(value);
      if (decoded is List) {
        return decoded.whereType<String>().toList();
      }
      return const <String>[];
    } catch (_) {
      return const <String>[];
    }
  }

  Future<void> saveLastSessionId(String sessionId) =>
      _prefs.setString(_lastSessionIdKey, sessionId);

  String? loadLastSessionId() => _prefs.getString(_lastSessionIdKey);

  Future<void> saveLastCursor(String sessionId, String? cursor) {
    final key = '$_sessionCursorPrefix$sessionId';
    if (cursor == null || cursor.isEmpty) {
      return _prefs.remove(key);
    }
    return _prefs.setString(key, cursor);
  }

  String? loadLastCursor(String sessionId) {
    return _prefs.getString('$_sessionCursorPrefix$sessionId');
  }

  Future<void> saveLastSeenDeckKey(String sessionId, String deckKey) {
    return _prefs.setString('$_deckKeyPrefix$sessionId', deckKey);
  }

  String? loadLastSeenDeckKey(String sessionId) {
    return _prefs.getString('$_deckKeyPrefix$sessionId');
  }
}
