import 'package:dryad/app/router.dart';
import 'package:dryad/core/identity/identity_provider.dart';
import 'package:dryad/features/dryad/chain/dryad_chain_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('launches to connect-wallet entry when no wallet session exists', () {
    final container = ProviderContainer();

    final router = container.read(routerProvider);
    expect(router.routeInformationProvider.value.uri.path, '/');

    router.dispose();
    container.dispose();
  });

  test('redirects authenticated wallet sessions away from entry to live map', () {
    final container = ProviderContainer(
      overrides: [
        walletAddressProvider.overrideWith((ref) => '0xabc123'),
      ],
    );

    final router = container.read(routerProvider);
    expect(router.routeInformationProvider.value.uri.path, '/live-map');

    router.dispose();
    container.dispose();
  });

  test('blocks direct map route when wallet is disconnected', () {
    final container = ProviderContainer();

    final router = container.read(routerProvider);
    router.go('/live-map');
    expect(router.routeInformationProvider.value.uri.path, '/');

    router.dispose();
    container.dispose();
  });

  test('allows direct map route with a persisted demo auth session', () {
    final container = ProviderContainer(
      overrides: [
        entryAuthModeProvider.overrideWith((ref) => EntryAuthMode.demo),
      ],
    );

    final router = container.read(routerProvider);
    router.go('/live-map');
    expect(router.routeInformationProvider.value.uri.path, '/live-map');

    router.dispose();
    container.dispose();
  });
}
