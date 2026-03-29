import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';

class PerbugNavigationDebugPage extends StatelessWidget {
  const PerbugNavigationDebugPage({super.key});

  static const routeChecklist = <String>[
    AppRoutes.liveMap,
    AppRoutes.nodeDetails,
    AppRoutes.encounter,
    AppRoutes.squad,
    AppRoutes.inventory,
    AppRoutes.crafting,
    AppRoutes.marketplace,
    AppRoutes.progression,
    AppRoutes.collection,
    AppRoutes.profile,
    AppRoutes.wallet,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Navigation debug audit')),
      body: ListView.builder(
        itemCount: routeChecklist.length,
        itemBuilder: (context, index) {
          final route = routeChecklist[index];
          return ListTile(
            title: Text(route),
            trailing: FilledButton.tonal(
              onPressed: () => context.go(route),
              child: const Text('Open'),
            ),
          );
        },
      ),
    );
  }
}
