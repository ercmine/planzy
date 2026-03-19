import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../video_platform/video_models.dart';
import '../../video_platform/video_providers.dart';

class PlacePickerSheet extends ConsumerStatefulWidget {
  const PlacePickerSheet({this.initialQuery = '', super.key});

  final String initialQuery;

  @override
  ConsumerState<PlacePickerSheet> createState() => _PlacePickerSheetState();
}

class _PlacePickerSheetState extends ConsumerState<PlacePickerSheet> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _controller.text.trim();
    final results = ref.watch(placeSearchProvider((query: query, scope: FeedScope.local)));

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _controller,
                autofocus: true,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search a restaurant, bar, park, or place'),
                onChanged: (_) => setState(() {}),
              ),
            ),
            Flexible(
              child: results.when(
                data: (items) => ListView.builder(
                  shrinkWrap: true,
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.place_outlined)),
                      title: Text(item.name),
                      subtitle: Text('${item.category} • ${item.regionLabel}'),
                      onTap: () => Navigator.of(context).pop(item),
                    );
                  },
                ),
                loading: () => const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (_, __) => const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Unable to search for places right now.'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
