import 'package:flutter/material.dart';

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
  late int _navIndex;

  @override
  void initState() {
    super.initState();
    _navIndex = _tabs.indexOf(widget.initialTab);
    if (_navIndex < 0) _navIndex = 0;
  }

  @override
  Widget build(BuildContext context) {
    final pages = const [
      PerbugGamePage(),
      CollectionsPage(collections: []),
      SettingsPage(),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      appBar: AppBar(
        title: const Text('Perbug // World Command'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 8),
            child: Center(
              child: AppPill(label: 'Tactical RPG HUD', icon: Icons.auto_awesome),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _navIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Frontier'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Vault'),
          NavigationDestination(icon: Icon(Icons.hub_outlined), selectedIcon: Icon(Icons.hub), label: 'Command'),
        ],
      ),
    );
  }
}
