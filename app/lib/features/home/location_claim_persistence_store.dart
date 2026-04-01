import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'location_claim_models.dart';

class LocationClaimPersistenceStore {
  LocationClaimPersistenceStore(this._prefs);

  static const _key = 'location_claim_state_v2';
  final SharedPreferences _prefs;

  Future<void> save(LocationClaimState state) async {
    final payload = {
      'balance': state.balance,
      'globalPool': {
        'totalClaimableSupply': state.globalPool.totalClaimableSupply,
        'totalClaimedSupply': state.globalPool.totalClaimedSupply,
      },
      'claimHistory': state.claimHistory.map((item) => item.toJson()).toList(growable: false),
      'claimables': state.claimables
          .map((item) => {
                'id': item.location.id,
                'claimCount': item.claimCount,
                'currentReward': item.currentReward,
                'totalClaimedAtLocation': item.totalClaimedAtLocation,
                'uniqueVisitors': item.uniqueVisitors,
                'isDepleted': item.isDepleted,
                'cooldownUntil': item.cooldownUntil?.toUtc().toIso8601String(),
                'flowState': item.flowState.wire,
              })
          .toList(growable: false),
    };
    await _prefs.setString(_key, jsonEncode(payload));
  }

  PersistedClaimState? load() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final claimables = ((json['claimables'] as List?) ?? const <dynamic>[])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(growable: false);
      final claimHistory = ((json['claimHistory'] as List?) ?? const <dynamic>[])
          .whereType<Map>()
          .map((item) => ClaimTransaction.fromJson(Map<String, dynamic>.from(item)))
          .toList(growable: false);
      final global = (json['globalPool'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      return PersistedClaimState(
        balance: (json['balance'] as num?)?.toDouble() ?? 0,
        totalClaimableSupply: (global['totalClaimableSupply'] as num?)?.toDouble(),
        totalClaimedSupply: (global['totalClaimedSupply'] as num?)?.toDouble(),
        claimables: claimables,
        claimHistory: claimHistory,
      );
    } catch (_) {
      return null;
    }
  }
}

class PersistedClaimState {
  const PersistedClaimState({
    required this.balance,
    required this.totalClaimableSupply,
    required this.totalClaimedSupply,
    required this.claimables,
    required this.claimHistory,
  });

  final double balance;
  final double? totalClaimableSupply;
  final double? totalClaimedSupply;
  final List<Map<String, dynamic>> claimables;
  final List<ClaimTransaction> claimHistory;
}
