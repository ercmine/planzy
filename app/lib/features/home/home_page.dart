import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/widgets.dart';
import '../dryad/pages/grove_page.dart';
import '../dryad/pages/market_page.dart';
import '../dryad/pages/wallet_page.dart';
import 'map_discovery_tab.dart';

enum HomeTab { smartMap, market, grove, wallet, profile }

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.initialTab = HomeTab.smartMap});

  final HomeTab initialTab;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const List<HomeTab> _tabs = [HomeTab.smartMap, HomeTab.market, HomeTab.grove, HomeTab.wallet, HomeTab.profile];
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
      const MapDiscoveryTab(),
      DryadMarketPage(onOpenTree: _openTree),
      DryadGrovePage(onOpenTree: _openTree),
      const DryadWalletPage(),
      const _DryadProfilePage(),
    ];

    return AppScaffold(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      appBar: AppBar(title: const Text('Dryad')),
      body: IndexedStack(index: _navIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (value) => setState(() => _navIndex = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Smart Map'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Marketplace'),
          NavigationDestination(icon: Icon(Icons.forest_outlined), selectedIcon: Icon(Icons.forest), label: 'My Trees'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  void _openTree(String treeId) {
    context.push('/tree/$treeId');
  }
}

class _DryadProfilePage extends StatelessWidget {
  const _DryadProfilePage();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        PremiumHeader(
          title: 'Steward Profile',
          subtitle: 'Identity across ownership history, planting activity, and listing performance.',
          badge: AppPill(label: 'Dryad', icon: Icons.emoji_nature_outlined),
        ),
      ],
    );
  }
}
