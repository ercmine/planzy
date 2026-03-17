import '../../core/json_parsers.dart';

class CollectionCardModel {
  final String id;
  final String title;
  final String type;
  final int totalItems;
  final int completedItems;
  final String status;

  const CollectionCardModel({
    required this.id,
    required this.title,
    required this.type,
    required this.totalItems,
    required this.completedItems,
    required this.status,
  });

  int get remainingItems => (totalItems - completedItems).clamp(0, totalItems);
  double get progress => totalItems == 0 ? 0 : completedItems / totalItems;

  factory CollectionCardModel.fromJson(Map<String, dynamic> json) {
    return CollectionCardModel(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      totalItems: parseInt(json['totalItems']) ?? 0,
      completedItems: parseInt(json['completedItems']) ?? 0,
      status: (json['status'] ?? 'not_started').toString(),
    );
  }
}
