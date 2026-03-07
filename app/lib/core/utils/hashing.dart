import 'dart:convert';

import 'package:crypto/crypto.dart';

String hashForCacheKey(Map<String, dynamic> source) {
  final entries = source.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
  final normalized = <String, dynamic>{};
  for (final entry in entries) {
    normalized[entry.key] = entry.value;
  }
  return sha256.convert(utf8.encode(jsonEncode(normalized))).toString();
}
