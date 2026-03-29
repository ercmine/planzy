import 'package:dryad/app/router.dart';
import 'package:dryad/core/identity/identity_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('routes to bootstrap while onboarding intro gate is loading', () {
    final container = ProviderContainer(
      overrides: [
        onboardingIntroRequiredProvider.overrideWith((ref) async {
          await Future<void>.delayed(const Duration(seconds: 1));
          return true;
        }),
      ],
    );

    final router = container.read(routerProvider);
    expect(router.routeInformationProvider.value.uri.path, '/bootstrap');

    router.dispose();
    container.dispose();
  });

  test('routes to onboarding when intro is still required', () {
    final container = ProviderContainer(
      overrides: [
        onboardingIntroRequiredProvider.overrideWith((ref) async => true),
      ],
    );

    final router = container.read(routerProvider);
    container.read(onboardingGateProvider);
    expect(router.routeInformationProvider.value.uri.path, '/onboarding');

    router.dispose();
    container.dispose();
  });

  test('routes away from onboarding after expedition starts', () {
    final container = ProviderContainer(
      overrides: [
        onboardingIntroRequiredProvider.overrideWith((ref) async => false),
      ],
    );

    final router = container.read(routerProvider);
    router.go('/onboarding');
    expect(router.routeInformationProvider.value.uri.path, '/');

    router.dispose();
    container.dispose();
  });
}
