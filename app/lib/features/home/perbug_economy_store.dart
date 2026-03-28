import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'perbug_economy_models.dart';

class PerbugEconomyStore {
  PerbugEconomyStore(this._prefs);

  static const String _economyKey = 'perbug_economy_state_v1';

  final SharedPreferences _prefs;

  PerbugEconomyState load() {
    final raw = _prefs.getString(_economyKey);
    if (raw == null || raw.isEmpty) return PerbugEconomyState.initial();
    try {
      return PerbugEconomyState.fromEncoded(raw);
    } catch (_) {
      return PerbugEconomyState.initial();
    }
  }

  Future<void> save(PerbugEconomyState state) {
    return _prefs.setString(_economyKey, jsonEncode(state.toJson()));
  }
}
