import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/app/router.dart';
import 'package:perbug/core/identity/identity_provider.dart';

void main() {
  test('routes to bootstrap while onboarding state is loading', () {
    final container = ProviderContainer(
      overrides: [
        onboardingCompletedProvider.overrideWith((ref) async {
          await Future<void>.delayed(const Duration(seconds: 1));
          return false;
        }),
      ],
    );

    final router = container.read(routerProvider);
    expect(router.routeInformationProvider.value.uri.path, '/bootstrap');

    router.dispose();
    container.dispose();
  });

  test('routes to onboarding when onboarding is incomplete', () {
    final container = ProviderContainer(
      overrides: [
        onboardingCompletedProvider.overrideWith((ref) async => false),
      ],
    );

    final router = container.read(routerProvider);
    container.read(onboardingGateProvider);
    expect(router.routeInformationProvider.value.uri.path, '/onboarding');

    router.dispose();
    container.dispose();
  });

  test('routes completed onboarding away from onboarding pages to home', () {
    final container = ProviderContainer(
      overrides: [
        onboardingCompletedProvider.overrideWith((ref) async => true),
      ],
    );

    final router = container.read(routerProvider);
    router.go('/onboarding/discovery');
    expect(router.routeInformationProvider.value.uri.path, '/');

    router.dispose();
    container.dispose();
  });
}

