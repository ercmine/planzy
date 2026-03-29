import 'package:dryad/app/app_routes.dart';
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
    };

    expect(routes.length, 11);
    for (final route in routes) {
      expect(route, startsWith('/'));
      expect(route.trim(), isNotEmpty);
    }
  });
}
