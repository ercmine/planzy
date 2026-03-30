import 'package:dryad/app/assets.dart';
import 'package:dryad/core/identity/identity_provider.dart';
import 'package:dryad/core/identity/identity_store.dart';
import 'package:dryad/features/dryad/chain/dryad_chain_providers.dart';
import 'package:dryad/features/dryad/chain/wallet_connector.dart';
import 'package:dryad/features/auth/perbug_wallet_entry_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('hit targets stay inside rendered image bounds for portrait layout', () {
    const layout = EntryHitTargetLayout(
      screenSize: Size(390, 844),
      safePadding: EdgeInsets.only(top: 47, bottom: 34),
    );

    final imageRect = layout.imageRect;
    expect(imageRect.width, greaterThan(0));
    expect(imageRect.height, greaterThan(0));

    final connect = layout.connectWalletRect;
    final learnMore = layout.learnMoreRect;

    expect(imageRect.contains(connect.topLeft), isTrue);
    expect(imageRect.contains(connect.bottomRight), isTrue);
    expect(imageRect.contains(learnMore.topLeft), isTrue);
    expect(imageRect.contains(learnMore.bottomRight), isTrue);
  });

  test('hit targets align consistently after scaling to wide devices', () {
    const layout = EntryHitTargetLayout(
      screenSize: Size(932, 430),
      safePadding: EdgeInsets.only(left: 44, right: 44),
    );

    final connect = layout.connectWalletRect;
    final learnMore = layout.learnMoreRect;

    expect(connect.center.dx, closeTo(learnMore.center.dx, 4));
    expect(connect.top, lessThan(learnMore.top));
    expect(connect.width, greaterThan(learnMore.width));
  });

  test('entry art points at the expected bundled main image asset', () {
    expect(
      AppAssets.perbugLoginBackdrop,
      '../29C05777-776F-450F-B071-691DE175BA89.png',
    );
  });

  testWidgets('entry screen does not overlay duplicate title/button labels', (tester) async {
    SharedPreferences.setMockInitialValues(const {});
    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          identityStoreProvider.overrideWith((ref) async => store),
          walletConnectorProvider.overrideWith((ref) => const _FakeWalletConnector(available: true)),
        ],
        child: const MaterialApp(home: PerbugWalletEntryPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Perbug'), findsNothing);
    expect(find.text('Connect Wallet'), findsNothing);
    expect(find.text('Learn More'), findsNothing);
  });

  testWidgets('demo mode call-to-action appears when wallet is unavailable', (tester) async {
    SharedPreferences.setMockInitialValues(const {});
    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          identityStoreProvider.overrideWith((ref) async => store),
          walletConnectorProvider.overrideWith((ref) => const _FakeWalletConnector(available: false)),
        ],
        child: const MaterialApp(home: PerbugWalletEntryPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Play Demo'), findsOneWidget);
    expect(find.textContaining('Wallet unavailable'), findsOneWidget);
  });
}

class _FakeWalletConnector implements WalletConnector {
  const _FakeWalletConnector({required this.available});

  final bool available;

  @override
  bool get isAvailable => available;

  @override
  bool get isMobileBrowser => false;

  @override
  List<String> get supportedWalletIds => const [];

  @override
  void attachSessionListeners({
    void Function(String? account)? onAccountChanged,
    void Function(int chainId)? onChainChanged,
    void Function(String reason)? onDisconnected,
  }) {}

  @override
  Future<String> connectWallet({String? walletId}) async => '0x123';

  @override
  void detachSessionListeners() {}

  @override
  bool isWalletInstalled(String walletId) => false;

  @override
  Future<bool> launchWalletApp({required String walletId, required Uri dappUri}) async => false;

  @override
  Future<int> readChainId({String? walletId}) async => 1;

  @override
  Future<String> sendTransaction({required String from, required String to, required String data, String? valueHex}) async => '0xtx';

  @override
  Future<bool> switchChain({
    required int chainId,
    String? rpcUrl,
    String? chainName,
    String? nativeCurrencySymbol,
    String? explorerUrl,
    String? walletId,
  }) async =>
      true;
}
