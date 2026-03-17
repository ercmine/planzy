import 'package:flutter/material.dart';

import 'collection_models.dart';

class CollectionsPage extends StatelessWidget {
  final List<CollectionCardModel> collections;

  const CollectionsPage({super.key, required this.collections});

  @override
  Widget build(BuildContext context) {
    if (collections.isEmpty) {
      return const Center(child: Text('No collections available yet.'));
    }
    return ListView.builder(
      itemCount: collections.length,
      itemBuilder: (context, index) {
        final collection = collections[index];
        return Card(
          child: ListTile(
            title: Text(collection.title),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${collection.completedItems}/${collection.totalItems} collected • ${collection.type}'),
                const SizedBox(height: 8),
                LinearProgressIndicator(value: collection.progress),
              ],
            ),
            trailing: Text(collection.status.replaceAll('_', ' ')),
          ),
        );
      },
    );
  }
}
