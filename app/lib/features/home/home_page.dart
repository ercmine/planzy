import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/widgets.dart';
import '../settings/settings_page.dart';
import 'location_claim_map_page.dart';
import 'perbug_flow_pages.dart';

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

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _tabs.indexOf(widget.initialTab).clamp(0, _tabs.length - 1);

    final pages = <Widget>[
      const LocationClaimMapPage(),
      const PerbugSquadPage(),
      const PerbugInventoryPage(),
      const PerbugProgressionPage(),
      const SettingsPage(),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
      appBar: AppBar(
        titleSpacing: 12,
        title: const Text('Perbug // Explore & Claim'),
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
            NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
            NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history), label: 'History'),
            NavigationDestination(icon: Icon(Icons.public_outlined), selectedIcon: Icon(Icons.public), label: 'Pool'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
          ],
        ),
      ),
    );
  }
}
