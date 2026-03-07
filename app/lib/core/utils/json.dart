typedef JsonMap = Map<String, dynamic>;
typedef JsonList = List<dynamic>;

JsonMap jsonAsMap(Object? value, {String field = 'root'}) {
  if (value is JsonMap) {
    return value;
  }
  throw FormatException('Expected JSON object at "$field"');
}

JsonList jsonAsList(Object? value, {String field = 'root'}) {
  if (value is JsonList) {
    return value;
  }
  throw FormatException('Expected JSON list at "$field"');
}

T readRequired<T>(JsonMap json, String key) {
  final value = json[key];
  if (value is T) {
    return value;
  }
  throw FormatException('Missing or invalid key "$key"');
}

T? readOptional<T>(JsonMap json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is T) {
    return value;
  }
  throw FormatException('Invalid key "$key"');
}
