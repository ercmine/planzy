import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/collections/collection_models.dart';

void main() {
  test('parses collection card and computes progress', () {
    final model = CollectionCardModel.fromJson({
      'id': 'north-loop-coffee',
      'title': 'North Loop Coffee',
      'type': 'cuisine',
      'totalItems': 5,
      'completedItems': 3,
      'status': 'in_progress',
    });

    expect(model.id, 'north-loop-coffee');
    expect(model.remainingItems, 2);
    expect(model.progress, 0.6);
  });
}
