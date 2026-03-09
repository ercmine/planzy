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

bool? parseBool(Object? value) {
  if (value == null) {
    return null;
  }

  if (value is bool) {
    return value;
  }

  if (value is num) {
    if (value == 1) return true;
    if (value == 0) return false;
    return null;
  }

  if (value is String) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) {
      return null;
    }

    switch (normalized) {
      case 'true':
      case 'yes':
      case 'on':
      case '1':
        return true;
      case 'false':
      case 'no':
      case 'off':
      case '0':
        return false;
      default:
        return null;
    }
  }

  return null;
}
