import 'session_filters.dart';

String categoryLabel(Category category) {
  final raw = category.name;
  return '${raw[0].toUpperCase()}${raw.substring(1)}';
}
