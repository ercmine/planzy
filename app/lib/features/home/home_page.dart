import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/widgets.dart';
import '../settings/settings_page.dart';
import 'perbug_flow_pages.dart';
import 'perbug_game_page.dart';

enum HomeTab { world, squad, inventory, progression, profile }

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.initialTab = HomeTab.world});

  final HomeTab initialTab;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const List<HomeTab> _tabs = [
    HomeTab.world,
    HomeTab.squad,
    HomeTab.inventory,
    HomeTab.progression,
    HomeTab.profile,
  ];

  bool _showTacticalHud = true;

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _tabs.indexOf(widget.initialTab).clamp(0, _tabs.length - 1);

    final pages = <Widget>[
      PerbugGamePage(showTacticalHud: _showTacticalHud),
      const PerbugSquadPage(),
      const PerbugInventoryPage(),
      const PerbugProgressionPage(),
      const SettingsPage(),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
      appBar: AppBar(
        titleSpacing: 12,
        title: const Text('Perbug // World Command'),
        actions: [
          IconButton(
            tooltip: _showTacticalHud ? 'Hide tactical HUD' : 'Show tactical HUD',
            onPressed: () => setState(() => _showTacticalHud = !_showTacticalHud),
            icon: Icon(_showTacticalHud ? Icons.layers : Icons.layers_clear_outlined),
          ),
          IconButton(
            tooltip: 'Open marketplace',
            onPressed: () => context.go(AppRoutes.marketplace),
            icon: const Icon(Icons.storefront_outlined),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(index: selectedIndex, children: pages),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: NavigationBar(
          backgroundColor: const Color(0xFF121A2B),
          height: 72,
          selectedIndex: selectedIndex,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          onDestinationSelected: (value) {
            switch (value) {
              case 0:
                context.go(AppRoutes.liveMap);
                break;
              case 1:
                context.go(AppRoutes.squad);
                break;
              case 2:
                context.go(AppRoutes.inventory);
                break;
              case 3:
                context.go(AppRoutes.progression);
                break;
              case 4:
                context.go(AppRoutes.profile);
                break;
            }
          },
          destinations: const [
            NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Map'),
            NavigationDestination(icon: Icon(Icons.groups_2_outlined), selectedIcon: Icon(Icons.groups_2), label: 'Squad'),
            NavigationDestination(icon: Icon(Icons.backpack_outlined), selectedIcon: Icon(Icons.backpack), label: 'Inventory'),
            NavigationDestination(icon: Icon(Icons.flag_outlined), selectedIcon: Icon(Icons.flag), label: 'Objectives'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}
