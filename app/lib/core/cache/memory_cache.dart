class MemoryCache<K, V> {
  MemoryCache({required this.ttl});

  final Duration ttl;
  final Map<K, _CacheEntry<V>> _storage = <K, _CacheEntry<V>>{};

  V? get(K key) {
    final entry = _storage[key];
    if (entry == null) {
      return null;
    }
    if (DateTime.now().isAfter(entry.expiresAt)) {
      _storage.remove(key);
      return null;
    }
    return entry.value;
  }

  void set(K key, V value) {
    _storage[key] = _CacheEntry(value: value, expiresAt: DateTime.now().add(ttl));
  }

  void remove(K key) => _storage.remove(key);
  void clear() => _storage.clear();
}

class _CacheEntry<V> {
  _CacheEntry({required this.value, required this.expiresAt});

  final V value;
  final DateTime expiresAt;
}
