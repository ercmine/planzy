import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perbug/features/home/perbug_flow_pages.dart';
import 'package:perbug/features/perbug/chain/perbug_chain_providers.dart';

void main() {
  Future<void> _pumpWalletPage(WidgetTester tester, {String? savedAddress}) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          walletAddressProvider.overrideWith((ref) => savedAddress),
        ],
        child: const MaterialApp(home: PerbugWalletPage()),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('wallet address setup card is rendered before claim/withdraw and history sections', (tester) async {
    await _pumpWalletPage(tester);

    final primaryTop = tester.getTopLeft(find.byKey(const Key('wallet-address-primary-card'))).dy;
    final actionsTop = tester.getTopLeft(find.byKey(const Key('wallet-claim-withdraw-panel'))).dy;
    final historyTop = tester.getTopLeft(find.byKey(const Key('wallet-history-panel'))).dy;

    expect(primaryTop, lessThan(actionsTop));
    expect(actionsTop, lessThan(historyTop));
  });

  testWidgets('empty state emphasizes setup-required payout destination messaging', (tester) async {
    await _pumpWalletPage(tester);

    expect(find.text('Perbug Wallet Address'), findsOneWidget);
    expect(find.byKey(const Key('wallet-empty-state-message')), findsOneWidget);
    expect(find.textContaining('does not hold your private keys'), findsOneWidget);
    expect(find.text('Save Address'), findsOneWidget);

    final withdrawInkWell = tester.widget<InkWell>(
      find.descendant(of: find.byKey(const Key('wallet-withdraw-button')), matching: find.byType(InkWell)),
    );
    expect(withdrawInkWell.onTap, isNull);
  });

  testWidgets('saved state shows current destination and update action', (tester) async {
    const saved = 'pb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    await _pumpWalletPage(tester, savedAddress: saved);

    expect(find.byKey(const Key('wallet-current-destination')), findsOneWidget);
    expect(find.text('Update Address'), findsOneWidget);
    expect(find.textContaining('Claimed Perbug and withdrawals will be sent to your saved payout address.'), findsOneWidget);
  });

  testWidgets('address validation keeps primary save action disabled until valid address is entered', (tester) async {
    await _pumpWalletPage(tester);

    final saveFinder = find.byKey(const Key('wallet-save-button'));
    var saveInkWell = tester.widget<InkWell>(
      find.descendant(of: saveFinder, matching: find.byType(InkWell)),
    );
    expect(saveInkWell.onTap, isNull);

    await tester.enterText(find.byKey(const Key('wallet-address-input')), 'not-an-address');
    await tester.pump();

    saveInkWell = tester.widget<InkWell>(
      find.descendant(of: saveFinder, matching: find.byType(InkWell)),
    );
    expect(saveInkWell.onTap, isNull);

    await tester.enterText(find.byKey(const Key('wallet-address-input')), '0x1234567890123456789012345678901234567890');
    await tester.pump();

    saveInkWell = tester.widget<InkWell>(
      find.descendant(of: saveFinder, matching: find.byType(InkWell)),
    );
    expect(saveInkWell.onTap, isNotNull);
  });
}
