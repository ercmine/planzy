import 'package:dryad/features/auth/perbug_wallet_entry_page.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
