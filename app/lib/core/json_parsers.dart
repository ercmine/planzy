num? parseNum(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is num) {
    return value;
  }
  if (value is String) {
    return num.tryParse(value);
  }
  return null;
}

double? parseDouble(Object? value) {
  return parseNum(value)?.toDouble();
}

int? parseInt(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value);
  }
  return null;
}

List<String>? parseStringList(Object? value) {
  if (value is! List) {
    return null;
  }
  final out = value.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
  return out.isEmpty ? null : out;
}
