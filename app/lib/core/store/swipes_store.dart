import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/locked_plan.dart';
import '../../models/swipe.dart';

class SwipesStore {
  static const _swipesPrefix = 'swipes_v1_';
  static const _lockedPrefix = 'locked_v1_';

  Future<void> appendSwipe(SwipeRecord swipe) async {
    final swipes = (await loadSwipes(swipe.sessionId)).toList(growable: true)
      ..add(swipe);
    await _saveSwipes(swipe.sessionId, swipes);
  }

  Future<List<SwipeRecord>> loadSwipes(String sessionId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_swipesKey(sessionId));
    if (raw == null || raw.isEmpty) {
      return const <SwipeRecord>[];
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) {
        return const <SwipeRecord>[];
      }
      final parsed = <SwipeRecord>[];
      for (final entry in decoded.whereType<Map<String, dynamic>>()) {
        try {
          parsed.add(SwipeRecord.fromJson(entry));
        } catch (error, stackTrace) {
          debugPrint(
            '[SwipesStore] Skipping malformed swipe entry for session=$sessionId '
            'error=$error',
          );
          debugPrintStack(stackTrace: stackTrace, label: '[SwipesStore] decode failure');
        }
      }
      return parsed;
    } catch (_) {
      return const <SwipeRecord>[];
    }
  }

  Future<void> clearSwipes(String sessionId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_swipesKey(sessionId));
  }

  Future<void> setLockedPlan(LockedPlan lockedPlan) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _lockedKey(lockedPlan.sessionId),
      jsonEncode(lockedPlan.toJson()),
    );
  }

  Future<LockedPlan?> getLockedPlan(String sessionId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_lockedKey(sessionId));
    if (raw == null || raw.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }
      return LockedPlan.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearLockedPlan(String sessionId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lockedKey(sessionId));
  }

  Future<void> _saveSwipes(String sessionId, List<SwipeRecord> swipes) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = swipes.map((s) => s.toJson()).toList(growable: false);
    await prefs.setString(_swipesKey(sessionId), jsonEncode(payload));
  }

  String _swipesKey(String sessionId) => '$_swipesPrefix$sessionId';
  String _lockedKey(String sessionId) => '$_lockedPrefix$sessionId';
}
