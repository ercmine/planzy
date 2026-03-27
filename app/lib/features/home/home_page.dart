import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/widgets.dart';
import '../dryad/pages/grove_page.dart';
import '../dryad/pages/market_page.dart';
import '../dryad/pages/tend_page.dart';
import '../dryad/pages/creator_page.dart';
import '../dryad/pages/map_page.dart';

enum HomeTab { map, tend, market, grove, creator }

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.initialTab = HomeTab.map});

  final HomeTab initialTab;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const List<HomeTab> _tabs = [HomeTab.map, HomeTab.tend, HomeTab.market, HomeTab.grove, HomeTab.creator];
  late int _navIndex;

  @override
  void initState() {
    super.initState();
    _navIndex = _tabs.indexOf(widget.initialTab);
    if (_navIndex < 0) _navIndex = 0;
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DryadMapPage(onOpenTree: _openTree),
      DryadTendPage(onOpenTree: _openTree),
      DryadMarketPage(onOpenTree: _openTree),
      DryadGrovePage(onOpenTree: _openTree),
      DryadCreatorPage(onOpenTree: _openTree),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      appBar: AppBar(title: const Text('Dryad')),
      body: IndexedStack(index: _navIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.water_drop_outlined), selectedIcon: Icon(Icons.water_drop), label: 'Tend'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Marketplace'),
          NavigationDestination(icon: Icon(Icons.forest_outlined), selectedIcon: Icon(Icons.forest), label: 'My Trees'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Creator'),
        ],
      ),
    );
  }

  void _openTree(String treeId) {
    context.push('/tree/$treeId');
  }
}
