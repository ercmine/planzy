import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/widgets.dart';
import '../collections/collections_page.dart';
import '../settings/settings_page.dart';
import 'perbug_game_page.dart';

enum HomeTab { world, collection, profile }

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.initialTab = HomeTab.world});

  final HomeTab initialTab;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const List<HomeTab> _tabs = [HomeTab.world, HomeTab.collection, HomeTab.profile];
  bool _showTacticalHud = true;

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _tabs.indexOf(widget.initialTab).clamp(0, _tabs.length - 1);
    final pages = [
      PerbugGamePage(showTacticalHud: _showTacticalHud),
      CollectionsPage(collections: []),
      SettingsPage(),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      appBar: AppBar(
        title: const Text('Perbug // World Command'),
        actions: [
          IconButton(
            tooltip: _showTacticalHud ? 'Hide tactical HUD' : 'Show tactical HUD',
            onPressed: () => setState(() => _showTacticalHud = !_showTacticalHud),
            icon: Icon(_showTacticalHud ? Icons.visibility : Icons.visibility_off),
          ),
          Padding(
            padding: EdgeInsets.only(right: 8),
            child: Center(
              child: AppPill(
                label: _showTacticalHud ? 'Tactical RPG HUD: On' : 'Tactical RPG HUD: Off',
                icon: _showTacticalHud ? Icons.auto_awesome : Icons.auto_awesome_outlined,
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: selectedIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (value) {
          switch (value) {
            case 0:
              context.go(AppRoutes.liveMap);
              break;
            case 1:
              context.go(AppRoutes.collection);
              break;
            case 2:
              context.go(AppRoutes.profile);
              break;
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Frontier'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Vault'),
          NavigationDestination(icon: Icon(Icons.hub_outlined), selectedIcon: Icon(Icons.hub), label: 'Command'),
        ],
      ),
    );
  }
}
