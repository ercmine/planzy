import 'package:dryad/app/app_routes.dart';
import 'package:dryad/app/router.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Perbug major routes are registered with stable paths', () {
    final routes = <String>{
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
      AppRoutes.learnMore,
    };

    expect(routes.length, 12);
    for (final route in routes) {
      expect(route, startsWith('/'));
      expect(route.trim(), isNotEmpty);
    }
  });

  test('unauthenticated users are redirected to entry for protected routes', () {
    final redirect = resolvePerbugRedirect(
      path: AppRoutes.marketplace,
      hasWalletSession: false,
      hasDemoSession: false,
    );

    expect(redirect, AppRoutes.entry);
  });

  test('authenticated users skip entry and land on live map', () {
    final redirect = resolvePerbugRedirect(
      path: AppRoutes.entry,
      hasWalletSession: true,
      hasDemoSession: false,
    );

    expect(redirect, AppRoutes.liveMap);
  });
}
